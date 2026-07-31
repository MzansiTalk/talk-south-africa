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
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;