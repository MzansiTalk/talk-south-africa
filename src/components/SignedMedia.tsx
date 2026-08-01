import { useQuery } from "@tanstack/react-query";
import { Play, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { signedUrl } from "@/lib/api";


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
};

/**
 * Plays a video only while it is on screen AND the app/tab is in the foreground.
 * Leaving the video (scroll away, app backgrounded, navigation) pauses and rewinds it,
 * so it replays from the start when the viewer returns.
 */
function useViewportPlayback(enabled: boolean, autoPlay: boolean) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const visibleRef = useRef(false);

  const sync = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    const shouldPlay =
      autoPlay && visibleRef.current && typeof document !== "undefined" && !document.hidden;
    if (shouldPlay) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [autoPlay]);

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

export function SignedMedia({ path, type, className, autoPlay = true, loop = false }: Props) {
  const { data: url } = useMediaUrl(path);
  const [fullscreen, setFullscreen] = useState(false);
  const isVideo = type === "video";
  const videoRef = useViewportPlayback(Boolean(url) && isVideo && !fullscreen, autoPlay);

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
      muted
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
      <button
        type="button"
        onClick={() => setFullscreen(true)}
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
              loop
              controls
              playsInline
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
