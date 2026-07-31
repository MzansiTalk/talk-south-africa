import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useState } from "react";

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

export function SignedMedia({ path, type, className, autoPlay = true, loop = false }: Props) {
  const { data: url } = useMediaUrl(path);
  const [fullscreen, setFullscreen] = useState(false);

  if (!path) return null;

  if (!url) {
    return <div className={`animate-pulse bg-muted ${className ?? "aspect-square w-full"}`} />;
  }

  const isVideo = type === "video";

  const media = isVideo ? (
    <video
      src={url}
      className={className ?? "h-full w-full object-cover"}
      autoPlay={autoPlay}
      loop={loop}
      playsInline
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
