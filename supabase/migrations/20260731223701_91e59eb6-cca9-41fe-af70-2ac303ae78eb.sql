ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS paystack_webhook_url text,
  ADD COLUMN IF NOT EXISTS price_per_1000_impressions numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS price_sponsored_7_days numeric NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS price_sponsored_30_days numeric NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS price_boost_post numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS price_boost_7_days numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS admob_test_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS paystack_test_mode boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.sponsored_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_name text NOT NULL,
  brand_email text NOT NULL,
  phone text,
  package text NOT NULL,
  amount numeric NOT NULL,
  days integer NOT NULL DEFAULT 7,
  message text,
  reference text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.sponsored_orders TO authenticated;
GRANT INSERT ON public.sponsored_orders TO anon;
GRANT ALL ON public.sponsored_orders TO service_role;

ALTER TABLE public.sponsored_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a sponsored order"
  ON public.sponsored_orders FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Staff can view sponsored orders"
  ON public.sponsored_orders FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Staff can update sponsored orders"
  ON public.sponsored_orders FOR UPDATE TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE TRIGGER sponsored_orders_touch
  BEFORE UPDATE ON public.sponsored_orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.public_pricing()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.public_pricing() TO anon, authenticated;