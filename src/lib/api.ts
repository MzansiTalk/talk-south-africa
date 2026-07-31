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
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.role as string);
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
  let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(60);
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
    await supabase.from("notifications").insert({
      user_id: targetId,
      actor_id: userId,
      kind: "follow",
      message: "started following you",
    });
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
  let mediaPath: string | null = null;
  let mediaType: string | null = null;
  if (input.file) {
    mediaPath = await uploadMedia(input.file);
    mediaType = input.file.type.startsWith("video") ? "video" : "image";
  }
  const expiresAt =
    input.kind === "status" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
  const { error } = await supabase.from("posts").insert({
    user_id: userId,
    kind: input.kind,
    caption: input.caption || null,
    media_url: mediaPath,
    media_type: mediaType,
    expires_at: expiresAt,
  });
  if (error) throw error;
}

export async function updateMyProfile(patch: Partial<Profile>) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function fetchNotifications() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
