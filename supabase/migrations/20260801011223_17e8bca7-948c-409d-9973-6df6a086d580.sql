CREATE OR REPLACE FUNCTION public.guard_profile_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_active_staff(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.is_banned := OLD.is_banned;
  NEW.ban_reason := OLD.ban_reason;
  NEW.banned_at := OLD.banned_at;
  NEW.strikes := OLD.strikes;
  NEW.is_viral := OLD.is_viral;
  NEW.viral_since := OLD.viral_since;
  NEW.is_hidden := OLD.is_hidden;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_profile_moderation_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_moderation_fields ON public.profiles;
CREATE TRIGGER guard_profile_moderation_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_moderation_fields();