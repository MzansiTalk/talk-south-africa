import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PauseCircle, Rocket, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen, useIsAdmin } from "@/components/Shell";
import { fetchAllBoosts, setBoostStatus } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/boosts")({
  head: () => ({
    meta: [
      { title: "Boost Manager — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Admin boost manager for MzansiTalk: active boosts, past boosts, amounts paid and monthly boost revenue.",
      },
      { property: "og:title", content: "Boost Manager — MzansiTalk Admin" },
      { property: "og:description", content: "Manage every paid boost on MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BoostManager,
});

function BoostManager() {
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const boosts = useQuery({ queryKey: ["all-boosts"], queryFn: fetchAllBoosts, enabled: isAdmin });

  const change = useMutation({
    mutationFn: (input: { id: string; status: "paused" | "refunded" }) =>
      setBoostStatus(input.id, input.status),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ["all-boosts"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success(input.status === "paused" ? "Boost paused" : "Boost refunded");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return (
      <Screen title="Boost Manager">
        <p className="rounded-2xl border border-destructive bg-destructive/10 p-6 text-center text-sm font-bold">
          Access Denied. Admins only.
        </p>
      </Screen>
    );
  }

  const rows = boosts.data ?? [];
  const now = new Date();
  const active = rows.filter(
    (row) => row.status === "active" && new Date(row.ends_at) > now,
  );
  const past = rows.filter((row) => !active.includes(row));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenue = rows
    .filter((row) => new Date(row.created_at) >= monthStart && row.status !== "refunded")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const Row = ({ row }: { row: (typeof rows)[number] }) => (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar path={row.author?.avatar_url ?? null} name={row.author?.name ?? "M"} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">@{row.author?.username ?? "unknown"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.post?.caption || `(${row.post?.kind ?? "content"})`}
          </p>
        </div>
        <span className="font-display text-sm font-bold">R{Number(row.amount).toFixed(2)}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(row.starts_at).toLocaleDateString()} → {new Date(row.ends_at).toLocaleDateString()}{" "}
        · {row.status} · {row.views_gained.toLocaleString()} views
      </p>
      {row.status === "active" ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => change.mutate({ id: row.id, status: "paused" })}
            className="btn-base bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
          >
            <PauseCircle className="size-3.5" /> Pause Boost
          </button>
          <button
            type="button"
            onClick={() => change.mutate({ id: row.id, status: "refunded" })}
            className="btn-base bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
          >
            <Undo2 className="size-3.5" /> Refund
          </button>
        </div>
      ) : null}
    </li>
  );

  return (
    <Screen title="Boost Manager">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Total Boost Revenue This Month</p>
        <p className="mt-1 font-display text-2xl font-bold">R{revenue.toFixed(2)}</p>
      </div>

      <h2 className="mt-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <Rocket className="size-4 text-gold" /> Active Boosts ({active.length})
      </h2>
      {active.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No active boosts.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {active.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-sm font-bold uppercase tracking-wide">Past Boosts ({past.length})</h2>
      {past.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No past boosts.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {past.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </ul>
      )}
    </Screen>
  );
}
