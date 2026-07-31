import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, ShieldAlert, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen, useIsAdmin } from "@/components/Shell";
import {
  decideCreatorApplication,
  fetchAllPayouts,
  fetchCreatorApplications,
  setPayoutStatus,
} from "@/lib/creators";

export const Route = createFileRoute("/_authenticated/admin/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk payout dashboard: approve creator payouts, mark them paid and review Creator Program applications.",
      },
      { property: "og:title", content: "Payouts — MzansiTalk Admin" },
      { property: "og:description", content: "Creator payouts and applications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const { isOwner } = useIsAdmin();
  const queryClient = useQueryClient();

  const payouts = useQuery({
    queryKey: ["all-payouts"],
    queryFn: fetchAllPayouts,
    enabled: isOwner,
  });
  const applications = useQuery({
    queryKey: ["creator-applications"],
    queryFn: fetchCreatorApplications,
    enabled: isOwner,
  });

  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "paid" | "rejected" }) =>
      setPayoutStatus(input.id, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["all-payouts"] });
      toast.success("Payout updated. The creator has been notified.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const decide = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "rejected" }) =>
      decideCreatorApplication(input.id, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creator-applications"] });
      toast.success("Application updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isOwner) {
    return (
      <Screen title="Payouts">
        <div className="rounded-2xl border border-destructive bg-card p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <p className="mt-3 text-sm font-bold">Access Denied. Owner Only.</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Payouts">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Wallet className="size-4 text-gold" /> Payout Requests
        </h2>
        <ul className="mt-3 space-y-2">
          {(payouts.data ?? []).map((row) => (
            <li key={row.id} className="rounded-xl bg-secondary/60 p-3">
              <div className="flex items-center gap-3">
                <Avatar
                  path={row.profile?.avatar_url}
                  name={row.profile?.name ?? "M"}
                  size={32}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {row.profile?.name ?? "Member"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    R{Number(row.creator_share).toFixed(2)} to creator · R
                    {Number(row.platform_share).toFixed(2)} to MzansiTalk
                  </span>
                </span>
                <span className="text-xs font-bold capitalize">{row.status}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.bank
                  ? `${row.bank.bank_name} · ${row.bank.account_number} · ${row.bank.full_name} · ${row.bank.phone}`
                  : "No bank details on file"}
              </p>
              <p className="text-xs text-muted-foreground">
                Requested {new Date(row.created_at).toLocaleString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ id: row.id, status: "approved" })}
                  className="btn-base btn-primary px-3 py-1.5 text-xs"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ id: row.id, status: "paid" })}
                  className="btn-base btn-gold px-3 py-1.5 text-xs"
                >
                  Mark as Paid
                </button>
                <button
                  type="button"
                  onClick={() => setStatus.mutate({ id: row.id, status: "rejected" })}
                  className="btn-base bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {(payouts.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No payout requests yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <BadgeCheck className="size-4 text-gold" /> Creator Applications
        </h2>
        <ul className="mt-3 space-y-2">
          {(applications.data ?? []).map((row) => (
            <li key={row.id} className="rounded-xl bg-secondary/60 p-3">
              <p className="text-sm font-semibold">
                {row.full_name}{" "}
                <span className="text-xs text-muted-foreground">@{row.profile?.username}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {row.bank_name} · {row.account_number} · ID {row.id_number} · {row.phone}
              </p>
              <p className="mt-1 text-xs font-bold capitalize">{row.status}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => decide.mutate({ id: row.id, status: "approved" })}
                  className="btn-base btn-primary px-3 py-1.5 text-xs"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide.mutate({ id: row.id, status: "rejected" })}
                  className="btn-base bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {(applications.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No applications yet.</li>
          ) : null}
        </ul>
      </section>
    </Screen>
  );
}
