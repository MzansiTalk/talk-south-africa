import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Screen } from "@/components/Shell";
import { getMyEmail, OWNER_EMAIL } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/ad-settings")({
  head: () => ({
    meta: [
      { title: "Ad Settings — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk ad settings for the ExoClick VAST pre-roll — the only ad network used by the app.",
      },
      { property: "og:title", content: "Ad Settings — MzansiTalk Admin" },
      { property: "og:description", content: "Owner-only ExoClick ad settings for MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdSettingsPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-secondary/60 p-3">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="break-all text-right text-xs font-bold">{value}</span>
    </div>
  );
}

function AdSettingsPage() {
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;

  if (email.isLoading) {
    return (
      <Screen title="Ad Settings">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="Ad Settings">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Ad Settings">
      <div className="rounded-2xl bg-destructive p-4 text-center text-sm font-bold text-destructive-foreground">
        WARNING: OWNER ONLY. These settings control every ad in MzansiTalk.
      </div>

      <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">ExoClick Pre-Roll</h2>
        <p className="text-xs text-muted-foreground">
          ExoClick VAST 3.0 in-stream video is the only ad network in MzansiTalk. There are no banner,
          interstitial, native or rewarded ads, and no Meta or Google AdMob code anywhere in the app.
        </p>
        <Row label="Ad network" value="ExoClick (VAST 3.0)" />
        <Row label="Ad type" value="In-stream video pre-roll" />
        <Row label="Surfaces" value="Reels · Videos · Status · Live" />
      </section>

      <p className="mt-4 rounded-2xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
        Ads are never shown on a member&apos;s own upload, never to the Owner account, never to banned
        members, and never beside content flagged by Auto-Mod. If the VAST tag fails to fill, the
        content plays immediately with no ad.
      </p>
    </Screen>
  );
}
