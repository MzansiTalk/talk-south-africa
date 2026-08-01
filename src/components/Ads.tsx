import { Gift, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  canShowInterstitial,
  logAdClick,
  logAdImpression,
  markInterstitialShown,
  useAds,
  type AdConfig,
  type AdNetwork,
  type AdPlacementSlot,
  type AdTarget,
} from "@/lib/ads";

/** Records the impression as soon as the ad renders and returns a click reporter. */
function useImpression(
  placement: AdPlacementSlot,
  network: AdNetwork = "admob",
  target: AdTarget = {},
) {
  const idRef = useRef<string | null>(null);
  const postId = target.postId ?? null;
  const contentKind = target.contentKind ?? null;
  const ownerId = target.ownerId ?? null;

  useEffect(() => {
    let cancelled = false;
    void logAdImpression(placement, network, { postId, contentKind, ownerId })
      .then((id) => {
        if (!cancelled) idRef.current = id;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [placement, network, postId, contentKind, ownerId]);

  return () => {
    if (idRef.current) void logAdClick(idRef.current).catch(() => undefined);
  };
}

type AdSlotKind = "banner" | "interstitial" | "rewarded" | "native";

/** The live AdMob unit id for a slot, when the Owner has saved one in the Money Center. */
function unitId(config: AdConfig, kind: AdSlotKind) {
  if (kind === "banner") return config.admob_banner_id;
  if (kind === "interstitial") return config.admob_interstitial_id;
  if (kind === "rewarded") return config.admob_rewarded_id;
  return config.admob_native_id;
}

type AdmobBridge = {
  showAd?: (options: { adUnitId: string; format: string; testMode: boolean }) => unknown;
};

/**
 * Requests the ad from the real AdMob SDK when the native bridge is present
 * (mobile build). On the web build the branded ad surface renders instead.
 * Ads always start on their own — the member is never asked for permission.
 */
function useAdmobRequest(config: AdConfig, kind: AdSlotKind, format: string) {
  const id = unitId(config, kind);
  useEffect(() => {
    if (!id) return;
    const bridge = (globalThis as { admob?: AdmobBridge }).admob;
    if (!bridge?.showAd) return;
    try {
      void bridge.showAd({ adUnitId: id, format, testMode: config.test_mode });
    } catch {
      // Native bridge unavailable — the in-app ad surface is shown instead.
    }
  }, [id, format, config.test_mode]);
  return id;
}

/** Autoplaying ad video surface with a mute/unmute control. Never asks permission. */
function AdVideoSurface({ label, unit }: { label: string; unit: string | null }) {
  const [muted, setMuted] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);

  const start = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
    void video.play().catch(() => {
      // Browsers block unmuted autoplay until the member interacts, so fall back to muted.
      video.muted = true;
      setMuted(true);
      void video.play().catch(() => undefined);
    });
  }, [muted]);

  useEffect(() => {
    start();
  }, [start]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-gold/50 bg-black">
      <video
        ref={ref}
        className="h-full w-full object-cover"
        autoPlay
        loop
        playsInline
        preload="auto"
        muted={muted}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{label}</p>
        <p className="text-sm text-muted-foreground">
          {unit ? "Playing your AdMob video ad." : "Add your AdMob unit ids in Owner Money Center."}
        </p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setMuted((value) => !value);
        }}
        aria-label={muted ? "Unmute ad" : "Mute ad"}
        className="absolute bottom-3 left-3 rounded-full bg-background/70 p-2 text-foreground"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  );
}

/** Native ad automatically placed every 5 posts in the Home feed. */
export function NativeAd({ target }: { target?: AdTarget }) {
  const { canShow, config } = useAds();
  const click = useImpression("home_native", "admob", target ?? {});
  const unit = useAdmobRequest(config, "native", "native");
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
        {unit
          ? "AdMob native ad. Tap to visit the advertiser."
          : "AdMob native ad slot. Add your Native Ad Unit ID in Owner Money Center."}
      </p>
    </button>
  );
}

/** Inline autoplaying video ad placed between reels and long videos. */
export function VideoAd({ target }: { target?: AdTarget }) {
  const { canShow, config } = useAds();
  const click = useImpression("reel_video", "admob", target ?? {});
  const unit = useAdmobRequest(config, "interstitial", "video");
  if (!canShow("interstitial")) return null;
  return (
    <div role="presentation" onClick={click}>
      <AdVideoSurface label="Video Advertisement" unit={unit} />
    </div>
  );
}

/** Sticky banner ad. Used at the bottom of the feed, profile, search and above comments. */
export function BannerAd({
  placement = "reel_banner",
  target,
}: {
  placement?: AdPlacementSlot;
  target?: AdTarget;
}) {
  const { canShow, config } = useAds();
  const click = useImpression(placement, "admob", target ?? {});
  const unit = useAdmobRequest(config, "banner", "banner");
  if (!canShow("banner")) return null;
  return (
    <button
      type="button"
      onClick={click}
      className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    >
      {unit ? "AdMob Banner Ad" : "AdMob Banner Slot"}
    </button>
  );
}

/** Small banner shown automatically above the comments of posts and reels. */
export function CommentsAd({ target }: { target?: AdTarget }) {
  const { canShow } = useAds();
  const click = useImpression("comments_banner", "admob", target ?? {});
  if (!canShow("banner")) return null;
  return (
    <button
      type="button"
      onClick={click}
      className="mb-3 flex h-12 w-full items-center justify-center rounded-xl border border-dashed border-gold/50 bg-muted/60 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      Sponsored · AdMob
    </button>
  );
}

/**
 * 5 second autoplaying ad inserted between status stories.
 * The skip button unlocks after 3 seconds; it closes itself after 5.
 */
export function StatusAd({ target, onDone }: { target?: AdTarget; onDone?: () => void }) {
  const { canShow, config } = useAds();
  const click = useImpression("status_ad", "admob", target ?? {});
  const unit = useAdmobRequest(config, "native", "status");
  const [seconds, setSeconds] = useState(5);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (seconds === 0) {
      setClosed(true);
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  if (!canShow("native") || closed) return null;

  return (
    <div className="rounded-2xl border border-gold/60 bg-card p-3">
      <div role="presentation" onClick={click}>
        <AdVideoSurface label="Ad Status" unit={unit} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Sponsored status · {seconds}s</span>
        <button
          type="button"
          disabled={seconds > 2}
          onClick={() => {
            setClosed(true);
            onDone?.();
          }}
          className="btn-base btn-primary px-3 py-1 text-[0.7rem] disabled:opacity-60"
        >
          {seconds > 2 ? `Skip in ${seconds - 2}s` : "Skip"}
        </button>
      </div>
    </div>
  );
}

/**
 * Full screen autoplaying interstitial. The skip button unlocks after 3 seconds.
 * Respects the 1-per-2-minutes frequency cap.
 */
export function InterstitialAd({
  onClose,
  target,
  placement = "reel_interstitial",
}: {
  onClose: () => void;
  target?: AdTarget;
  placement?: AdPlacementSlot;
}) {
  const [seconds, setSeconds] = useState(3);
  const { config } = useAds();
  const click = useImpression(placement, "admob", target ?? {});
  const unit = useAdmobRequest(config, "interstitial", "interstitial");

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
      <div className="mt-4 w-full max-w-sm" role="presentation" onClick={click}>
        <AdVideoSurface label="AdMob Interstitial" unit={unit} />
      </div>
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
 * Shows an interstitial after every 3rd reel or video the member watches,
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
          <div className="mt-4 w-full max-w-sm">
            <AdVideoSurface label="Rewarded Ad" unit={null} />
          </div>
          <p className="mt-6 text-sm font-semibold">Reward in {seconds}s</p>
        </div>
      ) : null}
    </>
  );
}
