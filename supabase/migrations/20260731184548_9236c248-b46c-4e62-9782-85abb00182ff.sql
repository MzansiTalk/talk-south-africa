
-- ============ BOOSTS ============
CREATE TABLE public.boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  days integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  reference text,
  views_gained integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boosts TO authenticated;
GRANT ALL ON public.boosts TO service_role;
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own boosts" ON public.boosts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create their own boosts" ON public.boosts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners and admins update boosts" ON public.boosts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER boosts_touch BEFORE UPDATE ON public.boosts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ AD IMPRESSIONS ============
CREATE TABLE public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  placement text NOT NULL,
  revenue numeric NOT NULL DEFAULT 0.02,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ad_impressions TO authenticated;
GRANT ALL ON public.ad_impressions TO service_role;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read impressions" ON public.ad_impressions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Signed in users log impressions" ON public.ad_impressions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============ CHAT ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  title text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  media_url text,
  media_type text,
  shared_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  );
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view conversations" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(id, auth.uid()));
CREATE POLICY "Users create conversations" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Members update conversations" ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_conversation_member(id, auth.uid()))
  WITH CHECK (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "Members view membership" ON public.conversation_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Members add participants" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_blocked_pair(auth.uid(), user_id)
    AND (
      user_id = auth.uid()
      OR public.is_conversation_member(conversation_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
    )
  );
CREATE POLICY "Users leave conversations" ON public.conversation_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Members read messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Members send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Senders delete own messages" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ SUPPORT INBOX ============
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_staff_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their support thread" ON public.support_messages FOR SELECT TO authenticated
  USING (thread_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users write to support" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (thread_user_id = auth.uid() AND is_staff_reply = false)
      OR (public.has_role(auth.uid(), 'admin') AND is_staff_reply = true)
    )
  );

-- ============ OWNER-ONLY PAYMENT SETTINGS ============
CREATE TABLE public.app_settings (
  id text PRIMARY KEY DEFAULT 'default',
  admob_app_id text,
  admob_banner_id text,
  admob_interstitial_id text,
  admob_native_id text,
  admob_status_id text,
  admob_payment_email text DEFAULT 'reubensiwele646@gmail.com',
  paystack_public_key text,
  paystack_secret_key text,
  paystack_webhook_secret text,
  paystack_payout_email text DEFAULT 'reubensiwele646@gmail.com',
  test_mode boolean NOT NULL DEFAULT true,
  live_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));
CREATE POLICY "Owner inserts settings" ON public.app_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owner updates settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.app_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
