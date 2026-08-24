import { useEffect, useRef, useState } from "react";

import { fetchPreroll } from "@/lib/vast.functions";
import { pauseAllVideos } from "@/lib/video-focus";

const SKIP_AFTER = 5;

/**
 * TrafficStars VAST pre-roll. Plays once with sound on, shows an "Ad" label,
 * a countdown and a Skip button after 5 seconds. Any failure or no-fill calls
 * onDone straight away so the user is never blocked.
 */
export function PrerollAd({ onDone }: { onDone: () => void }) {
  const [creative, setCreative] = useState<{ mediaUrl: string; clickThrough: string | null } | null>(
    null,
  );
  const [remaining, setRemaining] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  useEffect(() => {
    let cancelled = false;
    pauseAllVideos();
    const timeout = window.setTimeout(() => {
      if (!cancelled) finish();
    }, 8000);

    void fetchPreroll()
      .then((ad) => {
        window.clearTimeout(timeout);
        if (cancelled) return;
        if (!ad?.mediaUrl) {
          finish();
          return;
        }
        setCreative({ mediaUrl: ad.mediaUrl, clickThrough: ad.clickThrough ?? null });
      })
      .catch(() => {
        window.clearTimeout(timeout);
        if (!cancelled) finish();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!creative || !video) return;
    video.muted = false;
    video.volume = 1;
    void video.play().catch(() => {
      // Unmuted autoplay can be blocked before any gesture: fall back to muted.
      video.muted = true;
      void video.play().catch(() => finish());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creative]);

  if (!creative) return null;

  const canSkip = elapsed >= SKIP_AFTER;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={creative.mediaUrl}
        className="max-h-full max-w-full"
        playsInline
        onTimeUpdate={(event) => {
          const node = event.currentTarget;
          setElapsed(Math.floor(node.currentTime));
          if (Number.isFinite(node.duration) && node.duration > 0) {
            setRemaining(Math.max(0, Math.ceil(node.duration - node.currentTime)));
          }
        }}
        onEnded={finish}
        onError={finish}
        onClick={() => {
          if (creative.clickThrough) window.open(creative.clickThrough, "_blank", "noopener");
        }}
      />

      <span className="absolute left-4 top-4 rounded-md bg-background/80 px-2 py-1 text-xs font-bold uppercase tracking-wide text-foreground">
        Ad{remaining !== null ? ` · ${remaining}s` : ""}
      </span>

      <button
        type="button"
        onClick={finish}
        disabled={!canSkip}
        className="btn-base absolute right-4 top-4 border border-border bg-secondary px-3 py-1.5 text-sm font-bold text-secondary-foreground disabled:opacity-60"
      >
        {canSkip ? "Skip Ad" : `Skip in ${Math.max(0, SKIP_AFTER - elapsed)}s`}
      </button>
    </div>
  );
}
