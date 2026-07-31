-- ============ CHAT + PRESENCE ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;

CREATE TABLE public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reads TO authenticated;
GRANT ALL ON public.message_reads TO service_role;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read conversation receipts" ON public.message_reads
  FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Members write own receipt" ON public.message_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));
CREATE POLICY "Members update own receipt" ON public.message_reads
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER touch_message_reads BEFORE UPDATE ON public.message_reads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.touch_presence()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.increment_post_view(_post_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.posts SET views = views + 1 WHERE id = _post_id;
$$;

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_active_staff(auth.uid()));
CREATE POLICY "Record own referral" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (referred_id = auth.uid() AND referrer_id <> auth.uid());

-- ============ CREATOR PROGRAM ============
CREATE TABLE public.creator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  id_number text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.creator_applications TO authenticated;
GRANT ALL ON public.creator_applications TO service_role;
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own or staff sees all applications" ON public.creator_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_active_staff(auth.uid()));
CREATE POLICY "Apply for yourself" ON public.creator_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own application" ON public.creator_applications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner decides applications" ON public.creator_applications
  FOR UPDATE TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
CREATE TRIGGER touch_creator_applications BEFORE UPDATE ON public.creator_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PAYOUTS ============
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  creator_share numeric NOT NULL DEFAULT 0,
  platform_share numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'requested',
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own or staff sees payouts" ON public.payout_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_active_staff(auth.uid()));
CREATE POLICY "Request own payout" ON public.payout_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE TRIGGER touch_payout_requests BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.owner_set_payout_status(_payout_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid; amt numeric;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied. Owner Only.';
  END IF;
  IF _status NOT IN ('requested','approved','paid','rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.payout_requests
     SET status = _status,
         approved_at = CASE WHEN _status IN ('approved','paid') THEN COALESCE(approved_at, now()) ELSE approved_at END,
         paid_at = CASE WHEN _status = 'paid' THEN now() ELSE paid_at END
   WHERE id = _payout_id
   RETURNING user_id, creator_share INTO target, amt;

  IF target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, kind, message)
    VALUES (
      target, auth.uid(), 'payout',
      CASE
        WHEN _status = 'paid' THEN 'Your payout of R' || round(amt, 2)::text || ' has been paid.'
        WHEN _status = 'approved' THEN 'Your payout of R' || round(amt, 2)::text || ' was approved.'
        WHEN _status = 'rejected' THEN 'Your payout request was rejected.'
        ELSE 'Your payout request was updated.'
      END
    );
  END IF;

  INSERT INTO public.moderation_log (actor_id, action, target_user_id, notes)
  VALUES (auth.uid(), 'payout_' || _status, target, 'Payout dashboard');
END;
$$;

CREATE OR REPLACE FUNCTION public.owner_set_creator_status(_application_id uuid, _status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied. Owner Only.';
  END IF;
  IF _status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  UPDATE public.creator_applications
     SET status = _status, decided_by = auth.uid(), decided_at = now()
   WHERE id = _application_id
   RETURNING user_id INTO target;
  IF target IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, kind, message)
    VALUES (target, auth.uid(), 'creator',
      CASE WHEN _status = 'approved' THEN 'You are now in the MzansiTalk Creator Program.'
           WHEN _status = 'rejected' THEN 'Your Creator Program application was not approved.'
           ELSE 'Your Creator Program application was updated.' END);
  END IF;
END;
$$;