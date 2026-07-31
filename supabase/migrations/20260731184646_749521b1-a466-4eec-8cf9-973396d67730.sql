
CREATE OR REPLACE FUNCTION public.payments_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT nullif(trim(paystack_public_key), '') IS NOT NULL FROM public.app_settings WHERE id = 'default'), false);
$$;

CREATE OR REPLACE FUNCTION public.paystack_public_key()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nullif(trim(paystack_public_key), '') FROM public.app_settings WHERE id = 'default';
$$;

REVOKE ALL ON FUNCTION public.payments_ready() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.paystack_public_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payments_ready() TO authenticated;
GRANT EXECUTE ON FUNCTION public.paystack_public_key() TO authenticated;
