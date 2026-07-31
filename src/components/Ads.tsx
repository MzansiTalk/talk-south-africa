import { Gift, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  canShowInterstitial,
  logAdClick,
  logAdImpression,
  markInterstitialShown,
  useAds,
  type AdNetwork,
  type AdPlacementSlot,
} from "@/lib/ads";

function useImpression(placement: AdPlacementSlot, network: AdNetwork = "admob") {
  const idRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void logAdImpression(placement, network)
      .then((id) => {
        if (!cancelled) idRef.current = id;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [placement, network]);
  return () => {
    if (idRef.current) void logAdClick(idRef.current).catch(() => undefined);
  };
}

/** Native ad automatically placed every 5 posts in the Home feed. */
export function NativeAd() {
  const { canShow } = useAds();
  const click = useImpression("home_native");
  if (!canShow("native")) return null;
  return (
    <button
      type="button"
      onClick={click}
      className="w-full rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sponsored · Advertisement
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        AdMob native ad slot. Live ads render on the mobile build using your AdMob Native Ad Unit ID.
      </p>
    </button>
  );
}

/** Inline video ad automatically placed after every 3 reels. */
export function VideoAd() {
  const { canShow } = useAds();
  const click = useImpression("reel_video", "meta");
  if (!canShow("interstitial")) return null;
  return (
    <button
      type="button"
      onClick={click}
      className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-black/80 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Video Advertisement</p>
      <p className="mt-1 px-6 text-sm text-muted-foreground">
        Meta Audience Network video plays here between reels.
      </p>
    </button>
  );
}

/** Sticky banner ad. Used at the bottom of the feed, profile and search. */
export function BannerAd({ placement = "reel_banner" }: { placement?: AdPlacementSlot }) {
  const { canShow } = useAds();
  const click = useImpression(placement);
  if (!canShow("banner")) return null;
  return (
    <button
      type="button"
      onClick={click}
      className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    >
      AdMob Banner Ad
    </button>
  );
}

/** Ad status card placed after every 4 user statuses. */
export function StatusAd() {
  const { canShow } = useAds();
  const click = useImpression("status_ad");
  if (!canShow("native")) return null;
  return (
    <button
      type="button"
      onClick={click}
      className="w-full rounded-2xl border border-dashed border-gold/60 bg-muted/50 p-6 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Ad Status</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Sponsored status slot between community statuses.
      </p>
    </button>
  );
}

/**
 * Full screen interstitial with a 5 second countdown before the skip button unlocks.
 * Respects the 1-per-2-minutes frequency cap.
 */
export function InterstitialAd({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(5);
  const click = useImpression("reel_interstitial");

  useEffect(() => {
    markInterstitialShown();
    const timer = window.setInterval(() => {
      setSeconds((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">Advertisement</p>
      <button
        type="button"
        onClick={click}
        className="mt-4 flex aspect-video w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-dashed border-gold/50"
      >
        <p className="px-6 text-sm text-muted-foreground">
          AdMob interstitial video. Tap to visit the advertiser.
        </p>
      </button>
      <button
        type="button"
        disabled={seconds > 0}
        onClick={onClose}
        className="btn-base btn-primary mt-6 disabled:opacity-60"
      >
        {seconds > 0 ? `Skip in ${seconds}s` : "Skip Ad"}
        <X className="size-4" />
      </button>
    </div>
  );
}

/**
 * Shows an interstitial after every 3rd video the member watches,
 * capped at one interstitial per 2 minutes.
 */
export function useInterstitialAfterEvery(watched: number, every = 3) {
  const { canShow } = useAds();
  const [open, setOpen] = useState(false);
  const lastTriggered = useRef(0);

  useEffect(() => {
    if (!canShow("interstitial")) return;
    if (watched === 0 || watched % every !== 0) return;
    if (lastTriggered.current === watched) return;
    if (!canShowInterstitial()) return;
    lastTriggered.current = watched;
    setOpen(true);
  }, [watched, every, canShow]);

  return { open, close: () => setOpen(false) };
}

/** Optional rewarded ad: watch a full ad to unlock a 2x boost discount. */
export function RewardedAdButton({
  onReward,
  rewarded,
}: {
  onReward: () => void;
  rewarded: boolean;
}) {
  const { canShow } = useAds();
  const [watching, setWatching] = useState(false);
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setWatching(false);
          void logAdImpression("rewarded_boost").catch(() => undefined);
          onReward();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watching]);

  if (!canShow("rewarded")) return null;

  if (rewarded) {
    return (
      <p className="mt-3 rounded-xl border border-gold/50 bg-gold/10 p-3 text-xs font-semibold text-gold">
        Reward unlocked: 2x boost discount applied to this boost.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSeconds(5);
          setWatching(true);
        }}
        className="btn-base mt-3 w-full bg-secondary text-secondary-foreground"
      >
        <Gift className="size-4 text-gold" /> Watch ad to get 2x boost discount
      </button>
      {watching ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Rewarded Ad</p>
          <div className="mt-4 flex aspect-video w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-gold/50">
            <p className="px-6 text-sm text-muted-foreground">
              Watch the full ad to unlock your discount.
            </p>
          </div>
          <p className="mt-6 text-sm font-semibold">Reward in {seconds}s</p>
        </div>
      ) : null}
    </>
  );
}
