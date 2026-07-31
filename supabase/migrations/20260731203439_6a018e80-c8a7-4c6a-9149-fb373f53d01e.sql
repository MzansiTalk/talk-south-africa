-- 1. Profile moderation fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS strikes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- 2. Reports inbox
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members create reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Members read own reports, staff read all" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_active_staff(auth.uid()));
CREATE POLICY "Staff review reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.is_active_staff(auth.uid())) WITH CHECK (public.is_active_staff(auth.uid()));

-- 3. Moderation log
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.moderation_log TO authenticated;
GRANT ALL ON public.moderation_log TO service_role;
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read moderation log" ON public.moderation_log FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- 4. Copyright log
CREATE TABLE IF NOT EXISTS public.copyright_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  reason text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'flagged',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.copyright_log TO authenticated;
GRANT ALL ON public.copyright_log TO service_role;
ALTER TABLE public.copyright_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read copyright log" ON public.copyright_log FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- 5. Appeals (owner only review)
CREATE TABLE IF NOT EXISTS public.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  decision_note text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.appeals TO authenticated;
GRANT ALL ON public.appeals TO service_role;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members create own appeal" ON public.appeals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members read own appeal, owner reads all" ON public.appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));
CREATE POLICY "Owner decides appeals" ON public.appeals FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- 6. Staff helpers
CREATE OR REPLACE FUNCTION public.admin_set_viral(_user_id uuid, _on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  UPDATE public.profiles
     SET is_viral = _on,
         viral_since = CASE WHEN _on THEN now() ELSE NULL END
   WHERE id = _user_id;
  UPDATE public.posts SET is_trending = _on WHERE user_id = _user_id;
  INSERT INTO public.moderation_log (actor_id, action, target_user_id, notes)
  VALUES (auth.uid(), CASE WHEN _on THEN 'viral_on' ELSE 'viral_off' END, _user_id, 'Viral user manager');
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_set_ban(_user_id uuid, _banned boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_email text;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied. Owner Only.';
  END IF;
  SELECT lower(email) INTO target_email FROM auth.users WHERE id = _user_id;
  IF target_email = 'reubensiwele646@gmail.com' OR public.is_owner(_user_id) THEN
    RAISE EXCEPTION 'The Owner account cannot be banned';
  END IF;
  UPDATE public.profiles
     SET is_banned = _banned,
         ban_reason = CASE WHEN _banned THEN _reason ELSE NULL END,
         banned_at = CASE WHEN _banned THEN now() ELSE NULL END,
         strikes = CASE WHEN _banned THEN strikes ELSE 0 END
   WHERE id = _user_id;
  INSERT INTO public.moderation_log (actor_id, action, target_user_id, notes)
  VALUES (auth.uid(), CASE WHEN _banned THEN 'ban' ELSE 'unban' END, _user_id, _reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_strike(_user_id uuid, _reason text, _post_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF auth.uid() <> _user_id AND NOT public.is_active_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  IF public.is_owner(_user_id) THEN
    RETURN 0;
  END IF;
  UPDATE public.profiles SET strikes = strikes + 1 WHERE id = _user_id RETURNING strikes INTO new_count;
  INSERT INTO public.moderation_log (actor_id, action, target_user_id, target_post_id, notes)
  VALUES (auth.uid(), 'strike', _user_id, _post_id, _reason);
  IF new_count >= 3 THEN
    UPDATE public.profiles
       SET is_banned = true, ban_reason = '3 strikes: ' || _reason, banned_at = now()
     WHERE id = _user_id;
    INSERT INTO public.moderation_log (actor_id, action, target_user_id, notes)
    VALUES (auth.uid(), 'auto_ban', _user_id, '3 strikes reached');
  END IF;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_copyright(_user_id uuid, _reason text, _detail text DEFAULT NULL, _post_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF auth.uid() <> _user_id AND NOT public.is_active_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  INSERT INTO public.copyright_log (user_id, post_id, reason, detail)
  VALUES (_user_id, _post_id, _reason, _detail);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_moderation(_action text, _target_user_id uuid DEFAULT NULL, _target_post_id uuid DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  INSERT INTO public.moderation_log (actor_id, action, target_user_id, target_post_id, notes)
  VALUES (auth.uid(), _action, _target_user_id, _target_post_id, _notes);
END;
$$;

-- 7. Keep the Owner display name locked
UPDATE public.profiles p
   SET name = 'MzansiTalk Support'
 WHERE public.is_owner(p.id);

-- 8. updated_at triggers for new tables
DROP TRIGGER IF EXISTS touch_reports ON public.reports;
CREATE TRIGGER touch_reports BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();