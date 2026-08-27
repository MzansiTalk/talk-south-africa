import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { fetchMyProfile } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard-affiliate")({
  head: () => ({
    meta: [
      { title: "Your Affiliate Program Dashboard — MzansiTalk" },
      {
        name: "description",
        content: "Track your MzansiTalk affiliate referrals, earnings and payouts.",
      },
      { property: "og:title", content: "Your Affiliate Program Dashboard — MzansiTalk" },
      {
        property: "og:description",
        content: "Track your MzansiTalk affiliate referrals, earnings and payouts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AffiliateDashboardPage,
});

function AffiliateDashboardPage() {
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: fetchMyProfile,
  });

  const username = profile?.username ?? "user";
  const link = `https://mzansitalk.co.za/ref/${username}`;

  // Dummy values — real counters will be wired up later.
  const referred = 0;
  const paid = 0;
  const earnings = 0;
  const canWithdraw = paid >= 3;
  const locked = !canWithdraw;

  const copyLink = () => {
    void navigator.clipboard.writeText(link);
    toast.success("Affiliate link copied");
  };

  return (
    <Screen title="Affiliate Dashboard">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h1 className="text-lg font-bold">Your Affiliate Program Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Share your link and earn 40% on every Premium signup.
          </p>
        </section>

        {locked ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
            App Locked. Pay R50 / 6 months OR get 3 paid referrals to unlock.
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">Your unique link</h2>
          <div className="mt-2 flex items-center gap-2">
            <p className="flex-1 break-all rounded-xl bg-secondary p-3 text-sm">{link}</p>
            <button
              type="button"
              onClick={copyLink}
              className="btn-base bg-secondary text-secondary-foreground"
            >
              <Copy className="size-4" /> Copy
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Referred</p>
              <p className="text-lg font-extrabold">{referred}</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-extrabold">{paid}/3</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Earnings</p>
              <p className="text-lg font-extrabold">R{earnings}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            40% = R20 per Premium (R50). Need 3 paid referrals to withdraw. Payout
            7-14 days. Single-level.
          </p>
          <button
            type="button"
            disabled={!canWithdraw}
            className="btn-base btn-gold mt-3 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Wallet className="size-4" />
            {canWithdraw ? "Withdraw" : "Need 3 paid referrals"}
          </button>
        </section>
      </div>
    </Screen>
  );
}
