import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { SignedMedia } from "@/components/SignedMedia";
import { getMyEmail, OWNER_EMAIL } from "@/lib/api";
import {
  type AppealItem,
  countdown,
  decideAppealDecision,
  fetchAppealQueue,
  hoursLeft,
  riskBand,
  timeAgo,
} from "@/lib/appeals";

export const Route = createFileRoute("/_authenticated/admin/appeals")({
  head: () => ({
    meta: [
      { title: "Appeals Inbox — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Staff inbox for MzansiTalk AI moderation appeals, filtered by risk score with 24 hour auto-resolve.",
      },
      { property: "og:title", content: "Appeals Inbox — MzansiTalk Admin" },
      {
        property: "og:description",
        content: "Review AI-flagged content and decide appeals within 24 hours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppealsInbox,
});

type TabKey = "all" | "green" | "yellow" | "red" | "urgent";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "green", label: "🟢 Green" },
  { key: "yellow", label: "🟡 Yellow" },
  { key: "red", label: "🔴 Red" },
  { key: "urgent", label: "⏰ <6h Urgent" },
];

function matches(tab: TabKey, appeal: AppealItem) {
  const band = riskBand(appeal.ai_score_at_appeal);
  if (tab === "all") return true;
  if (tab === "urgent") return appeal.status === "pending" && hoursLeft(appeal.auto_resolve_at) < 6;
  return band === tab;
}

function ScoreBadge({ score }: { score: number }) {
  const band = riskBand(score);
  const tone =
    band === "green"
      ? "bg-emerald-500/15 text-emerald-400"
      : band === "yellow"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-destructive/15 text-destructive";
  const dot = band === "green" ? "🟢" : band === "yellow" ? "🟡" : "🔴";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>
      {dot} {score}%
    </span>
  );
}

function AppealCard({ appeal }: { appeal: AppealItem }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [showMedia, setShowMedia] = useState(false);

  const decide = useMutation({
    mutationFn: (approve: boolean) =>
      decideAppealDecision({ appealId: appeal.id, approve, reason: reason.trim() || null }),
    onSuccess: (_result, approve) => {
      toast.success(approve ? "Approved and published." : "Kept removed.");
      void queryClient.invalidateQueries({ queryKey: ["appeal-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const lowRisk = appeal.ai_score_at_appeal < 50;
  const pending = appeal.status === "pending";

  return (
    <li className="rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-bold text-foreground">
          APPEAL #{appeal.id.slice(0, 8)}
        </span>
        <span>{timeAgo(appeal.created_at)}</span>
        {pending ? (
          <span className={hoursLeft(appeal.auto_resolve_at) < 6 ? "text-destructive" : ""}>
            Auto-resolve in: {countdown(appeal.auto_resolve_at)}
          </span>
        ) : (
          <span className="rounded-full bg-secondary px-2 py-0.5 font-bold uppercase">
            {appeal.status} · {appeal.resolved_by ?? "admin"}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm font-bold">
        {appeal.user?.name ?? "Member"}{" "}
        {appeal.user?.username ? (
          <Link
            to="/u/$username"
            params={{ username: appeal.user.username }}
            className="font-normal text-muted-foreground underline"
          >
            @{appeal.user.username}
          </Link>
        ) : null}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Post: {appeal.post?.media_type ?? appeal.post?.kind ?? "content"} —{" "}
        {appeal.post?.caption ? `"${appeal.post.caption}"` : "no caption"}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">AI Score:</span>
        <ScoreBadge score={appeal.ai_score_at_appeal} />
        {(appeal.post?.ai_flags ?? []).map((flag) => (
          <span
            key={flag}
            className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold"
          >
            {flag}
          </span>
        ))}
      </div>

      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">Reason user gave: </span>“{appeal.message}”
      </p>

      {showMedia && appeal.post?.media_url ? (
        <div className="mt-3 overflow-hidden rounded-xl">
          <SignedMedia
            path={appeal.post.media_url}
            type={appeal.post.media_type === "video" ? "video" : "image"}
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {appeal.post_id ? (
          <Link
            to="/home"
            search={{ post: appeal.post_id } as never}
            className="btn-base bg-secondary px-3 py-1.5 text-xs"
          >
            View Post
          </Link>
        ) : null}
        {appeal.post?.media_url ? (
          <button
            type="button"
            onClick={() => setShowMedia((value) => !value)}
            className="btn-base bg-secondary px-3 py-1.5 text-xs"
          >
            {showMedia
              ? "Hide media"
              : appeal.post.media_type === "video"
                ? "Play Video"
                : "View Photo"}
          </button>
        ) : null}
      </div>

      {pending ? (
        <div className="mt-3 space-y-2">
          <input
            className="field field-focus text-sm"
            placeholder="Decision reason (required to keep removed)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={decide.isPending || !reason.trim()}
              onClick={() => decide.mutate(false)}
              className="btn-base bg-destructive px-3 py-1.5 text-xs text-destructive-foreground disabled:opacity-50"
            >
              Keep Removed + Reason
            </button>
            <button
              type="button"
              disabled={decide.isPending || !lowRisk}
              onClick={() => decide.mutate(true)}
              title={lowRisk ? "" : "Blocked: AI score is 50% or higher"}
              className="btn-base btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Approve + Publish {lowRisk ? "✅" : "🔒"}
            </button>
          </div>
          {!lowRisk ? (
            <p className="text-xs text-muted-foreground">
              High-risk content (≥50%) cannot be published from this inbox — Meta Audience Network
              policy.
            </p>
          ) : null}
        </div>
      ) : appeal.decision_note ? (
        <p className="mt-2 text-xs text-muted-foreground">Decision: {appeal.decision_note}</p>
      ) : null}
    </li>
  );
}

function AppealsInbox() {
  const [tab, setTab] = useState<TabKey>("all");
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isStaff = Boolean(email.data);
  const isOwnerOrAdmin = email.data?.toLowerCase() === OWNER_EMAIL || isStaff;

  const appeals = useQuery({
    queryKey: ["appeal-queue"],
    queryFn: fetchAppealQueue,
    enabled: isOwnerOrAdmin,
    refetchInterval: 60_000,
  });

  const rows = appeals.data ?? [];
  const counts = useMemo(() => {
    const map = {} as Record<TabKey, number>;
    for (const { key } of TABS) map[key] = rows.filter((row) => matches(key, row)).length;
    return map;
  }, [rows]);
  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const visible = rows.filter((row) => matches(tab, row));

  if (email.isLoading) {
    return (
      <Screen title="Appeals Inbox">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (appeals.isError) {
    return (
      <Screen title="Appeals Inbox">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Staff Only.</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Appeals Inbox">
      <h1 className="font-display text-lg font-bold">
        MzansiTalk Admin | Appeals: {pendingCount} Pending
      </h1>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`btn-base shrink-0 px-3 py-1.5 text-xs ${
              tab === key ? "btn-primary" : "bg-secondary"
            }`}
          >
            {label} {counts[key] ?? 0}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((appeal) => (
          <AppealCard key={appeal.id} appeal={appeal} />
        ))}
        {visible.length === 0 ? (
          <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {appeals.isLoading ? "Loading appeals…" : "Nothing in this tab."}
          </li>
        ) : null}
      </ul>
    </Screen>
  );
}
