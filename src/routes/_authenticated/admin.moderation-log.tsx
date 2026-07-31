import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Screen, useIsAdmin } from "@/components/Shell";
import { fetchModerationLog } from "@/lib/moderation";

export const Route = createFileRoute("/_authenticated/admin/moderation-log")({
  head: () => ({
    meta: [
      { title: "Moderation Log — MzansiTalk Admin" },
      {
        name: "description",
        content: "Every admin and owner action taken on MzansiTalk, newest first.",
      },
      { property: "og:title", content: "Moderation Log — MzansiTalk Admin" },
      { property: "og:description", content: "Full history of MzansiTalk moderation actions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModerationLogPage,
});

const LABELS: Record<string, string> = {
  viral_on: "Viral turned ON",
  viral_off: "Viral turned OFF",
  ban: "User banned",
  unban: "User unbanned",
  auto_ban: "Automatic ban (3 strikes)",
  strike: "Strike added",
};

function ModerationLogPage() {
  const { isAdmin } = useIsAdmin();
  const log = useQuery({ queryKey: ["moderation-log"], queryFn: fetchModerationLog, enabled: isAdmin });

  if (!isAdmin) {
    return (
      <Screen title="Moderation Log">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Moderation Log">
      <ul className="space-y-2">
        {(log.data ?? []).map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-sm font-bold">{LABELS[row.action] ?? row.action}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              By {row.actor?.name ?? "System"}
              {row.target ? ` · on @${row.target.username}` : ""} ·{" "}
              {new Date(row.created_at).toLocaleString("en-ZA")}
            </p>
            {row.notes ? <p className="mt-1 text-xs">{row.notes}</p> : null}
          </li>
        ))}
        {(log.data ?? []).length === 0 ? (
          <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No moderation actions yet.
          </li>
        ) : null}
      </ul>
    </Screen>
  );
}
