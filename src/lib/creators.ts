import { supabase } from "@/integrations/supabase/client";

import { getCurrentUserId, uploadMedia, type Post, type Profile } from "@/lib/api";

// ==================== CREATOR PROGRAM ====================

export const CREATOR_VIEW_TARGET = 90_000;
export const CREATOR_INVITE_TARGET = 60;
export const CREATOR_SHARE = 0.2;
export const PLATFORM_SHARE = 0.8;

export type CreatorApplication = {
  id: string;
  user_id: string;
  full_name: string;
  bank_name: string;
  account_number: string;
  id_number: string;
  phone: string;
  status: string;
  created_at: string;
};

export type PayoutRequest = {
  id: string;
  user_id: string;
  amount: number;
  creator_share: number;
  platform_share: number;
  status: string;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export function referralLink(username: string) {
  return `mzansitalk.app/r/${username}`;
}

/** Total views across a member's videos (reels), used for the progress bar. */
export async function fetchCreatorProgress() {
  const userId = await getCurrentUserId();
  if (!userId) return { views: 0, invites: 0, qualified: false, earnings: 0 };

  const [posts, invites, boosts] = await Promise.all([
    supabase.from("posts").select("views, kind").eq("user_id", userId),
    supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId),
    supabase.from("boosts").select("amount").eq("user_id", userId),
  ]);

  const views = ((posts.data ?? []) as { views: number | null; kind: string }[])
    .filter((row) => row.kind === "reel")
    .reduce((sum, row) => sum + Number(row.views ?? 0), 0);
  const inviteCount = invites.count ?? 0;
  // Earnings pool is R0.02 per video view plus their own boost spend contribution.
  const earnings = views * 0.02 + ((boosts.data ?? []) as { amount: number }[]).length * 0;

  return {
    views,
    invites: inviteCount,
    qualified: views >= CREATOR_VIEW_TARGET && inviteCount >= CREATOR_INVITE_TARGET,
    earnings,
  };
}

export async function fetchMyCreatorApplication(): Promise<CreatorApplication | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("creator_applications")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CreatorApplication | null;
}

export async function submitCreatorApplication(input: {
  full_name: string;
  bank_name: string;
  account_number: string;
  id_number: string;
  phone: string;
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const existing = await fetchMyCreatorApplication();
  if (existing) {
    const { error } = await supabase
      .from("creator_applications")
      .update({ ...input, status: "pending" })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("creator_applications")
    .insert({ ...input, user_id: userId });
  if (error) throw error;
}

export async function fetchCreatorApplications(): Promise<
  (CreatorApplication & { profile: Profile | null })[]
> {
  const { data, error } = await supabase
    .from("creator_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as CreatorApplication[];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const profiles = ids.length
    ? (((await supabase.from("profiles").select("*").in("id", ids)).data ?? []) as Profile[])
    : [];
  return rows.map((row) => ({
    ...row,
    profile: profiles.find((profile) => profile.id === row.user_id) ?? null,
  }));
}

export async function decideCreatorApplication(
  applicationId: string,
  status: "approved" | "rejected",
) {
  const { error } = await supabase.rpc("owner_set_creator_status", {
    _application_id: applicationId,
    _status: status,
  });
  if (error) throw error;
}

// ==================== PAYOUTS ====================

export async function requestPayout(amount: number) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (!(amount > 0)) throw new Error("You have no earnings to pay out yet");
  const application = await fetchMyCreatorApplication();
  if (!application || application.status !== "approved") {
    throw new Error("Your Creator Program application must be approved first");
  }
  const { error } = await supabase.from("payout_requests").insert({
    user_id: userId,
    amount,
    creator_share: Number((amount * CREATOR_SHARE).toFixed(2)),
    platform_share: Number((amount * PLATFORM_SHARE).toFixed(2)),
  });
  if (error) throw error;
}

export async function fetchMyPayouts(): Promise<PayoutRequest[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PayoutRequest[];
}

export async function fetchAllPayouts(): Promise<
  (PayoutRequest & { profile: Profile | null; bank: CreatorApplication | null })[]
> {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as PayoutRequest[];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  if (ids.length === 0) return [];
  const [profiles, applications] = await Promise.all([
    supabase.from("profiles").select("*").in("id", ids),
    supabase.from("creator_applications").select("*").in("user_id", ids),
  ]);
  return rows.map((row) => ({
    ...row,
    profile: ((profiles.data ?? []) as Profile[]).find((p) => p.id === row.user_id) ?? null,
    bank:
      ((applications.data ?? []) as CreatorApplication[]).find((a) => a.user_id === row.user_id) ??
      null,
  }));
}

export async function setPayoutStatus(
  payoutId: string,
  status: "approved" | "paid" | "rejected",
) {
  const { error } = await supabase.rpc("owner_set_payout_status", {
    _payout_id: payoutId,
    _status: status,
  });
  if (error) throw error;
}

// ==================== REFERRALS ====================

const REFERRAL_KEY = "mzansitalk_referrer";

export function rememberReferrer(username: string) {
  try {
    window.localStorage.setItem(REFERRAL_KEY, username);
  } catch {
    /* storage blocked */
  }
}

/** Called right after sign up: links the new member to whoever invited them. */
export async function claimStoredReferral() {
  let username: string | null = null;
  try {
    username = window.localStorage.getItem(REFERRAL_KEY);
  } catch {
    return;
  }
  if (!username) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  const referrerId = (referrer as { id: string } | null)?.id;
  if (!referrerId || referrerId === userId) return;
  await supabase.from("referrals").insert({ referrer_id: referrerId, referred_id: userId });
  try {
    window.localStorage.removeItem(REFERRAL_KEY);
  } catch {
    /* ignore */
  }
}

// ==================== PRESENCE + READ RECEIPTS ====================

export async function touchPresence() {
  await supabase.rpc("touch_presence");
}

export function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

export async function markConversationRead(conversationId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { data } = await supabase
    .from("message_reads")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  const now = new Date().toISOString();
  if (data) {
    await supabase.from("message_reads").update({ last_read_at: now }).eq("id", data.id);
    return;
  }
  await supabase
    .from("message_reads")
    .insert({ conversation_id: conversationId, user_id: userId, last_read_at: now });
}

/** Latest read time of everyone except me — used to draw the "Seen" ticks. */
export async function fetchOthersReadAt(conversationId: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  const { data } = await supabase
    .from("message_reads")
    .select("user_id, last_read_at")
    .eq("conversation_id", conversationId);
  const rows = ((data ?? []) as { user_id: string; last_read_at: string }[]).filter(
    (row) => row.user_id !== userId,
  );
  if (rows.length === 0) return null;
  return rows.map((row) => row.last_read_at).sort((a, b) => b.localeCompare(a))[0] ?? null;
}

// ==================== VIEW COUNTING ====================

const counted = new Set<string>();

export async function countView(post: Pick<Post, "id" | "kind">) {
  if (post.kind !== "reel" || counted.has(post.id)) return;
  counted.add(post.id);
  await supabase.rpc("increment_post_view", { _post_id: post.id });
}

// ==================== GROUP PHOTO ====================

export async function setGroupPhoto(conversationId: string, file: File) {
  const path = await uploadMedia(file);
  const { error } = await supabase
    .from("conversations")
    .update({ photo_url: path })
    .eq("id", conversationId);
  if (error) throw error;
  return path;
}
