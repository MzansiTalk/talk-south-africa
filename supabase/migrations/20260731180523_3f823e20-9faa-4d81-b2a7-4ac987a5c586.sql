REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_owner_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;