import { Flag, Gift, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  canShowInterstitial,
  logAdClick,
  logAdImpression,
  markInterstitialShown,
  reportAd,
  useAds,
  type AdConfig,
  type AdPlacementSlot,
  type AdTarget,
} from "@/lib/ads";

/**
 * Meta Audience Network ad surfaces.
 *
 * Google AdMob has been removed from MzansiTalk completely — there is no AdMob
 * SDK, no AdMob unit id and no AdMob bridge left anywhere in the app. These are
 * Meta Audience Network placeholders that already log impressions, clicks and
 * ad reports, so switching them onto real Meta placements later is a drop-in.
 */

/** Records the impression as soon as the ad renders and returns a click reporter. */
function useImpression(placement: AdPlacementSlot, target: AdTarget = {}) {
  const idRef = useRef<string | null>(null);
  const postId = target.postId ?? null;
  const contentKind = target.contentKind ?? null;
  const ownerId = target.ownerId ?? null;

  useEffect(() => {
    let cancelled = false;
    void logAdImpression(placement, "meta", { postId, contentKind, ownerId })
      .then((id) => {
        if (!cancelled) idRef.current = id;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [placement, postId, contentKind, ownerId]);

  return () => {
    if (idRef.current) void logAdClick(idRef.current).catch(() => undefined);
  };
}

type AdSlotKind = "banner" | "interstitial" | "rewarded" | "native";

/** The Meta placement id for a slot, when the Owner has saved one in the Money Center. */
function placementId(config: AdConfig, kind: AdSlotKind) {
  // TODO: Replace with real Meta Placement ID
  if (kind === "banner" || kind === "native") return config.meta_banner_placement_id;
  if (kind === "rewarded") return config.meta_rewarded_placement_id;
  return config.meta_interstitial_placement_id;
}

/** Policy compliance: every Meta ad surface can be reported by the member. */
export function ReportAdButton({ placement }: { placement: AdPlacementSlot }) {
  const [sent, setSent] = useState(false);
  return (
    <button
      type="button"
      disabled={sent}
      onClick={(event) => {
        event.stopPropagation();
        setSent(true);
        void reportAd(placement, "Reported from ad surface")
          .then(() => toast.success("Thanks — this ad was reported for review."))
          .catch(() => undefined);
      }}
      className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-muted-foreground underline"
    >
      <Flag className="size-3" /> {sent ? "Ad reported" : "Report ad"}
    </button>
  );
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
          {unit
            ? "Playing your Meta Audience Network video ad."
            : "Add your Meta placement ids in Owner Money Center."}
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

/**
 * Meta Audience Network banner placeholder. Used on the Home feed, Reels,
 * profile and search. Renders nothing at all when banners are off, so the
 * content simply expands into the space — never an empty white box.
 */
export function MetaBannerAd({
  placement = "home_banner",
  target,
}: {
  placement?: AdPlacementSlot;
  target?: AdTarget;
}) {
  const { canShow, config } = useAds();
  const click = useImpression(placement, target ?? {});
  const unit = placementId(config, "banner");
  if (!canShow("banner")) return null;
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/60 p-2 text-center">
      <button
        type="button"
        onClick={click}
        className="flex h-12 w-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {unit ? "Meta Audience Network banner" : "Meta banner placement"}
      </button>
      <ReportAdButton placement={placement} />
    </div>
  );
}

/** Alias kept so every existing screen keeps working without changes. */
export const BannerAd = MetaBannerAd;

/** Native ad automatically placed every 5 posts in the Home feed. */
export function NativeAd({ target }: { target?: AdTarget }) {
  const { canShow, config } = useAds();
  const click = useImpression("home_native", target ?? {});
  const unit = placementId(config, "native");
  if (!canShow("native")) return null;
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center">
      <button type="button" onClick={click} className="w-full">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sponsored · Advertisement
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {unit
            ? "Meta Audience Network native ad. Tap to visit the advertiser."
            : "Meta native ad slot. Add your Meta placement id in Owner Money Center."}
        </p>
      </button>
      <div className="mt-2">
        <ReportAdButton placement="home_native" />
      </div>
    </div>
  );
}

/** Inline autoplaying video ad placed between reels and long videos. */
export function VideoAd({ target }: { target?: AdTarget }) {
  const { canShow, config } = useAds();
  const click = useImpression("reel_video", target ?? {});
  const unit = placementId(config, "interstitial");
  if (!canShow("interstitial")) return null;
  return (
    <div>
      <div role="presentation" onClick={click}>
        <AdVideoSurface label="Video Advertisement" unit={unit} />
      </div>
      <div className="mt-1 text-center">
        <ReportAdButton placement="reel_video" />
      </div>
    </div>
  );
}

/** Small banner shown automatically above the comments of posts and reels. */
export function CommentsAd({ target }: { target?: AdTarget }) {
  const { canShow } = useAds();
  const click = useImpression("comments_banner", target ?? {});
  if (!canShow("banner")) return null;
  return (
    <button
      type="button"
      onClick={click}
      className="mb-3 flex h-12 w-full items-center justify-center rounded-xl border border-dashed border-gold/50 bg-muted/60 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      Sponsored · Meta Audience Network
    </button>
  );
}

/**
 * 5 second autoplaying ad inserted between status stories.
 * The skip button unlocks after 3 seconds; it closes itself after 5.
 */
export function StatusAd({ target, onDone }: { target?: AdTarget; onDone?: () => void }) {
  const { canShow, config } = useAds();
  const click = useImpression("status_ad", target ?? {});
  const unit = placementId(config, "native");
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
        <div className="flex items-center gap-3">
          <ReportAdButton placement="status_ad" />
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
  const click = useImpression(placement, target ?? {});
  const unit = placementId(config, "interstitial");

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
        <AdVideoSurface label="Meta Interstitial" unit={unit} />
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
      <div className="mt-3">
        <ReportAdButton placement={placement} />
      </div>
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

/**
 * Meta Audience Network rewarded placeholder: watch a full ad to unlock a reward.
 * Used for "Watch ad to get 5 free coins" and for the 2x boost discount.
 */
export function MetaRewardedAd({
  onReward,
  rewarded,
  label = "Watch ad to get 5 free coins",
  rewardedLabel = "Reward unlocked.",
}: {
  onReward: () => void;
  rewarded: boolean;
  label?: string;
  rewardedLabel?: string;
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
          void logAdImpression("rewarded_boost", "meta").catch(() => undefined);
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
        {rewardedLabel}
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
        <Gift className="size-4 text-gold" /> {label}
      </button>
      {watching ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">Rewarded Ad</p>
          <div className="mt-4 w-full max-w-sm">
            <AdVideoSurface label="Rewarded Ad" unit={null} />
          </div>
          <p className="mt-6 text-sm font-semibold">Reward in {seconds}s</p>
          <div className="mt-3">
            <ReportAdButton placement="rewarded_boost" />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Boost checkout keeps its own reward wording. */
export function RewardedAdButton({
  onReward,
  rewarded,
}: {
  onReward: () => void;
  rewarded: boolean;
}) {
  return (
    <MetaRewardedAd
      onReward={onReward}
      rewarded={rewarded}
      label="Watch ad to get 2x boost discount"
      rewardedLabel="Reward unlocked: 2x boost discount applied to this boost."
    />
  );
}
