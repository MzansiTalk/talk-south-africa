import { supabase } from "@/integrations/supabase/client";

export type ContentKind = "post" | "reel" | "status";

export type Profile = {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_viral: boolean;
  is_hidden: boolean;
  strikes?: number;
  is_banned?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  created_at: string;
};


export type Post = {
  id: string;
  user_id: string;
  kind: ContentKind;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  is_trending: boolean;
  boost_amount: number;
  boost_expires_at: string | null;
  expires_at: string | null;
  deleted_by_admin?: boolean;
  ai_score?: number;
  ai_flags?: string[];
  moderation_status?: "pending" | "approved" | "removed";
  monetization?: "eligible" | "blocked";
  views?: number;

  created_at: string;

  profiles?: Profile | null;
};

export type FeedItem = Post & {
  author: Profile | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

export const OWNER_DISPLAY_NAME = "MzansiTalk Support";

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchMyRoles(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, approved")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? [])
    .filter((row) => (row as { approved?: boolean }).approved !== false)
    .map((row) => row.role as string);
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function fetchFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

/** Viral users get 5x priority; boost amount raises priority further. */
function feedScore(item: Post, author: Profile | null): number {
  const ageHours = (Date.now() - new Date(item.created_at).getTime()) / 3_600_000;
  const boostActive = item.boost_expires_at ? new Date(item.boost_expires_at) > new Date() : false;
  let score = 1000 - ageHours;
  if (author?.is_viral) score *= 5;
  if (boostActive) score += Math.min(Number(item.boost_amount) || 0, 1000);
  return score;
}

async function hydrate(rows: Post[]): Promise<FeedItem[]> {
  if (rows.length === 0) return [];
  const userId = await getCurrentUserId();
  const authorIds = [...new Set(rows.map((row) => row.user_id))];
  const postIds = rows.map((row) => row.id);

  const [profilesRes, likesRes, commentsRes, myLikesRes, mySavesRes] = await Promise.all([
    supabase.from("profiles").select("*").in("id", authorIds),
    supabase.from("likes").select("post_id").in("post_id", postIds),
    supabase.from("comments").select("post_id").in("post_id", postIds),
    userId
      ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", userId)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    userId
      ? supabase.from("saves").select("post_id").in("post_id", postIds).eq("user_id", userId)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const profiles = new Map<string, Profile>(
    ((profilesRes.data ?? []) as Profile[]).map((profile) => [profile.id, profile]),
  );
  const countOf = (list: { post_id: string }[] | null, id: string) =>
    (list ?? []).filter((row) => row.post_id === id).length;
  const myLikes = new Set((myLikesRes.data ?? []).map((row) => row.post_id));
  const mySaves = new Set((mySavesRes.data ?? []).map((row) => row.post_id));

  return rows
    .map((row) => {
      const author = profiles.get(row.user_id) ?? null;
      return {
        ...row,
        author,
        likeCount: countOf(likesRes.data, row.id),
        commentCount: countOf(commentsRes.data, row.id),
        likedByMe: myLikes.has(row.id),
        savedByMe: mySaves.has(row.id),
      };
    })
    .sort((a, b) => feedScore(b, b.author) - feedScore(a, a.author));
}

export async function fetchFeed(kind?: ContentKind): Promise<FeedItem[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(60);
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error) throw error;
  return hydrate((data ?? []) as Post[]);
}

export async function fetchUserContent(userId: string, kind?: ContentKind): Promise<FeedItem[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error) throw error;
  return hydrate((data ?? []) as Post[]);
}

export async function fetchSaved(): Promise<FeedItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase.from("saves").select("post_id").eq("user_id", userId);
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.post_id);
  if (ids.length === 0) return [];
  const posts = await supabase.from("posts").select("*").in("id", ids);
  if (posts.error) throw posts.error;
  return hydrate((posts.data ?? []) as Post[]);
}

export async function toggleLike(postId: string, liked: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (liked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: userId });
  if (error) throw error;
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();
  const ownerId = (post as { user_id: string } | null)?.user_id;
  if (ownerId) {
    await notify({ userId: ownerId, kind: "like", message: "liked your post", postId });
  }
}


export async function toggleSave(postId: string, saved: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (saved) {
    const { error } = await supabase
      .from("saves")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("saves").insert({ post_id: postId, user_id: userId });
  if (error) throw error;
}

export async function deletePost(postId: string, ownerId: string) {
  const userId = await getCurrentUserId();
  const roles = await fetchMyRoles();
  const isAdmin = roles.includes("admin") || roles.includes("owner");
  if (userId !== ownerId && !isAdmin) throw new Error("You do not have permission");
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
  return isAdmin && userId !== ownerId;
}

export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const authorIds = [...new Set(rows.map((row) => row.user_id))];
  const profiles = authorIds.length
    ? ((await supabase.from("profiles").select("*").in("id", authorIds)).data as Profile[])
    : [];
  return rows.map((row) => ({
    ...row,
    author: profiles.find((profile) => profile.id === row.user_id) ?? null,
  }));
}

export async function addComment(postId: string, body: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: userId, body });
  if (error) throw error;
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();
  const ownerId = (post as { user_id: string } | null)?.user_id;
  if (ownerId) {
    await notify({ userId: ownerId, kind: "comment", message: "commented on your post", postId });
  }
}


export async function isFollowing(targetId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", userId)
    .eq("following_id", targetId)
    .maybeSingle();
  return Boolean(data);
}

export async function setFollow(targetId: string, follow: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (follow) {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: userId, following_id: targetId });
    if (error) throw error;
    await notify({ userId: targetId, kind: "follow", message: "started following you" });

    return;
  }
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", targetId);
  if (error) throw error;
}

export async function fetchBlockedUsers(): Promise<Profile[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
  const ids = (data ?? []).map((row) => row.blocked_id);
  if (ids.length === 0) return [];
  const profiles = await supabase.from("profiles").select("*").in("id", ids);
  return (profiles.data ?? []) as Profile[];
}

export async function setBlock(targetId: string, block: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (block) {
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: userId, blocked_id: targetId });
    if (error) throw error;
    await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
    await supabase.from("follows").delete().eq("follower_id", targetId).eq("following_id", userId);
    return;
  }
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", targetId);
  if (error) throw error;
}

export async function search(term: string) {
  const like = `%${term}%`;
  const [people, content] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .or(`name.ilike.${like},username.ilike.${like}`)
      .eq("is_hidden", false)
      .limit(20),
    supabase.from("posts").select("*").ilike("caption", like).limit(30),
  ]);
  return {
    people: (people.data ?? []) as Profile[],
    content: await hydrate((content.data ?? []) as Post[]),
  };
}

export async function uploadMedia(file: File): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function createContent(input: {
  kind: ContentKind;
  caption: string;
  file: File | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");

  const { addStrike, logCopyright, scanContent } = await import("@/lib/moderation");

  const me = await fetchMyProfile();
  if (me?.is_banned) {
    throw new Error("Your account is banned. You can appeal from Settings.");
  }

  // Auto-Mod: every post/reel/status is scanned before publishing.
  const scan = scanContent({ caption: input.caption, file: input.file });
  if (!scan.allowed) {
    if (scan.category === "copyright") {
      await logCopyright({ userId, reason: "Copyright music or content", detail: scan.reason });
    }
    const strikes = await addStrike(userId, scan.reason);
    if (strikes < 1) throw new Error(`${scan.reason}. This content was not published.`);
    throw new Error(
      strikes >= 3
        ? `${scan.reason}. That is 3 strikes — your account has been banned. You can appeal from Settings.`
        : `${scan.reason}. Strike ${strikes} of 3.`,
    );
  }

  let mediaPath: string | null = null;
  let mediaType: string | null = null;
  if (input.file) {
    mediaPath = await uploadMedia(input.file);
    mediaType = input.file.type.startsWith("video") ? "video" : "image";
  }
  const expiresAt =
    input.kind === "status" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
  const { data: created, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      kind: input.kind,
      caption: input.caption || null,
      media_url: mediaPath,
      media_type: mediaType,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error) throw error;

  // AI moderation (Google Cloud Vision / Video Intelligence) on every media upload.
  if (created?.id && mediaPath && mediaType) {
    const url = await signedUrl(mediaPath);
    if (url) {
      const { moderateUpload } = await import("@/lib/ai-moderation.functions");
      const verdict = await moderateUpload({
        data: { postId: created.id, mediaUrl: url, mediaType: mediaType as "image" | "video" },
      });
      if (verdict.status === "removed") {
        throw new Error(
          `AI moderation flagged this upload (risk ${verdict.aiScore}%). It was removed and an appeal was opened — you have 24 hours for a review.`,
        );
      }
    }
  }
}

export async function updateMyProfile(patch: Partial<Profile>) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const roles = await fetchMyRoles();
  // The Owner is always shown as "MzansiTalk Support".
  if (roles.includes("owner")) patch = { ...patch, name: OWNER_DISPLAY_NAME };
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

/** Sends an in-app notification (and a push when the browser allows it). */
export async function notify(input: {
  userId: string;
  kind: string;
  message: string;
  postId?: string | null;
}) {
  const actorId = await getCurrentUserId();
  if (!actorId || actorId === input.userId) return;
  const { data: target } = await supabase
    .from("profiles")
    .select("notifications_enabled")
    .eq("id", input.userId)
    .maybeSingle();
  if ((target as { notifications_enabled?: boolean } | null)?.notifications_enabled === false) return;
  await supabase.from("notifications").insert({
    user_id: input.userId,
    actor_id: actorId,
    kind: input.kind,
    message: input.message,
    post_id: input.postId ?? null,
  });
}

/** Browser push permission, used by the Settings notification toggle. */
export async function enablePushNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function pushNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body });
}

export async function fetchNotificationsEnabled(): Promise<boolean> {
  const profile = await fetchMyProfile();
  return (profile as (Profile & { notifications_enabled?: boolean }) | null)
    ?.notifications_enabled !== false;
}

export async function setNotificationsEnabled(enabled: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase
    .from("profiles")
    .update({ notifications_enabled: enabled })
    .eq("id", userId);
  if (error) throw error;
  if (enabled) await enablePushNotifications();
}

export type NotificationRow = {
  id: string;
  kind: string;
  message: string;
  post_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: Profile | null;
};

export async function fetchNotifications(): Promise<NotificationRow[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter(Boolean))] as string[];
  const actors = new Map<string, Profile>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("*").in("id", actorIds);
    for (const profile of (profiles ?? []) as Profile[]) actors.set(profile.id, profile);
  }
  return rows.map((row) => ({
    ...row,
    actor: row.actor_id ? (actors.get(row.actor_id) ?? null) : null,
  })) as NotificationRow[];
}


export async function fetchUnreadNotificationCount(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}

export async function markNotificationsRead() {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}


// ==================== PHASE 2: BOOSTS ====================

export const OWNER_EMAIL = "reubensiwele646@gmail.com";

export type Boost = {
  id: string;
  user_id: string;
  post_id: string;
  amount: number;
  days: number;
  status: string;
  reference: string | null;
  views_gained: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export const BOOST_PACKAGES = [
  { amount: 20, days: 1, label: "R20 · 1 Day" },
  { amount: 50, days: 3, label: "R50 · 3 Days" },
  { amount: 100, days: 7, label: "R100 · 7 Days" },
] as const;

export const MIN_BOOST = 20;

/** Live calculator used on the Boost screen. */
export function estimateBoost(amount: number, days: number) {
  const safeAmount = Number.isFinite(amount) ? Math.max(amount, 0) : 0;
  return {
    reach: Math.round(safeAmount * 120 * Math.max(days, 1) ** 0.5),
    views: Math.round(safeAmount * 45 * Math.max(days, 1) ** 0.5),
    days: Math.max(days, 1),
  };
}

export async function getMyEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function paymentsReady(): Promise<boolean> {
  const { data, error } = await supabase.rpc("payments_ready");
  if (error) return false;
  return Boolean(data);
}

export async function getPaystackPublicKey(): Promise<string | null> {
  const { data } = await supabase.rpc("paystack_public_key");
  return (data as string | null) ?? null;
}

export async function createBoost(input: { postId: string; amount: number; days: number }) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (input.amount < MIN_BOOST) throw new Error(`Minimum boost is R${MIN_BOOST}`);
  const ends = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("boosts").insert({
    user_id: userId,
    post_id: input.postId,
    amount: input.amount,
    days: input.days,
    ends_at: ends,
    reference: `MT-${Date.now()}`,
  });
  if (error) throw error;
  const { error: postError } = await supabase
    .from("posts")
    .update({ boost_amount: input.amount, boost_expires_at: ends })
    .eq("id", input.postId);
  if (postError) throw postError;
}

export async function fetchMyBoosts(): Promise<(Boost & { post: Post | null })[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("boosts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Boost[];
  const postIds = [...new Set(rows.map((row) => row.post_id))];
  const posts = postIds.length
    ? (((await supabase.from("posts").select("*").in("id", postIds)).data ?? []) as Post[])
    : [];
  return rows.map((row) => ({ ...row, post: posts.find((p) => p.id === row.post_id) ?? null }));
}

export async function fetchAllBoosts(): Promise<
  (Boost & { post: Post | null; author: Profile | null })[]
> {
  const { data, error } = await supabase
    .from("boosts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Boost[];
  const postIds = [...new Set(rows.map((row) => row.post_id))];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const [posts, profiles] = await Promise.all([
    postIds.length
      ? supabase.from("posts").select("*").in("id", postIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("profiles").select("*").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);
  return rows.map((row) => ({
    ...row,
    post: ((posts.data ?? []) as Post[]).find((p) => p.id === row.post_id) ?? null,
    author: ((profiles.data ?? []) as Profile[]).find((p) => p.id === row.user_id) ?? null,
  }));
}

export async function setBoostStatus(boostId: string, status: "active" | "paused" | "refunded") {
  const { data: boost, error: readError } = await supabase
    .from("boosts")
    .select("*")
    .eq("id", boostId)
    .maybeSingle();
  if (readError) throw readError;
  const { error } = await supabase.from("boosts").update({ status }).eq("id", boostId);
  if (error) throw error;
  if (boost && status !== "active") {
    await supabase
      .from("posts")
      .update({ boost_amount: 0, boost_expires_at: null })
      .eq("id", (boost as Boost).post_id);
  }
  if (boost) {
    await notify({
      userId: (boost as Boost).user_id,
      kind: "boost",
      message:
        status === "active"
          ? "Your boost was approved and is now running"
          : status === "paused"
            ? "Your boost was paused by the MzansiTalk team"
            : "Your boost was refunded",
      postId: (boost as Boost).post_id,
    });
  }
}


/** Top 10 spenders for the current week, used by the Home leaderboard. */
export async function fetchTopBoosters(): Promise<
  { profile: Profile | null; total: number; boosts: number }[]
> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("boosts")
    .select("user_id, amount")
    .gte("created_at", weekAgo);
  const rows = (data ?? []) as { user_id: string; amount: number }[];
  const totals = new Map<string, { total: number; boosts: number }>();
  for (const row of rows) {
    const current = totals.get(row.user_id) ?? { total: 0, boosts: 0 };
    totals.set(row.user_id, { total: current.total + Number(row.amount), boosts: current.boosts + 1 });
  }
  const ids = [...totals.keys()];
  if (ids.length === 0) return [];
  const profiles = ((await supabase.from("profiles").select("*").in("id", ids)).data ??
    []) as Profile[];
  return ids
    .map((id) => ({
      profile: profiles.find((p) => p.id === id) ?? null,
      total: totals.get(id)!.total,
      boosts: totals.get(id)!.boosts,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// ==================== ADS ====================

export type AdPlacement = "home_native" | "reel_video" | "reel_banner" | "status_ad";

export async function logAdImpression(placement: AdPlacement) {
  const userId = await getCurrentUserId();
  await supabase.from("ad_impressions").insert({ user_id: userId, placement });
}

export async function fetchAdSettings() {
  const { data } = await supabase.from("app_settings").select("*").eq("id", "default").maybeSingle();
  return data ?? null;
}

export async function fetchAppSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type AppSettings = {
  meta_app_id: string | null;
  meta_banner_placement_id: string | null;
  meta_interstitial_placement_id: string | null;
  meta_rewarded_placement_id: string | null;
  ads_banner_enabled: boolean;
  ads_interstitial_enabled: boolean;
  ads_rewarded_enabled: boolean;
  ads_native_enabled: boolean;
  paystack_public_key: string | null;
  paystack_webhook_url: string | null;
  paystack_payout_email: string | null;
  price_per_1000_impressions: number;
  price_sponsored_7_days: number;
  price_sponsored_30_days: number;
  price_boost_post: number;
  price_boost_7_days: number;
  paystack_test_mode: boolean;

  test_mode: boolean;
  live_mode: boolean;
};


export async function saveAppSettings(patch: Partial<AppSettings>) {
  const { error } = await supabase.from("app_settings").update(patch).eq("id", "default");
  if (error) throw error;
}

export type PublicPricing = {
  price_per_1000_impressions: number;
  price_sponsored_7_days: number;
  price_sponsored_30_days: number;
  price_boost_post: number;
  price_boost_7_days: number;
  paystack_public_key: string | null;
  paystack_test_mode: boolean;
};

export const DEFAULT_PRICING: PublicPricing = {
  price_per_1000_impressions: 50,
  price_sponsored_7_days: 500,
  price_sponsored_30_days: 1500,
  price_boost_post: 20,
  price_boost_7_days: 100,
  paystack_public_key: null,
  paystack_test_mode: true,
};

export async function fetchPublicPricing(): Promise<PublicPricing> {
  const { data, error } = await supabase.rpc("public_pricing");
  if (error || !data) return DEFAULT_PRICING;
  return { ...DEFAULT_PRICING, ...(data as Partial<PublicPricing>) };
}

export type SponsoredOrder = {
  id: string;
  brand_name: string;
  brand_email: string;
  phone: string | null;
  package: string;
  amount: number;
  days: number;
  message: string | null;
  reference: string | null;
  status: string;
  created_at: string;
};

export async function createSponsoredOrder(input: {
  brandName: string;
  brandEmail: string;
  phone?: string;
  package: string;
  amount: number;
  days: number;
  message?: string;
  reference?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Please log in to place an order");
  const { error } = await supabase.from("sponsored_orders").insert({
    user_id: auth.user.id,
    brand_name: input.brandName,
    brand_email: input.brandEmail,
    phone: input.phone ?? null,
    package: input.package,
    amount: input.amount,
    days: input.days,
    message: input.message ?? null,
    reference: input.reference ?? null,
  });
  if (error) throw error;
}

export async function fetchSponsoredOrders(): Promise<SponsoredOrder[]> {
  const { data, error } = await supabase
    .from("sponsored_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as SponsoredOrder[];
}

export async function setSponsoredOrderStatus(id: string, status: string) {
  const { error } = await supabase.from("sponsored_orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function fetchEarnings() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [impressionsMonth, boostsMonth, impressions30, boosts30] = await Promise.all([
    supabase.from("ad_impressions").select("revenue").gte("created_at", monthStart.toISOString()),
    supabase.from("boosts").select("amount").gte("created_at", monthStart.toISOString()),
    supabase
      .from("ad_impressions")
      .select("revenue, created_at")
      .gte("created_at", since30.toISOString()),
    supabase.from("boosts").select("amount, created_at").gte("created_at", since30.toISOString()),
  ]);

  const adRevenue = (impressionsMonth.data ?? []).reduce(
    (sum, row) => sum + Number(row.revenue ?? 0),
    0,
  );
  const boostRevenue = (boostsMonth.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  const days: { day: string; total: number }[] = [];
  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const ads = (impressions30.data ?? [])
      .filter((row) => String(row.created_at).slice(0, 10) === key)
      .reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
    const boosted = (boosts30.data ?? [])
      .filter((row) => String(row.created_at).slice(0, 10) === key)
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    days.push({ day: key, total: ads + boosted });
  }

  return {
    adRevenue,
    boostRevenue,
    impressions: (impressionsMonth.data ?? []).length,
    days,
  };
}

// ==================== CHAT ====================

export type Conversation = {
  id: string;
  is_group: boolean;
  title: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};


export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  shared_post_id: string | null;
  created_at: string;
};

export async function fetchConversations(): Promise<
  (Conversation & { members: Profile[]; lastMessage: Message | null })[]
> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data: memberships, error } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  if (error) throw error;
  const ids = (memberships ?? []).map((row) => row.conversation_id);
  if (ids.length === 0) return [];

  const [conversations, members, messages] = await Promise.all([
    supabase.from("conversations").select("*").in("id", ids),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const memberIds = [...new Set((members.data ?? []).map((row) => row.user_id))];
  const profiles = memberIds.length
    ? (((await supabase.from("profiles").select("*").in("id", memberIds)).data ?? []) as Profile[])
    : [];

  return ((conversations.data ?? []) as Conversation[])
    .map((conversation) => ({
      ...conversation,
      members: (members.data ?? [])
        .filter((row) => row.conversation_id === conversation.id)
        .map((row) => profiles.find((p) => p.id === row.user_id))
        .filter((value): value is Profile => Boolean(value)),
      lastMessage:
        ((messages.data ?? []) as Message[]).find(
          (message) => message.conversation_id === conversation.id,
        ) ?? null,
    }))
    .sort((a, b) => {
      const left = a.lastMessage?.created_at ?? a.created_at;
      const right = b.lastMessage?.created_at ?? b.created_at;
      return right.localeCompare(left);
    });
}

export async function fetchConversation(conversationId: string) {
  const [conversation, members] = await Promise.all([
    supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle(),
    supabase.from("conversation_members").select("user_id").eq("conversation_id", conversationId),
  ]);
  const memberIds = (members.data ?? []).map((row) => row.user_id);
  const profiles = memberIds.length
    ? (((await supabase.from("profiles").select("*").in("id", memberIds)).data ?? []) as Profile[])
    : [];
  return {
    conversation: (conversation.data ?? null) as Conversation | null,
    members: profiles,
  };
}

export async function fetchMessages(conversationId: string): Promise<(Message & { sender: Profile | null; sharedPost: Post | null })[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Message[];
  const senderIds = [...new Set(rows.map((row) => row.sender_id))];
  const sharedIds = [
    ...new Set(rows.map((row) => row.shared_post_id).filter((value): value is string => Boolean(value))),
  ];
  const [profiles, posts] = await Promise.all([
    senderIds.length
      ? supabase.from("profiles").select("*").in("id", senderIds)
      : Promise.resolve({ data: [] }),
    sharedIds.length
      ? supabase.from("posts").select("*").in("id", sharedIds)
      : Promise.resolve({ data: [] }),
  ]);
  return rows.map((row) => ({
    ...row,
    sender: ((profiles.data ?? []) as Profile[]).find((p) => p.id === row.sender_id) ?? null,
    sharedPost:
      ((posts.data ?? []) as Post[]).find((p) => p.id === row.shared_post_id) ?? null,
  }));
}

/** Reuse an existing 1:1 chat when one already exists. */
export async function startDirectChat(targetId: string): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (userId === targetId) throw new Error("You cannot message yourself");

  const mine = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);
  const theirs = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", targetId);
  const shared = (mine.data ?? [])
    .map((row) => row.conversation_id)
    .filter((id) => (theirs.data ?? []).some((row) => row.conversation_id === id));
  if (shared.length > 0) {
    const existing = await supabase
      .from("conversations")
      .select("id")
      .in("id", shared)
      .eq("is_group", false)
      .limit(1);
    const found = existing.data?.[0]?.id;
    if (found) return found;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ created_by: userId, is_group: false })
    .select("id")
    .single();
  if (error) throw error;
  const conversationId = data.id;
  const { error: memberError } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conversationId, user_id: userId },
      { conversation_id: conversationId, user_id: targetId },
    ]);
  if (memberError) throw memberError;
  return conversationId;
}

export async function createGroupChat(
  title: string,
  memberIds: string[],
  photo?: File | null,
): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const photoPath = photo ? await uploadMedia(photo) : null;
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      created_by: userId,
      is_group: true,
      title: title || "New Group",
      photo_url: photoPath,
    })
    .select("id")
    .single();
  if (error) throw error;
  const conversationId = data.id;
  const rows = [...new Set([userId, ...memberIds])].map((id) => ({
    conversation_id: conversationId,
    user_id: id,
  }));
  const { error: memberError } = await supabase.from("conversation_members").insert(rows);
  if (memberError) throw memberError;
  return conversationId;
}

export async function sendMessage(input: {
  conversationId: string;
  body?: string;
  file?: File | null;
  mediaType?: "image" | "video" | "voice" | null;
  sharedPostId?: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  let mediaPath: string | null = null;
  let mediaType: string | null = input.mediaType ?? null;
  if (input.file) {
    mediaPath = await uploadMedia(input.file);
    mediaType =
      input.mediaType ??
      (input.file.type.startsWith("video")
        ? "video"
        : input.file.type.startsWith("audio")
          ? "voice"
          : "image");
  }
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: userId,
    body: input.body?.trim() || null,
    media_url: mediaPath,
    media_type: mediaType,
    shared_post_id: input.sharedPostId ?? null,
  });
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.conversationId);

  // Notify every other member about the new message.
  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", input.conversationId);
  const me = await fetchMyProfile();
  await Promise.all(
    ((members ?? []) as { user_id: string }[])
      .filter((row) => row.user_id !== userId)
      .map((row) =>
        notify({
          userId: row.user_id,
          kind: "message",
          message: `${me?.name ?? "Someone"} sent you a message`,
        }),
      ),
  );
}


export async function sharePostToChat(postId: string, conversationId: string) {
  await sendMessage({ conversationId, sharedPostId: postId });
}

// ==================== SUPPORT ====================

export type SupportMessage = {
  id: string;
  thread_user_id: string;
  sender_id: string;
  body: string;
  is_staff_reply: boolean;
  created_at: string;
};

export async function fetchMySupportThread(): Promise<SupportMessage[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("thread_user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SupportMessage[];
}

export async function sendSupportMessage(body: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase
    .from("support_messages")
    .insert({ thread_user_id: userId, sender_id: userId, body, is_staff_reply: false });
  if (error) throw error;
}

export async function fetchSupportInbox(): Promise<
  { user: Profile | null; messages: SupportMessage[] }[]
> {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as SupportMessage[];
  const userIds = [...new Set(rows.map((row) => row.thread_user_id))];
  if (userIds.length === 0) return [];
  const profiles = ((await supabase.from("profiles").select("*").in("id", userIds)).data ??
    []) as Profile[];
  return userIds.map((id) => ({
    user: profiles.find((p) => p.id === id) ?? null,
    messages: rows.filter((row) => row.thread_user_id === id),
  }));
}

export async function replyToSupport(threadUserId: string, body: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase
    .from("support_messages")
    .insert({ thread_user_id: threadUserId, sender_id: userId, body, is_staff_reply: true });
  if (error) throw error;
}

export async function isBlocked(targetId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", userId)
    .eq("blocked_id", targetId)
    .maybeSingle();
  return Boolean(data);
}

/** Reposts someone else's post/reel/status onto my own timeline with my own words. */
export async function sharePostToTimeline(postId: string, caption: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { data: original, error: readError } = await supabase
    .from("posts")
    .select("caption, media_url, media_type, kind")
    .eq("id", postId)
    .maybeSingle();
  if (readError) throw readError;
  if (!original) throw new Error("That post is no longer available");
  const { error } = await supabase.from("posts").insert({
    user_id: userId,
    kind: original.kind === "status" ? "post" : original.kind,
    caption: caption.trim() || original.caption,
    media_url: original.media_url,
    media_type: original.media_type,
  });
  if (error) throw error;
}

/** Posts the signed-in member has liked, newest first. */
export async function fetchLiked(): Promise<FeedItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase.from("likes").select("post_id").eq("user_id", userId);
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.post_id);
  if (ids.length === 0) return [];
  const posts = await supabase.from("posts").select("*").in("id", ids);
  if (posts.error) throw posts.error;
  return hydrate((posts.data ?? []) as Post[]);
}
