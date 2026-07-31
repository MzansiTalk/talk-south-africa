import { useEffect } from "react";

import { logAdImpression, type AdPlacement } from "@/lib/api";

function useImpression(placement: AdPlacement) {
  useEffect(() => {
    void logAdImpression(placement).catch(() => undefined);
  }, [placement]);
}

/** Native ad automatically placed every 5 posts in the Home feed. */
export function NativeAd() {
  useImpression("home_native");
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sponsored · Advertisement
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        AdMob native ad slot. Live ads render on the mobile build using your AdMob Native Ad Unit ID.
      </p>
    </div>
  );
}

/** Video ad automatically placed after every 3 reels. */
export function VideoAd() {
  useImpression("reel_video");
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-black/80 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Video Advertisement</p>
      <p className="mt-1 px-6 text-sm text-muted-foreground">
        AdMob interstitial video plays here between reels.
      </p>
    </div>
  );
}

/** Sticky banner ad at the bottom of the Reels screen. */
export function BannerAd() {
  useImpression("reel_banner");
  return (
    <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      AdMob Banner Ad
    </div>
  );
}

/** Ad status card placed after every 4 user statuses. */
export function StatusAd() {
  useImpression("status_ad");
  return (
    <div className="rounded-2xl border border-dashed border-gold/60 bg-muted/50 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Ad Status</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Sponsored status slot between community statuses.
      </p>
    </div>
  );
}
