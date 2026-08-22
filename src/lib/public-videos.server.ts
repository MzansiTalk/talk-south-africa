import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublicVideo = {
  id: string;
  kind: string;
  caption: string;
  views: number;
  createdAt: string;
  authorName: string;
  authorUsername: string;
  url: string;
};

const SIGN_SECONDS = 60 * 60 * 6;

/**
 * Public, login-free video catalogue for the marketing homepage and watch pages.
 * Runs with elevated privileges on the server and returns nothing but the
 * playable URL and public metadata — no emails, no private fields.
 */
async function loadVideos(limit: number, id?: string): Promise<PublicVideo[]> {
  let query = supabaseAdmin
    .from("posts")
    .select("id, kind, caption, media_url, media_type, views, created_at, user_id")
    .in("kind", ["post", "reel"])
    .eq("media_type", "video")
    .not("media_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (id) query = query.eq("id", id);

  const { data: rows, error } = await query;
  if (error || !rows) return [];

  const visible = rows.filter(
    (row) =>
      (row as { deleted_by_admin?: boolean }).deleted_by_admin !== true &&
      (row as { moderation_status?: string }).moderation_status !== "removed",
  );
  if (visible.length === 0) return [];

  const authorIds = [...new Set(visible.map((row) => row.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, name, username, is_hidden")
    .in("id", authorIds);

  const byId = new Map((profiles ?? []).map((row) => [row.id, row]));

  const results: PublicVideo[] = [];
  for (const row of visible) {
    const author = byId.get(row.user_id);
    if (author?.is_hidden) continue;
    const path = row.media_url;
    if (!path) continue;
    const { data: signed } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(path, SIGN_SECONDS);
    if (!signed?.signedUrl) continue;
    results.push({
      id: row.id,
      kind: row.kind ?? "post",
      caption: (row.caption ?? "").trim() || "MzansiTalk video",
      views: Number(row.views ?? 0),
      createdAt: row.created_at,
      authorName: author?.name ?? "MzansiTalk member",
      authorUsername: author?.username ?? "mzansitalk",
      url: signed.signedUrl,
    });
  }
  return results;
}

export function listPublicVideos(limit = 12) {
  return loadVideos(limit);
}

export async function getPublicVideo(id: string) {
  const [video] = await loadVideos(1, id);
  return video ?? null;
}
