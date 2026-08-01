CREATE TABLE public.user_pass_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pass_key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.user_pass_keys TO service_role;

ALTER TABLE public.user_pass_keys ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER touch_user_pass_keys
BEFORE UPDATE ON public.user_pass_keys
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();