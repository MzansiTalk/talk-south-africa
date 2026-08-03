ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monetization_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monetization_approved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  is_boosted boolean NOT NULL DEFAULT false,
  boost_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'live',
  started_at timestamptz NOT NULL DEFAULT now(),
  scheduled_end_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  ended_at timestamptz,
  recording_url text,
  viewers integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_streams_select" ON public.live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_streams_insert" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "live_streams_update" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "live_streams_delete" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = host_id);
CREATE TRIGGER live_streams_touch BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.live_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.live_comments TO authenticated;
GRANT ALL ON public.live_comments TO service_role;
ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_comments_select" ON public.live_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_comments_insert" ON public.live_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_comments_delete" ON public.live_comments FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.live_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.live_likes TO authenticated;
GRANT ALL ON public.live_likes TO service_role;
ALTER TABLE public.live_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_likes_select" ON public.live_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_likes_insert" ON public.live_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_likes_delete" ON public.live_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.live_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_join_requests TO authenticated;
GRANT ALL ON public.live_join_requests TO service_role;
ALTER TABLE public.live_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_join_select" ON public.live_join_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_join_insert" ON public.live_join_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_join_update" ON public.live_join_requests FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
) WITH CHECK (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
);
CREATE POLICY "live_join_delete" ON public.live_join_requests FOR DELETE TO authenticated USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.live_streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
);
CREATE TRIGGER live_join_touch BEFORE UPDATE ON public.live_join_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;

-- Owner-only monetization approval.
CREATE OR REPLACE FUNCTION public.owner_set_monetization(_user_id uuid, _approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied. Owner Only.';
  END IF;
  UPDATE public.profiles
     SET monetization_approved = _approved,
         monetization_approved_at = CASE WHEN _approved THEN now() ELSE NULL END
   WHERE id = _user_id;
  INSERT INTO public.notifications (user_id, actor_id, kind, message)
  VALUES (_user_id, auth.uid(), 'monetization',
    CASE WHEN _approved
      THEN 'You are approved for content monetization. Your earnings now show in your Dashboard.'
      ELSE 'Your content monetization approval was removed.' END);
  INSERT INTO public.moderation_log (actor_id, action, target_user_id, notes)
  VALUES (auth.uid(), CASE WHEN _approved THEN 'monetization_on' ELSE 'monetization_off' END, _user_id, 'Monetization approval');
END;
$$;

-- A member's own 20% share only. Never exposes platform totals.
CREATE OR REPLACE FUNCTION public.my_earnings()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid,
           COALESCE((SELECT monetization_approved FROM public.profiles WHERE id = auth.uid()), false) AS approved
  ), ads AS (
    SELECT COALESCE(sum(revenue), 0) AS revenue,
           count(*) AS impressions,
           count(*) FILTER (WHERE clicked) AS clicks
      FROM public.ad_impressions WHERE content_owner_id = (SELECT uid FROM me)
  ), gifts AS (
    SELECT COALESCE(sum(b.amount), 0) AS amount
      FROM public.boosts b
      JOIN public.posts p ON p.id = b.post_id
     WHERE p.user_id = (SELECT uid FROM me)
  ), paid AS (
    SELECT COALESCE(sum(creator_share), 0) AS amount
      FROM public.payout_requests
     WHERE user_id = (SELECT uid FROM me) AND status = 'paid'
  )
  SELECT jsonb_build_object(
    'approved', (SELECT approved FROM me),
    'impressions', (SELECT impressions FROM ads),
    'clicks', (SELECT clicks FROM ads),
    'ad_share', CASE WHEN (SELECT approved FROM me) THEN round((SELECT revenue FROM ads) * 0.2, 2) ELSE 0 END,
    'boost_share', CASE WHEN (SELECT approved FROM me) THEN round((SELECT amount FROM gifts) * 0.2, 2) ELSE 0 END,
    'total', CASE WHEN (SELECT approved FROM me)
      THEN round(((SELECT revenue FROM ads) + (SELECT amount FROM gifts)) * 0.2, 2) ELSE 0 END,
    'paid_out', (SELECT amount FROM paid)
  );
$$;

-- Hourly cleanup: expired statuses and saved lives older than 60 days.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'mzansitalk-expire-content',
  '0 * * * *',
  $$ DELETE FROM public.posts WHERE expires_at IS NOT NULL AND expires_at < now(); $$
);