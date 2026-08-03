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
  _token text := NULLIF(_purchase_token, '');
  _order text := NULLIF(_order_id, '');
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _product_id NOT IN ('boost_live_r50', 'coins_100', 'premium_monthly_r29') THEN
    RAISE EXCEPTION 'Unknown product';
  END IF;

  _amount := CASE _product_id WHEN 'boost_live_r50' THEN 50 ELSE 29 END;

  IF _token IS NOT NULL THEN
    SELECT false INTO _fresh FROM public.iap_purchases WHERE purchase_token = _token LIMIT 1;
    _fresh := COALESCE(_fresh, true);
  END IF;

  INSERT INTO public.iap_purchases (user_id, product_id, purchase_token, order_id, amount, validated)
  VALUES (_uid, _product_id, _token, _order, _amount, true)
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
    'premium_active', COALESCE(_row.premium_until, now() - interval '1 day') > now(),
    'duplicate', NOT _fresh
  );
END;
$$;