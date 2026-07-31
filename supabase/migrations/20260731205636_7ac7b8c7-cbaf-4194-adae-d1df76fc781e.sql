REVOKE EXECUTE ON FUNCTION public.touch_presence() FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_post_view(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owner_set_payout_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owner_set_creator_status(uuid, text) FROM anon;