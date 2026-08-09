import { useQuery } from "@tanstack/react-query";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PreRollAd } from "@/components/PreRollAd";
import { signedUrl } from "@/lib/api";
import { pauseAllVideos, shouldShowPreRoll } from "@/lib/preroll";


export function useMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["media", path],
    queryFn: () => (path ? signedUrl(path) : Promise.resolve(null)),
    enabled: Boolean(path),
    staleTime: 45 * 60 * 1000,
  });
}

type Props = {
  path: string | null;
  type: string | null;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  /** Uploader of the content: members never get a pre-roll on their own upload. */
  ownerId?: string | null;
  postId?: string | null;
  contentKind?: string | null;
};

/**
 * Plays a video only while it is on screen AND the app/tab is in the foreground.
 * Leaving the video (scroll away, app backgrounded, navigation) pauses and rewinds it,
 * so it replays from the start when the viewer returns.
 */
function useViewportPlayback(
  enabled: boolean,
  autoPlay: boolean,
  muted: boolean,
  onAutoplayBlocked: () => void,
) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const visibleRef = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const sync = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    const shouldPlay =
      autoPlay && visibleRef.current && typeof document !== "undefined" && !document.hidden;
    video.muted = mutedRef.current;
    if (shouldPlay) {
      void video.play().catch(() => {
        // Browsers block unmuted autoplay until the user interacts with the page.
        if (!mutedRef.current) {
          onAutoplayBlocked();
          video.muted = true;
          void video.play().catch(() => undefined);
        }
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [autoPlay, onAutoplayBlocked]);

  useEffect(() => {
    sync();
  }, [muted, sync]);

  useEffect(() => {
    const video = ref.current;
    if (!enabled || !video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleRef.current = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        }
        sync();
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(video);

    const onHidden = () => sync();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onHidden);
    window.addEventListener("focus", onHidden);
    window.addEventListener("pagehide", onHidden);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onHidden);
      window.removeEventListener("focus", onHidden);
      window.removeEventListener("pagehide", onHidden);
      video.pause();
    };
  }, [enabled, sync]);

  return ref;
}

export function SignedMedia({
  path,
  type,
  className,
  autoPlay = true,
  loop = false,
  ownerId,
  postId,
  contentKind,
}: Props) {
  const { data: url } = useMediaUrl(path);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const isVideo = type === "video";
  const onAutoplayBlocked = useCallback(() => setMuted(true), []);

  // ExoClick pre-roll runs ONLY on an intentional click, every single click.
  // Auto-play while scrolling never triggers an ad.
  const [showAd, setShowAd] = useState(false);
  // Bumped on every play/replay so the ad component is destroyed and rebuilt from scratch.
  const [adKey, setAdKey] = useState(0);
  const pendingFullscreen = useRef(false);

  const videoRef = useViewportPlayback(
    Boolean(url) && isVideo && !fullscreen && !showAd,
    autoPlay && !showAd,
    muted,
    onAutoplayBlocked,
  );

  const openFullscreen = () => {
    if (showAd) return;
    pauseAllVideos();
    pendingFullscreen.current = true;
    void shouldShowPreRoll(ownerId).then((show) => {
      if (show) {
        setAdKey((value) => value + 1);
        setShowAd(true);
        return;
      }
      pendingFullscreen.current = false;
      setFullscreen(true);
    });
  };

  const finishAd = useCallback(() => {
    setShowAd(false);
    if (pendingFullscreen.current) {
      pendingFullscreen.current = false;
      setFullscreen(true);
    }
  }, []);

  if (!path) return null;

  if (!url) {
    return <div className={`animate-pulse bg-muted ${className ?? "aspect-square w-full"}`} />;
  }

  const media = isVideo ? (
    <video
      ref={videoRef}
      src={url}
      className={className ?? "h-full w-full object-cover"}
      loop={loop}
      muted={muted}
      playsInline
      preload="metadata"
      controls={fullscreen}
    />
  ) : (
    <img
      src={url}
      alt="MzansiTalk media"
      loading="lazy"
      className={className ?? "h-full w-full object-cover"}
    />
  );

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={openFullscreen}
          className="relative block w-full cursor-zoom-in"
          aria-label="Open in full screen"
        >
          {media}
          {isVideo ? (
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/70 p-2 text-foreground">
              <Play className="size-4" />
            </span>
          ) : null}
        </button>
        {showAd ? (
          <PreRollAd
            key={adKey}
            target={{
              ...(postId ? { postId } : {}),
              ...(contentKind ? { contentKind } : {}),
              ...(ownerId ? { ownerId } : {}),
            }}
            onDone={finishAd}
          />
        ) : null}
        {isVideo && !showAd ? (
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="absolute bottom-3 left-3 rounded-full bg-background/70 p-2 text-foreground"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        ) : null}
      </div>


      {fullscreen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-2 backdrop-blur"
          onClick={() => setFullscreen(false)}
        >
          {isVideo ? (
            <video
              src={url}
              className="max-h-full max-w-full"
              autoPlay
              controls
              playsInline
              onEnded={(event) => {
                // Replay counts as a new intentional play: fresh ad first.
                event.currentTarget.pause();
                setFullscreen(false);
                openFullscreen();
              }}
            />
          ) : (
            <img src={url} alt="MzansiTalk media full screen" className="max-h-full max-w-full" />
          )}
          <button
            type="button"
            className="btn-base btn-gold absolute right-4 top-4"
            onClick={() => setFullscreen(false)}
          >
            Close
          </button>
        </div>
      ) : null}
    </>
  );
}

export function Avatar({
  path,
  name,
  size = 40,
}: {
  path: string | null | undefined;
  name: string;
  size?: number;
}) {
  const { data: url } = useMediaUrl(path);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-semibold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
