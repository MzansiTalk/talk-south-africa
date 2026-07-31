import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, ExternalLink, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { Screen } from "@/components/Shell";
import { fetchEarnings, getMyEmail, OWNER_EMAIL } from "@/lib/api";

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}


export const Route = createFileRoute("/_authenticated/admin/earnings")({
  head: () => ({
    meta: [
      { title: "MzansiTalk Earnings — Admin" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk earnings dashboard: monthly ad revenue, boost revenue, impressions and a 30 day graph.",
      },
      { property: "og:title", content: "MzansiTalk Earnings — Admin" },
      { property: "og:description", content: "Ad and boost revenue for MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EarningsPage,
});

function EarningsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });

  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;
  const earnings = useQuery({ queryKey: ["earnings"], queryFn: fetchEarnings, enabled: isOwner });

  if (email.isLoading) {
    return (
      <Screen title="MzansiTalk Earnings">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="MzansiTalk Earnings">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  const days = earnings.data?.days ?? [];
  const total = (earnings.data?.adRevenue ?? 0) + (earnings.data?.boostRevenue ?? 0);
  const creatorPayouts = total * 0.8;
  const platformShare = total * 0.2;

  const buckets =
    period === "daily"
      ? days
      : period === "weekly"
        ? chunk(days, 7).map((group) => ({
            day: group[0]?.day ?? "",
            total: group.reduce((sum, row) => sum + row.total, 0),
          }))
        : [
            {
              day: "Last 30 days",
              total: days.reduce((sum, row) => sum + row.total, 0),
            },
          ];
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.total));

  return (
    <Screen title="MzansiTalk Earnings">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ad Revenue This Month</p>
          <p className="mt-1 font-display text-xl font-bold">
            R{(earnings.data?.adRevenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Boost Revenue This Month</p>
          <p className="mt-1 font-display text-xl font-bold">
            R{(earnings.data?.boostRevenue ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Creator Payouts (80%)</p>
          <p className="mt-1 font-display text-xl font-bold text-gold">
            R{creatorPayouts.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">MzansiTalk Share (20%)</p>
          <p className="mt-1 font-display text-xl font-bold">R{platformShare.toFixed(2)}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Ad Impressions This Month</p>
          <p className="mt-1 font-display text-xl font-bold">
            {(earnings.data?.impressions ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-3 text-xs">
        <p className="font-bold uppercase tracking-wide">Revenue Split</p>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-4/5 bg-gold-gradient" />
          <div className="h-full w-1/5 bg-primary" />
        </div>
        <p className="mt-2 text-muted-foreground">80% Creator · 20% MzansiTalk</p>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <BarChart3 className="size-4 text-gold" /> Earnings Graph
          </h2>
          <div className="flex gap-1">
            {(["daily", "weekly", "monthly"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                className={`btn-base px-2 py-1 text-[0.7rem] capitalize ${
                  period === option ? "btn-primary" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex h-40 items-end gap-1">
          {buckets.map((bucket) => (
            <div
              key={bucket.day}
              title={`${bucket.day}: R${bucket.total.toFixed(2)}`}
              className="flex-1 rounded-t bg-gold-gradient"
              style={{ height: `${Math.max(4, (bucket.total / peak) * 100)}%` }}
            />
          ))}
        </div>
      </section>


      <div className="mt-4 grid gap-2">
        <a
          href="https://apps.admob.com"
          target="_blank"
          rel="noreferrer"
          className="btn-base btn-primary"
        >
          <ExternalLink className="size-4" /> Open My AdMob Account
        </a>
        <a
          href="https://dashboard.paystack.com"
          target="_blank"
          rel="noreferrer"
          className="btn-base bg-secondary text-secondary-foreground"
        >
          <ExternalLink className="size-4" /> Open My Paystack Account
        </a>
      </div>
    </Screen>
  );
}
