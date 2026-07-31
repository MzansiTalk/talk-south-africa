CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_email text;
BEGIN
  IF OLD.role = 'owner' THEN
    SELECT lower(email) INTO target_email FROM auth.users WHERE id = OLD.user_id;
    IF target_email = 'reubensiwele646@gmail.com' THEN
      RAISE EXCEPTION 'The Owner account cannot be modified or removed';
    END IF;
  END IF;
  RETURN OLD;
END;
$function$;

DELETE FROM public.user_roles
WHERE role IN ('owner','admin')
  AND user_id IN (
    SELECT id FROM auth.users WHERE lower(email) <> 'reubensiwele646@gmail.com'
  )
  AND user_id NOT IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin' AND approved IS NOT NULL AND user_id IN (
      SELECT id FROM auth.users WHERE lower(email) = 'admin@email.com'
    )
  );