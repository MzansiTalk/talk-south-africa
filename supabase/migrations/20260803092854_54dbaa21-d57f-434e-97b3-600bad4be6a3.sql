ALTER TABLE public.app_settings
  DROP COLUMN IF EXISTS admob_app_id,
  DROP COLUMN IF EXISTS admob_banner_id,
  DROP COLUMN IF EXISTS admob_interstitial_id,
  DROP COLUMN IF EXISTS admob_rewarded_id,
  DROP COLUMN IF EXISTS admob_rewarded_interstitial_id,
  DROP COLUMN IF EXISTS admob_native_id,
  DROP COLUMN IF EXISTS admob_status_id,
  DROP COLUMN IF EXISTS admob_payment_email,
  DROP COLUMN IF EXISTS admob_test_mode;

CREATE OR REPLACE FUNCTION public.ad_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'meta_app_id', meta_app_id,
    'meta_banner_placement_id', meta_banner_placement_id,
    'meta_interstitial_placement_id', meta_interstitial_placement_id,
    'meta_rewarded_placement_id', meta_rewarded_placement_id,
    'ads_banner_enabled', ads_banner_enabled,
    'ads_interstitial_enabled', ads_interstitial_enabled,
    'ads_rewarded_enabled', ads_rewarded_enabled,
    'ads_native_enabled', ads_native_enabled,
    'test_mode', test_mode,
    'live_mode', live_mode
  )
  FROM public.app_settings WHERE id = 'default';
$$;

CREATE TABLE IF NOT EXISTS public.ad_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  placement text NOT NULL,
  network text NOT NULL DEFAULT 'meta',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ad_reports TO authenticated;
GRANT ALL ON public.ad_reports TO service_role;

ALTER TABLE public.ad_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can report an ad"
ON public.ad_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Members see their own ad reports"
ON public.ad_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));