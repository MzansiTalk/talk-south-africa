-- 1. AI moderation fields on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS ai_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS monetization text NOT NULL DEFAULT 'eligible';

-- 2. Appeals upgrade
ALTER TABLE public.appeals
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ai_score_at_appeal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by text,
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS auto_resolve_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours');

CREATE INDEX IF NOT EXISTS appeals_status_idx ON public.appeals (status, auto_resolve_at);
CREATE INDEX IF NOT EXISTS posts_moderation_idx ON public.posts (moderation_status);

-- 3. Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  appeal_id uuid REFERENCES public.appeals(id) ON DELETE SET NULL,
  ai_score integer NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read audit logs" ON public.audit_logs;
CREATE POLICY "Staff read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- 4. Appeals policies: staff read all, owners read own
DROP POLICY IF EXISTS "Appeals readable by owner or staff" ON public.appeals;
CREATE POLICY "Appeals readable by owner or staff" ON public.appeals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_active_staff(auth.uid()));

-- 5. Decide an appeal (staff only)
CREATE OR REPLACE FUNCTION public.admin_decide_appeal(
  _appeal_id uuid,
  _approve boolean,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _post uuid; _score integer;
BEGIN
  IF NOT public.is_active_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  UPDATE public.appeals
     SET status = CASE WHEN _approve THEN 'approved' ELSE 'removed' END,
         decision_note = _reason,
         decided_by = auth.uid(),
         admin_id = auth.uid(),
         decided_at = now(),
         resolved_at = now(),
         resolved_by = 'admin'
   WHERE id = _appeal_id AND status = 'pending'
   RETURNING post_id, ai_score_at_appeal INTO _post, _score;

  IF _post IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.posts
     SET moderation_status = CASE WHEN _approve THEN 'approved' ELSE 'removed' END,
         monetization = CASE WHEN _approve THEN 'eligible' ELSE 'blocked' END
   WHERE id = _post;

  INSERT INTO public.audit_logs (admin_id, action, post_id, appeal_id, ai_score, reason)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'approve' ELSE 'remove' END, _post, _appeal_id, COALESCE(_score, 0), _reason);
END;
$$;

-- 6. Auto-resolve expired appeals by score
CREATE OR REPLACE FUNCTION public.auto_resolve_appeals()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT id, post_id, ai_score_at_appeal
      FROM public.appeals
     WHERE status = 'pending' AND auto_resolve_at <= now()
  LOOP
    UPDATE public.appeals
       SET status = CASE WHEN r.ai_score_at_appeal < 50 THEN 'approved' ELSE 'removed' END,
           resolved_at = now(),
           resolved_by = 'system',
           decision_note = 'Auto-resolved after 24 hours (AI score ' || r.ai_score_at_appeal || '%)'
     WHERE id = r.id;

    IF r.post_id IS NOT NULL THEN
      UPDATE public.posts
         SET moderation_status = CASE WHEN r.ai_score_at_appeal < 50 THEN 'approved' ELSE 'removed' END,
             monetization = CASE WHEN r.ai_score_at_appeal < 50 THEN 'eligible' ELSE 'blocked' END
       WHERE id = r.post_id;
    END IF;

    INSERT INTO public.audit_logs (admin_id, action, post_id, appeal_id, ai_score, reason)
    VALUES (NULL, CASE WHEN r.ai_score_at_appeal < 50 THEN 'approve' ELSE 'remove' END,
            r.post_id, r.id, r.ai_score_at_appeal, 'System auto-resolve at 24h');
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- 7. Apply AI verdict on upload (author only)
CREATE OR REPLACE FUNCTION public.apply_ai_moderation(
  _post_id uuid,
  _score integer,
  _flags text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _owner uuid; _blocked boolean; _appeal uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.posts WHERE id = _post_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Post not found'; END IF;
  IF auth.uid() <> _owner AND NOT public.is_active_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  _blocked := COALESCE(_score, 0) >= 50;

  UPDATE public.posts
     SET ai_score = COALESCE(_score, 0),
         ai_flags = COALESCE(_flags, '{}'),
         moderation_status = CASE WHEN _blocked THEN 'removed' ELSE 'approved' END,
         monetization = CASE WHEN _blocked THEN 'blocked' ELSE 'eligible' END
   WHERE id = _post_id;

  IF _blocked THEN
    INSERT INTO public.appeals (user_id, post_id, message, status, ai_score_at_appeal, auto_resolve_at)
    VALUES (_owner, _post_id, 'Auto-created appeal: content removed by AI moderation.',
            'pending', COALESCE(_score, 0), now() + interval '24 hours')
    RETURNING id INTO _appeal;
  END IF;

  RETURN jsonb_build_object(
    'ai_score', COALESCE(_score, 0),
    'status', CASE WHEN _blocked THEN 'removed' ELSE 'approved' END,
    'monetization', CASE WHEN _blocked THEN 'blocked' ELSE 'eligible' END,
    'appeal_id', _appeal
  );
END;
$$;