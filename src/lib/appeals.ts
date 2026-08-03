import { supabase } from "@/integrations/supabase/client";
import type { Post, Profile } from "@/lib/api";

export type RiskBand = "green" | "yellow" | "red";

export type AppealRow = {
  id: string;
  user_id: string;
  post_id: string | null;
  message: string;
  status: "pending" | "approved" | "removed";
  ai_score_at_appeal: number;
  auto_resolve_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  decision_note: string | null;
  created_at: string;
};

export type AppealItem = AppealRow & {
  user: Profile | null;
  post: (Post & { ai_score?: number; ai_flags?: string[] }) | null;
};

export function riskBand(score: number): RiskBand {
  if (score < 30) return "green";
  if (score < 50) return "yellow";
  return "red";
}

export function hoursLeft(autoResolveAt: string): number {
  return (new Date(autoResolveAt).getTime() - Date.now()) / 3_600_000;
}

export function countdown(autoResolveAt: string): string {
  const ms = new Date(autoResolveAt).getTime() - Date.now();
  if (ms <= 0) return "resolving…";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Runs the 24h auto-resolve sweep, then loads every appeal with its post + author. */
export async function fetchAppealQueue(): Promise<AppealItem[]> {
  await supabase.rpc("auto_resolve_appeals");

  const { data, error } = await supabase
    .from("appeals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  const rows = (data ?? []) as AppealRow[];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const postIds = [...new Set(rows.map((row) => row.post_id).filter(Boolean) as string[])];

  const [profiles, posts] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("*").in("id", userIds) : { data: [] },
    postIds.length ? supabase.from("posts").select("*").in("id", postIds) : { data: [] },
  ]);

  return rows.map((row) => ({
    ...row,
    user: ((profiles.data ?? []) as Profile[]).find((p) => p.id === row.user_id) ?? null,
    post: ((posts.data ?? []) as Post[]).find((p) => p.id === row.post_id) ?? null,
  }));
}

export async function decideAppealDecision(input: {
  appealId: string;
  approve: boolean;
  reason?: string | null;
}) {
  const { error } = await supabase.rpc("admin_decide_appeal", {
    _appeal_id: input.appealId,
    _approve: input.approve,
    ...(input.reason ? { _reason: input.reason } : {}),
  });
  if (error) throw error;
}

export async function fetchAuditLog(): Promise<
  {
    id: string;
    admin_id: string | null;
    action: string;
    post_id: string | null;
    ai_score: number;
    reason: string | null;
    created_at: string;
  }[]
> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as never;
}
