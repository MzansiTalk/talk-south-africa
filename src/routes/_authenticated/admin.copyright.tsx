import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Screen, useIsAdmin } from "@/components/Shell";
import { fetchCopyrightLog } from "@/lib/moderation";

export const Route = createFileRoute("/_authenticated/admin/copyright")({
  head: () => ({
    meta: [
      { title: "Copyright Log — MzansiTalk Admin" },
      {
        name: "description",
        content: "Flagged music and copied content caught by MzansiTalk Auto-Mod.",
      },
      { property: "og:title", content: "Copyright Log — MzansiTalk Admin" },
      { property: "og:description", content: "Copyright flags raised on MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CopyrightLogPage,
});

function CopyrightLogPage() {
  const { isAdmin } = useIsAdmin();
  const log = useQuery({ queryKey: ["copyright-log"], queryFn: fetchCopyrightLog, enabled: isAdmin });

  if (!isAdmin) {
    return (
      <Screen title="Copyright Log">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Copyright Log">
      <ul className="space-y-2">
        {(log.data ?? []).map((row) => (
          <li key={row.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{row.reason}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-bold uppercase">
                {row.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              @{row.user?.username ?? "member"} · {new Date(row.created_at).toLocaleString("en-ZA")}
            </p>
            {row.detail ? <p className="mt-1 text-xs">{row.detail}</p> : null}
          </li>
        ))}
        {(log.data ?? []).length === 0 ? (
          <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nothing flagged yet.
          </li>
        ) : null}
      </ul>
    </Screen>
  );
}
