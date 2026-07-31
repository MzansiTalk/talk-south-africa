ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS admob_rewarded_id text,
  ADD COLUMN IF NOT EXISTS meta_app_id text,
  ADD COLUMN IF NOT EXISTS meta_banner_placement_id text,
  ADD COLUMN IF NOT EXISTS meta_interstitial_placement_id text,
  ADD COLUMN IF NOT EXISTS meta_rewarded_placement_id text,
  ADD COLUMN IF NOT EXISTS ads_banner_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ads_interstitial_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ads_rewarded_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ads_native_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.ad_impressions
  ADD COLUMN IF NOT EXISTS network text NOT NULL DEFAULT 'admob',
  ADD COLUMN IF NOT EXISTS clicked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ad_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'admob_app_id', admob_app_id,
    'admob_banner_id', admob_banner_id,
    'admob_interstitial_id', admob_interstitial_id,
    'admob_rewarded_id', admob_rewarded_id,
    'admob_native_id', admob_native_id,
    'admob_status_id', admob_status_id,
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