ALTER TABLE public.ad_impressions
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_kind text;

CREATE INDEX IF NOT EXISTS ad_impressions_content_owner_idx ON public.ad_impressions(content_owner_id);

CREATE OR REPLACE FUNCTION public.log_ad_impression(
  _placement text,
  _network text DEFAULT 'admob',
  _post_id uuid DEFAULT NULL,
  _content_kind text DEFAULT NULL,
  _content_owner_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  INSERT INTO public.ad_impressions (user_id, placement, network, revenue, post_id, content_kind, content_owner_id)
  VALUES (auth.uid(), _placement, coalesce(_network, 'admob'), 0.05, _post_id, _content_kind, _content_owner_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ad_click(_impression_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  UPDATE public.ad_impressions
     SET clicked = true,
         revenue = revenue + 0.50
   WHERE id = _impression_id
     AND user_id = auth.uid()
     AND clicked = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.creator_ad_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ads AS (
    SELECT coalesce(nullif(content_kind, ''), 'post') AS kind,
           count(*) AS impressions,
           count(*) FILTER (WHERE clicked) AS clicks,
           coalesce(sum(revenue), 0) AS revenue
      FROM public.ad_impressions
     WHERE content_owner_id = auth.uid()
     GROUP BY 1
  ), views AS (
    SELECT kind::text AS kind, coalesce(sum(views), 0) AS views
      FROM public.posts
     WHERE user_id = auth.uid()
     GROUP BY 1
  ), kinds AS (
    SELECT unnest(ARRAY['reel','video','status','post']) AS kind
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'views', (SELECT coalesce(sum(views), 0) FROM views),
      'impressions', (SELECT coalesce(sum(impressions), 0) FROM ads),
      'clicks', (SELECT coalesce(sum(clicks), 0) FROM ads),
      'revenue', (SELECT coalesce(sum(revenue), 0) FROM ads),
      'creator_earnings', (SELECT coalesce(sum(revenue), 0) * 0.2 FROM ads)
    ),
    'breakdown', (
      SELECT jsonb_agg(jsonb_build_object(
        'kind', k.kind,
        'views', coalesce(v.views, 0),
        'impressions', coalesce(a.impressions, 0),
        'clicks', coalesce(a.clicks, 0),
        'revenue', coalesce(a.revenue, 0),
        'creator_earnings', coalesce(a.revenue, 0) * 0.2
      ) ORDER BY k.kind)
      FROM kinds k
      LEFT JOIN ads a ON a.kind = k.kind
      LEFT JOIN views v ON v.kind = k.kind
    )
  );
$$;

REVOKE ALL ON FUNCTION public.log_ad_impression(text, text, uuid, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_ad_click(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.creator_ad_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_ad_impression(text, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_ad_click(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creator_ad_stats() TO authenticated;