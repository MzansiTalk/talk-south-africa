ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.is_active_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner','admin')
      AND approved = true
  );
$$;