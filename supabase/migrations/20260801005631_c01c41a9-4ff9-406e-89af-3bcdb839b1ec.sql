-- 1) No guest access to any data or function in the app
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;

-- Trigger-only functions must not be callable by app users either
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_owner_role() FROM authenticated;

-- Signed-in members keep access to the functions the app actually calls
GRANT EXECUTE ON FUNCTION public.ad_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_pricing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.payments_ready() TO authenticated;
GRANT EXECUTE ON FUNCTION public.paystack_public_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_strike(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_copyright(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_moderation(text, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_viral(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_set_ban(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_set_creator_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_set_payout_status(uuid, text) TO authenticated;

-- 2) Roles can never be written from the client
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 3) Payment secrets leave the database for good
ALTER TABLE public.app_settings DROP COLUMN IF EXISTS paystack_secret_key;
ALTER TABLE public.app_settings DROP COLUMN IF EXISTS paystack_webhook_secret;

CREATE OR REPLACE FUNCTION public.public_pricing()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'price_per_1000_impressions', price_per_1000_impressions,
    'price_sponsored_7_days', price_sponsored_7_days,
    'price_sponsored_30_days', price_sponsored_30_days,
    'price_boost_post', price_boost_post,
    'price_boost_7_days', price_boost_7_days,
    'paystack_public_key', nullif(trim(paystack_public_key), ''),
    'paystack_test_mode', paystack_test_mode
  )
  FROM public.app_settings WHERE id = 'default';
$function$;

-- 4) Sponsored orders must come from a signed-in member, for themselves, as pending
DROP POLICY IF EXISTS "Anyone can submit a sponsored order" ON public.sponsored_orders;
CREATE POLICY "Members submit their own sponsored order"
ON public.sponsored_orders FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'pending'
  AND amount > 0
  AND amount <= 1000000
  AND days > 0
  AND days <= 365
);

-- 5) Blocked members no longer see each other's follows / likes
DROP POLICY IF EXISTS "Logged in users can view follows" ON public.follows;
CREATE POLICY "Members view follows except blocked pairs"
ON public.follows FOR SELECT TO authenticated
USING (
  NOT public.is_blocked_pair(auth.uid(), follower_id)
  AND NOT public.is_blocked_pair(auth.uid(), following_id)
);

DROP POLICY IF EXISTS "Logged in users view likes" ON public.likes;
CREATE POLICY "Members view likes except blocked pairs"
ON public.likes FOR SELECT TO authenticated
USING (NOT public.is_blocked_pair(auth.uid(), user_id));
