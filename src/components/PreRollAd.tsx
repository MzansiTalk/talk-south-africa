import { useEffect, useRef, useState } from "react";

import { logAdImpression } from "@/lib/ads";
import type { AdTarget } from "@/lib/ads";
import {
  firePixels,
  loadVastCreative,
  PREROLL_POST_AD_DELAY_MS,
  PREROLL_SKIP_AFTER_SECONDS,
  type VastCreative,
} from "@/lib/preroll";

type Props = {
  target?: AdTarget;
  /** Called when the ad finishes, is skipped, fails or cannot be loaded. */
  onDone: () => void;
};

/**
 * 5 second skippable ExoClick VAST pre-roll shown over the content.
 * Any failure (no fill, CORS, blocked playback) closes immediately so the
 * member always gets to the content.
 */
export function PreRollAd({ target, onDone }: Props) {
  const [creative, setCreative] = useState<VastCreative | null>(null);
  const [remaining, setRemaining] = useState(PREROLL_SKIP_AFTER_SECONDS);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    const controller = new AbortController();
    let timeout = 0;
    // Never let a slow ad server hold the content hostage.
    timeout = window.setTimeout(finish, 12_000);
    void loadVastCreative(controller.signal).then((result) => {
      window.clearTimeout(timeout);
      if (controller.signal.aborted) return;
      if (!result) {
        finish();
        return;
      }
      setCreative(result);
      firePixels(result.impressionUrls);
      void logAdImpression("preroll_video", "exoclick", target ?? {}).catch(() => undefined);
    });
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!creative) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [creative]);

  if (!creative) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90">
        <span className="text-xs text-white/70">Loading ad…</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={creative.mediaUrl}
        className="h-full w-full object-contain"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        onClick={() => {
          if (!creative.clickThrough) return;
          firePixels(creative.clickTrackingUrls);
          window.open(creative.clickThrough, "_blank", "noopener,noreferrer");
        }}
      />
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white">
        Ad
      </span>
      {remaining > 0 ? (
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          Skip in {remaining}s
        </span>
      ) : (
        <button
          type="button"
          onClick={finish}
          className="absolute bottom-3 right-3 rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-black"
        >
          Skip Ad
        </button>
      )}
    </div>
  );
}
