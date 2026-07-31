CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
  owner_exists boolean;
  is_owner_acct boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') INTO owner_exists;
  is_owner_acct := (lower(NEW.email) = 'reubensiwele646@gmail.com') OR (NOT owner_exists);

  IF is_owner_acct THEN
    base_username := 'mzansitalk';
  ELSE
    base_username := regexp_replace(lower(coalesce(split_part(NEW.email,'@',1),'user')), '[^a-z0-9_]', '', 'g');
    IF base_username = '' THEN base_username := 'user'; END IF;
  END IF;

  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  IF is_owner_acct THEN
    INSERT INTO public.profiles (id, name, username, is_hidden, bio)
    VALUES (NEW.id, 'MzansiTalk Support', final_username, true, 'Official MzansiTalk account')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, name, username)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'name', base_username), final_username)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;