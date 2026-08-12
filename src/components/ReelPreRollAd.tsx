import { useEffect, useRef, useState } from "react";

import { loadReelAd, REEL_AD_SKIP_SECONDS, trackReelAd, type ReelAd } from "@/lib/reel-preroll";

/**
 * Full screen skippable VAST pre-roll shown before a reel starts.
 * Any failure (no fill, blocked media, timeout) calls onDone immediately so the
 * reel always plays.
 */
export function ReelPreRollAd({ onDone }: { onDone: () => void }) {
  const [ad, setAd] = useState<ReelAd | null>(null);
  const [remaining, setRemaining] = useState(REEL_AD_SKIP_SECONDS);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(finish, 12_000);

    void loadReelAd().then((result) => {
      if (cancelled) return;
      if (!result) {
        finish();
        return;
      }
      setAd(result);
      trackReelAd(result.impressions);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ad) return;
    const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [ad]);

  if (!ad) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 text-sm text-muted-foreground">
        Loading ad…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-2">
      <video
        ref={videoRef}
        src={ad.mediaUrl}
        className="max-h-full w-full max-w-3xl object-contain"
        autoPlay
        playsInline
        controls={false}
        onEnded={finish}
        onError={finish}
      />

      <span className="absolute left-3 top-3 rounded bg-background/80 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-foreground">
        Ad
      </span>

      {ad.clickThrough ? (
        <a
          href={ad.clickThrough}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 left-3 rounded bg-background/80 px-3 py-1.5 text-xs font-semibold text-foreground"
        >
          Learn more
        </a>
      ) : null}

      {remaining > 0 ? (
        <span className="absolute right-3 top-3 rounded bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          Skip in {remaining}s
        </span>
      ) : (
        <button
          type="button"
          onClick={finish}
          className="btn-base btn-gold absolute right-3 top-3 py-1.5 text-xs"
        >
          Skip ad
        </button>
      )}
    </div>
  );
}
