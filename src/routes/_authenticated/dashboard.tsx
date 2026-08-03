import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Coins, Eye, Gift, MousePointerClick, Rocket, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MetaRewardedAd } from "@/components/Ads";
import { Screen } from "@/components/Shell";
import { formatCount } from "@/components/MediaGrid";
import { fetchMyBoosts } from "@/lib/api";
import { fetchMyEarnings } from "@/lib/live";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — MzansiTalk" },
      {
        name: "description",
        content:
          "Your MzansiTalk earnings dashboard: ad views, clicks, boost spend, coins and your 20% share ready to request as a payout.",
      },
      { property: "og:title", content: "My Dashboard — MzansiTalk" },
      { property: "og:description", content: "Track your own MzansiTalk earnings share." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const money = (value: number) => `R${value.toFixed(2)}`;

function DashboardPage() {
  const earnings = useQuery({ queryKey: ["my-earnings"], queryFn: fetchMyEarnings });
  const boosts = useQuery({ queryKey: ["my-boosts"], queryFn: fetchMyBoosts });
  const wallet = useQuery({ queryKey: ["entitlements"], queryFn: fetchEntitlements });
  const coins = wallet.data?.coins ?? 0;
  const data = earnings.data;

  const boostSpend = (boosts.data ?? [])
    .filter((row) => row.status !== "refunded")
    .reduce((sum, row) => sum + Number(row.amount), 0);



  return (
    <Screen title="My Dashboard">
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Wallet className="size-4" /> Your earnings (your 20% share)
        </p>
        <p className="mt-2 font-display text-3xl font-bold text-gold">
          {money(data?.total ?? 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          You keep 20% of what your content earns. Only your own share is shown here.
        </p>

        {data && !data.approved ? (
          <p className="mt-3 rounded-xl border border-border bg-secondary p-3 text-xs text-muted-foreground">
            Monetization is not approved yet. You can keep posting — earnings start counting once the
            Owner approves your account.
          </p>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-green-600">
            <BadgeCheck className="size-4" /> Monetization approved
          </p>
        )}
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="size-3.5" /> Ad views
          </p>
          <p className="mt-1 text-xl font-bold">{formatCount(data?.impressions ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointerClick className="size-3.5" /> Ad clicks
          </p>
          <p className="mt-1 text-xl font-bold">{formatCount(data?.clicks ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">From ads</p>
          <p className="mt-1 text-xl font-bold">{money(data?.ad_share ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Rocket className="size-3.5" /> From boosts
          </p>
          <p className="mt-1 text-xl font-bold">{money(data?.boost_share ?? 0)}</p>
        </div>
      </div>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">In-App Purchases</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Rocket className="size-3.5" /> Total boost revenue
            </p>
            <p className="mt-1 text-lg font-bold">{money(boostSpend)}</p>
          </div>
          <div className="rounded-xl bg-secondary/60 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coins className="size-3.5" /> Coins bought
            </p>
            <p className="mt-1 text-lg font-bold">{formatCount(coins)}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-secondary/60 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="size-3.5" /> Spent on gifts
            </p>
            <p className="mt-1 text-lg font-bold">{money(0)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Coin packs and premium are sold through in-app purchases (Boost Live R50, Coins 100, Premium
          Monthly R29). Ads are served by Meta Audience Network — Google AdMob is no longer used.
        </p>
        <MetaRewardedAd
          onReward={() => {
            setCoins((current) => current + 5);
            toast.success("You earned 5 free coins.");
          }}
          rewarded={false}
          label="Watch ad to get 5 free coins"
        />
      </section>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm">
          Already paid out: <span className="font-bold">{money(data?.paid_out ?? 0)}</span>
        </p>
        <Link to="/creator-program" className="btn-base btn-primary mt-3 w-full">
          Request a payout
        </Link>
      </section>

    </Screen>
  );
}
