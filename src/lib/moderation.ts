import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId, type Post, type Profile } from "@/lib/api";

// ==================== AUTO-MOD SCAN ====================

const SEXUAL_WORDS = [
  "porn",
  "pornhub",
  "nude",
  "nudes",
  "nudity",
  "naked",
  "xxx",
  "onlyfans",
  "sex tape",
  "sextape",
  "explicit sex",
  "nsfw",
];

const COPYRIGHT_WORDS = [
  "full album",
  "full song",
  "leaked song",
  "leaked album",
  "official audio rip",
  "mp3 download",
  "free movie download",
  "copyrighted music",
  "unreleased track",
];

export type ScanResult =
  | { allowed: true }
  | { allowed: false; category: "sexual" | "copyright"; reason: string };

/** Auto-scan runs before anything is published. */
export function scanContent(input: { caption: string; file?: File | null }): ScanResult {
  const haystack = `${input.caption ?? ""} ${input.file?.name ?? ""}`.toLowerCase();

  const sexual = SEXUAL_WORDS.find((word) => haystack.includes(word));
  if (sexual) {
    return {
      allowed: false,
      category: "sexual",
      reason: `Auto-Mod blocked sexual content or nudity ("${sexual}")`,
    };
  }

  const copyright = COPYRIGHT_WORDS.find((word) => haystack.includes(word));
  if (copyright) {
    return {
      allowed: false,
      category: "copyright",
      reason: `Auto-Mod blocked copyright music or content ("${copyright}")`,
    };
  }

  return { allowed: true };
}

/** Adds a strike (3 strikes = automatic ban) and returns the new strike count. */
export async function addStrike(userId: string, reason: string, postId?: string | null) {
  const { data, error } = await supabase.rpc("add_strike", {
    _user_id: userId,
    _reason: reason,
    _post_id: postId ?? null,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function logCopyright(input: {
  userId: string;
  reason: string;
  detail?: string | null;
  postId?: string | null;
}) {
  const { error } = await supabase.rpc("log_copyright", {
    _user_id: input.userId,
    _reason: input.reason,
    _detail: input.detail ?? null,
    _post_id: input.postId ?? null,
  });
  if (error) throw error;
}

export async function logModeration(input: {
  action: string;
  targetUserId?: string | null;
  targetPostId?: string | null;
  notes?: string | null;
}) {
  const { error } = await supabase.rpc("log_moderation", {
    _action: input.action,
    _target_user_id: input.targetUserId ?? null,
    _target_post_id: input.targetPostId ?? null,
    _notes: input.notes ?? null,
  });
  if (error) throw error;
}

// ==================== REPORTS ====================

export type Report = {
  id: string;
  reporter_id: string;
  post_id: string | null;
  reported_user_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

export async function createReport(input: {
  postId?: string | null;
  reportedUserId?: string | null;
  reason: string;
  details?: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    post_id: input.postId ?? null,
    reported_user_id: input.reportedUserId ?? null,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw error;
}

export async function fetchReports(): Promise<
  (Report & { reporter: Profile | null; reported: Profile | null; post: Post | null })[]
> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as Report[];
  const userIds = [
    ...new Set(
      rows.flatMap((row) => [row.reporter_id, row.reported_user_id]).filter(Boolean) as string[],
    ),
  ];
  const postIds = [...new Set(rows.map((row) => row.post_id).filter(Boolean) as string[])];
  const [profiles, posts] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("*").in("id", userIds) : { data: [] },
    postIds.length ? supabase.from("posts").select("*").in("id", postIds) : { data: [] },
  ]);
  return rows.map((row) => ({
    ...row,
    reporter: ((profiles.data ?? []) as Profile[]).find((p) => p.id === row.reporter_id) ?? null,
    reported:
      ((profiles.data ?? []) as Profile[]).find((p) => p.id === row.reported_user_id) ?? null,
    post: ((posts.data ?? []) as Post[]).find((p) => p.id === row.post_id) ?? null,
  }));
}

export async function setReportStatus(reportId: string, status: "open" | "actioned" | "dismissed") {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("reports")
    .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) throw error;
  await logModeration({ action: `report_${status}`, notes: reportId });
}

// ==================== LOGS ====================

export type ModerationLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  target_post_id: string | null;
  notes: string | null;
  created_at: string;
};

export async function fetchModerationLog(): Promise<
  (ModerationLogRow & { actor: Profile | null; target: Profile | null })[]
> {
  const { data, error } = await supabase
    .from("moderation_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as ModerationLogRow[];
  const ids = [
    ...new Set(
      rows.flatMap((row) => [row.actor_id, row.target_user_id]).filter(Boolean) as string[],
    ),
  ];
  const profiles = ids.length
    ? (((await supabase.from("profiles").select("*").in("id", ids)).data ?? []) as Profile[])
    : [];
  return rows.map((row) => ({
    ...row,
    actor: profiles.find((p) => p.id === row.actor_id) ?? null,
    target: profiles.find((p) => p.id === row.target_user_id) ?? null,
  }));
}

export type CopyrightRow = {
  id: string;
  user_id: string | null;
  post_id: string | null;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
};

export async function fetchCopyrightLog(): Promise<
  (CopyrightRow & { user: Profile | null })[]
> {
  const { data, error } = await supabase
    .from("copyright_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as CopyrightRow[];
  const ids = [...new Set(rows.map((row) => row.user_id).filter(Boolean) as string[])];
  const profiles = ids.length
    ? (((await supabase.from("profiles").select("*").in("id", ids)).data ?? []) as Profile[])
    : [];
  return rows.map((row) => ({ ...row, user: profiles.find((p) => p.id === row.user_id) ?? null }));
}

// ==================== APPEALS ====================

export type Appeal = {
  id: string;
  user_id: string;
  message: string;
  status: string;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
};

export async function submitAppeal(message: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please log in");
  const { error } = await supabase.from("appeals").insert({ user_id: userId, message });
  if (error) throw error;
}

export async function fetchMyAppeals(): Promise<Appeal[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("appeals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Appeal[];
}

export async function fetchAppeals(): Promise<(Appeal & { user: Profile | null })[]> {
  const { data, error } = await supabase
    .from("appeals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as Appeal[];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const profiles = ids.length
    ? (((await supabase.from("profiles").select("*").in("id", ids)).data ?? []) as Profile[])
    : [];
  return rows.map((row) => ({ ...row, user: profiles.find((p) => p.id === row.user_id) ?? null }));
}

/** Owner only: approve (unban) or reject an appeal. */
export async function decideAppeal(input: {
  appealId: string;
  userId: string;
  approve: boolean;
  note?: string;
}) {
  const me = await getCurrentUserId();
  const { error } = await supabase
    .from("appeals")
    .update({
      status: input.approve ? "approved" : "rejected",
      decision_note: input.note ?? null,
      decided_by: me,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.appealId);
  if (error) throw error;
  if (input.approve) await setBanned(input.userId, false);
}

// ==================== VIRAL / BAN ====================

export async function setViral(userId: string, on: boolean) {
  const { error } = await supabase.rpc("admin_set_viral", { _user_id: userId, _on: on });
  if (error) throw error;
}

/** Owner only. */
export async function setBanned(userId: string, banned: boolean, reason?: string) {
  const { error } = await supabase.rpc("owner_set_ban", {
    _user_id: userId,
    _banned: banned,
    _reason: reason ?? null,
  });
  if (error) throw error;
}

export async function fetchMembers(term = ""): Promise<Profile[]> {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
  if (term.trim()) {
    const like = `%${term.trim()}%`;
    query = query.or(`name.ilike.${like},username.ilike.${like}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Profile[];
}
