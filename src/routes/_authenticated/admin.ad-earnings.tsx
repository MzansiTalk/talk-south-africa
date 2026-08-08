import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, ShieldAlert } from "lucide-react";

import { Screen } from "@/components/Shell";
import { fetchAdEarnings } from "@/lib/ads";
import { getMyEmail, OWNER_EMAIL } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/ad-earnings")({
  head: () => ({
    meta: [
      { title: "Ad Earnings — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk ad earnings: estimated ad revenue, impressions, eCPM and clicks from ExoClick pre-roll ads.",
      },
      { property: "og:title", content: "Ad Earnings — MzansiTalk Admin" },
      { property: "og:description", content: "Estimated ad revenue and impressions for MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdEarningsPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function AdEarningsPage() {
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;
  const earnings = useQuery({
    queryKey: ["ad-earnings"],
    queryFn: fetchAdEarnings,
    enabled: isOwner,
  });

  if (email.isLoading) {
    return (
      <Screen title="Ad Earnings">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="Ad Earnings">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  const data = earnings.data;

  return (
    <Screen title="Ad Earnings">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Estimated Ad Revenue" value={`R${(data?.revenue ?? 0).toFixed(2)}`} />
        <Stat label="Impressions" value={(data?.impressions ?? 0).toLocaleString()} />
        <Stat label="eCPM" value={`R${(data?.ecpm ?? 0).toFixed(2)}`} />
        <Stat label="Clicks" value={(data?.clicks ?? 0).toLocaleString()} />
        <div className="col-span-2">
          <Stat label="Click Through Rate" value={`${(data?.ctr ?? 0).toFixed(2)}%`} />
        </div>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">By Network</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.byNetwork ?? []).map((row) => (
            <li key={row.network} className="flex items-center justify-between rounded-xl bg-secondary/60 p-2">
              <span className="font-semibold capitalize">{row.network}</span>
              <span className="text-muted-foreground">
                {row.impressions.toLocaleString()} impressions · R{row.revenue.toFixed(2)}
              </span>
            </li>
          ))}
          {(data?.byNetwork ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No ad impressions yet this month.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">By Placement</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.byPlacement ?? []).map((row) => (
            <li key={row.placement} className="flex items-center justify-between rounded-xl bg-secondary/60 p-2">
              <span className="font-semibold">{row.placement.replaceAll("_", " ")}</span>
              <span className="text-muted-foreground">
                {row.impressions.toLocaleString()} impressions · R{row.revenue.toFixed(2)}
              </span>
            </li>
          ))}
          {(data?.byPlacement ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No ad impressions yet this month.</li>
          ) : null}
        </ul>
      </section>

      <p className="mt-4 rounded-2xl border border-gold/50 bg-gold/10 p-4 text-xs font-semibold">
        Actual payments are sent directly by ExoClick to the payout method linked in your ExoClick
        account. MzansiTalk does not handle ad payments. ExoClick is the only ad network used by this
        app.
      </p>

      <div className="mt-4 grid gap-2">
        <a
          href="https://admin.exoclick.com/"
          target="_blank"
          rel="noreferrer"
          className="btn-base bg-secondary text-secondary-foreground"
        >
          <ExternalLink className="size-4" /> Open ExoClick Dashboard
        </a>
      </div>
    </Screen>
  );
}
