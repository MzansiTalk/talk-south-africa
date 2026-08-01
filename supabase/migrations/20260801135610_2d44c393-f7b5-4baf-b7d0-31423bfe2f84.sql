ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS admob_rewarded_interstitial_id text;

UPDATE public.app_settings SET
  admob_app_id = 'ca-app-pub-1349489304852677~8992145141',
  admob_banner_id = 'ca-app-pub-1349489304852677/7913053105',
  admob_interstitial_id = 'ca-app-pub-1349489304852677/8225858382',
  admob_rewarded_interstitial_id = 'ca-app-pub-1349489304852677/6407032763',
  admob_rewarded_id = 'ca-app-pub-1349489304852677/9207501634',
  admob_native_id = 'ca-app-pub-1349489304852677/7913053105',
  admob_status_id = 'ca-app-pub-1349489304852677/8225858382',
  admob_test_mode = false,
  test_mode = false,
  live_mode = true
WHERE id = 'default';

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
    'admob_rewarded_interstitial_id', admob_rewarded_interstitial_id,
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