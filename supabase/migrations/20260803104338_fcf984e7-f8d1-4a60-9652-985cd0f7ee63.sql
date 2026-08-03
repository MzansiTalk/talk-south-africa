CREATE TABLE public.iap_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  purchase_token text,
  order_id text,
  platform text NOT NULL DEFAULT 'google_play',
  state text NOT NULL DEFAULT 'purchased',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  validated boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX iap_purchases_token_key ON public.iap_purchases (purchase_token) WHERE purchase_token IS NOT NULL;

GRANT SELECT, INSERT ON public.iap_purchases TO authenticated;
GRANT ALL ON public.iap_purchases TO service_role;
ALTER TABLE public.iap_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see their own purchases" ON public.iap_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_active_staff(auth.uid()));
CREATE POLICY "Members record their own purchases" ON public.iap_purchases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_entitlements (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL DEFAULT 0,
  boost_active boolean NOT NULL DEFAULT false,
  boost_expires_at timestamp with time zone,
  premium_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see their own entitlements" ON public.user_entitlements
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_active_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.grant_iap_entitlement(_product_id text, _purchase_token text, _order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount numeric := 0;
  _row public.user_entitlements;
  _fresh boolean := true;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _product_id NOT IN ('boost_live_r50', 'coins_100', 'premium_monthly_r29') THEN
    RAISE EXCEPTION 'Unknown product';
  END IF;

  _amount := CASE _product_id WHEN 'boost_live_r50' THEN 50 ELSE 29 END;

  IF _purchase_token IS NOT NULL THEN
    SELECT false INTO _fresh FROM public.iap_purchases WHERE purchase_token = _purchase_token LIMIT 1;
    _fresh := COALESCE(_fresh, true);
  END IF;

  INSERT INTO public.iap_purchases (user_id, product_id, purchase_token, order_id, amount, validated)
  VALUES (_uid, _product_id, _purchase_token, _order_id, _amount, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_entitlements (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  IF _fresh THEN
    IF _product_id = 'boost_live_r50' THEN
      UPDATE public.user_entitlements
        SET boost_active = true, boost_expires_at = now() + interval '24 hours', updated_at = now()
        WHERE user_id = _uid;
    ELSIF _product_id = 'coins_100' THEN
      UPDATE public.user_entitlements
        SET coins = coins + 100, updated_at = now()
        WHERE user_id = _uid;
    ELSE
      UPDATE public.user_entitlements
        SET premium_until = GREATEST(COALESCE(premium_until, now()), now()) + interval '30 days',
            updated_at = now()
        WHERE user_id = _uid;
    END IF;
  END IF;

  SELECT * INTO _row FROM public.user_entitlements WHERE user_id = _uid;
  RETURN jsonb_build_object(
    'coins', _row.coins,
    'boost_active', _row.boost_active AND COALESCE(_row.boost_expires_at, now()) > now(),
    'boost_expires_at', _row.boost_expires_at,
    'premium_until', _row.premium_until,
    'duplicate', NOT _fresh
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_reward_coins(_coins integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _coins IS NULL OR _coins < 1 OR _coins > 5 THEN
    RAISE EXCEPTION 'Invalid reward';
  END IF;
  INSERT INTO public.user_entitlements (user_id, coins) VALUES (_uid, _coins)
  ON CONFLICT (user_id) DO UPDATE SET coins = public.user_entitlements.coins + _coins, updated_at = now();
  SELECT coins INTO _total FROM public.user_entitlements WHERE user_id = _uid;
  RETURN _total;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_entitlements()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'coins', coins,
      'boost_active', boost_active AND COALESCE(boost_expires_at, now()) > now(),
      'boost_expires_at', boost_expires_at,
      'premium_until', premium_until,
      'premium_active', COALESCE(premium_until, now() - interval '1 day') > now()
    ) FROM public.user_entitlements WHERE user_id = auth.uid()),
    jsonb_build_object('coins', 0, 'boost_active', false, 'boost_expires_at', null, 'premium_until', null, 'premium_active', false)
  );
$$;