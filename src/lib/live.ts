import { supabase } from "@/integrations/supabase/client";

import { getCurrentUserId, notify, type Profile, uploadMedia } from "@/lib/api";

/** Hard cap for every live stream. */
export const MAX_LIVE_HOURS = 4;
/** Price to boost a live so non-friends see it in the Home feed. */
export const LIVE_BOOST_PRICE = 50;
/** Host can have at most this many approved guests on video at once. */
export const MAX_LIVE_GUESTS = 2;
/** Saved lives disappear from the host's timeline after this many days. */
export const LIVE_KEEP_DAYS = 60;

export type LiveStream = {
  id: string;
  host_id: string;
  title: string | null;
  is_boosted: boolean;
  boost_amount: number;
  status: string;
  started_at: string;
  scheduled_end_at: string;
  ended_at: string | null;
  recording_url: string | null;
  viewers: number;
  created_at: string;
};

export type LiveComment = {
  id: string;
  stream_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: Profile | null;
};

export type LiveJoinRequest = {
  id: string;
  stream_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "left";
  created_at: string;
  member: Profile | null;
};

async function withHosts(rows: LiveStream[]): Promise<(LiveStream & { host: Profile | null })[]> {
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((row) => row.host_id))];
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  const hosts = (data ?? []) as Profile[];
  return rows.map((row) => ({ ...row, host: hosts.find((p) => p.id === row.host_id) ?? null }));
}

/**
 * Lives visible to me: my own, people I follow ("friends"), and any boosted live.
 * Un-boosted lives never reach people who do not follow the host.
 */
export async function fetchVisibleLives(): Promise<(LiveStream & { host: Profile | null })[]> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("status", "live")
    .gt("scheduled_end_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = (data ?? []) as LiveStream[];
  if (rows.length === 0) return [];

  let friends: string[] = [];
  if (userId) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    friends = (follows ?? []).map((row) => row.following_id);
  }

  return withHosts(
    rows.filter(
      (row) => row.is_boosted || row.host_id === userId || friends.includes(row.host_id),
    ),
  );
}

export async function fetchLive(id: string) {
  const { data, error } = await supabase.from("live_streams").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await withHosts([data as LiveStream]))[0] ?? null;
}

/** The host's current live, if one is still running. */
export async function fetchMyActiveLive(): Promise<LiveStream | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("live_streams")
    .select("*")
    .eq("host_id", userId)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as LiveStream | undefined) ?? null;
}

export async function startLive(input: { title: string; boosted: boolean }): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");

  // Any old live of mine is closed first, so every new live counts from zero.
  await supabase
    .from("live_streams")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("host_id", userId)
    .eq("status", "live");

  const now = Date.now();
  const { data, error } = await supabase
    .from("live_streams")
    .insert({
      host_id: userId,
      title: input.title.trim() || null,
      is_boosted: input.boosted,
      boost_amount: input.boosted ? LIVE_BOOST_PRICE : 0,
      started_at: new Date(now).toISOString(),
      scheduled_end_at: new Date(now + MAX_LIVE_HOURS * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;

  // Friends (my followers) get "Your friend is Live".
  const { data: followers } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId);
  await Promise.all(
    ((followers ?? []) as { follower_id: string }[]).map((row) =>
      notify({ userId: row.follower_id, kind: "live", message: "Your friend is Live" }),
    ),
  );
  return data.id;
}

/**
 * Ends a live. The recording (when the host's browser captured one) is saved to
 * the host's own timeline for {@link LIVE_KEEP_DAYS} days — never to the main feed.
 */
export async function endLive(streamId: string, recording?: Blob | null) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");

  let mediaPath: string | null = null;
  if (recording && recording.size > 0) {
    const file = new File([recording], `live-${Date.now()}.webm`, { type: "video/webm" });
    try {
      mediaPath = await uploadMedia(file);
    } catch {
      mediaPath = null;
    }
  }

  const { data: stream } = await supabase
    .from("live_streams")
    .select("title")
    .eq("id", streamId)
    .maybeSingle();

  const { error } = await supabase
    .from("live_streams")
    .update({ status: "ended", ended_at: new Date().toISOString(), recording_url: mediaPath })
    .eq("id", streamId)
    .eq("host_id", userId);
  if (error) throw error;

  await supabase
    .from("live_join_requests")
    .update({ status: "left" })
    .eq("stream_id", streamId)
    .eq("status", "approved");

  if (mediaPath) {
    await supabase.from("posts").insert({
      user_id: userId,
      kind: "post",
      caption: `Live · ${(stream as { title?: string | null } | null)?.title ?? "MzansiTalk Live"}`,
      media_url: mediaPath,
      media_type: "video",
      expires_at: new Date(Date.now() + LIVE_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
}

export async function fetchLiveComments(streamId: string): Promise<LiveComment[]> {
  const { data, error } = await supabase
    .from("live_comments")
    .select("*")
    .eq("stream_id", streamId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as Omit<LiveComment, "author">[];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const profiles = ids.length
    ? (((await supabase.from("profiles").select("*").in("id", ids)).data ?? []) as Profile[])
    : [];
  return rows.map((row) => ({
    ...row,
    author: profiles.find((p) => p.id === row.user_id) ?? null,
  }));
}

export async function addLiveComment(streamId: string, body: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const text = body.trim();
  if (!text) return;
  const { error } = await supabase
    .from("live_comments")
    .insert({ stream_id: streamId, user_id: userId, body: text });
  if (error) throw error;
}

export async function fetchLiveLikes(streamId: string) {
  const userId = await getCurrentUserId();
  const { data } = await supabase.from("live_likes").select("user_id").eq("stream_id", streamId);
  const rows = (data ?? []) as { user_id: string }[];
  return { count: rows.length, likedByMe: rows.some((row) => row.user_id === userId) };
}

export async function toggleLiveLike(streamId: string, liked: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  if (liked) {
    await supabase.from("live_likes").delete().eq("stream_id", streamId).eq("user_id", userId);
    return;
  }
  const { error } = await supabase
    .from("live_likes")
    .insert({ stream_id: streamId, user_id: userId });
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function fetchJoinRequests(streamId: string): Promise<LiveJoinRequest[]> {
  const { data, error } = await supabase
    .from("live_join_requests")
    .select("*")
    .eq("stream_id", streamId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Omit<LiveJoinRequest, "member">[];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const profiles = ids.length
    ? (((await supabase.from("profiles").select("*").in("id", ids)).data ?? []) as Profile[])
    : [];
  return rows.map((row) => ({
    ...row,
    member: profiles.find((p) => p.id === row.user_id) ?? null,
  }));
}

/** Viewers ask to join the host on video. Re-asking after leaving is allowed. */
export async function requestToJoin(streamId: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { data: existing } = await supabase
    .from("live_join_requests")
    .select("id")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("live_join_requests")
      .update({ status: "pending" })
      .eq("id", (existing as { id: string }).id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("live_join_requests")
    .insert({ stream_id: streamId, user_id: userId, status: "pending" });
  if (error) throw error;
}

/** Host approves, rejects or removes a guest. Max 2 approved guests at a time. */
export async function setJoinStatus(
  requestId: string,
  status: "approved" | "rejected" | "left",
) {
  if (status === "approved") {
    const { data: request } = await supabase
      .from("live_join_requests")
      .select("stream_id, user_id")
      .eq("id", requestId)
      .maybeSingle();
    const streamId = (request as { stream_id?: string } | null)?.stream_id;
    if (streamId) {
      const { count } = await supabase
        .from("live_join_requests")
        .select("id", { count: "exact", head: true })
        .eq("stream_id", streamId)
        .eq("status", "approved");
      if ((count ?? 0) >= MAX_LIVE_GUESTS) {
        throw new Error(
          `${MAX_LIVE_GUESTS} people are already live with you. Remove one first — this request stays pending.`,
        );
      }
    }
    const target = (request as { user_id?: string } | null)?.user_id;
    if (target) {
      await notify({ userId: target, kind: "live", message: "You were approved to join the live" });
    }
  }
  const { error } = await supabase
    .from("live_join_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) throw error;
}

/** A guest leaving the live on their own. They must request again to come back. */
export async function leaveLive(streamId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase
    .from("live_join_requests")
    .update({ status: "left" })
    .eq("stream_id", streamId)
    .eq("user_id", userId);
}

/** Sharing a live only puts it on the sharer's own timeline, never the main feed. */
export async function shareLiveToTimeline(stream: LiveStream & { host: Profile | null }) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase.from("posts").insert({
    user_id: userId,
    kind: "post",
    caption: `Watching ${stream.host?.name ?? "a friend"} Live${stream.title ? ` · ${stream.title}` : ""}`,
    expires_at: new Date(Date.now() + LIVE_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
}

export type MyEarnings = {
  approved: boolean;
  impressions: number;
  clicks: number;
  ad_share: number;
  boost_share: number;
  total: number;
  paid_out: number;
};

/** Only ever returns the member's own 20% share — platform totals stay hidden. */
export async function fetchMyEarnings(): Promise<MyEarnings> {
  const { data, error } = await supabase.rpc("my_earnings");
  if (error) throw error;
  const row = (data ?? {}) as Partial<MyEarnings>;
  return {
    approved: Boolean(row.approved),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    ad_share: Number(row.ad_share ?? 0),
    boost_share: Number(row.boost_share ?? 0),
    total: Number(row.total ?? 0),
    paid_out: Number(row.paid_out ?? 0),
  };
}

export async function setMonetizationApproved(userId: string, approved: boolean) {
  const { error } = await supabase.rpc("owner_set_monetization", {
    _user_id: userId,
    _approved: approved,
  });
  if (error) throw error;
}
