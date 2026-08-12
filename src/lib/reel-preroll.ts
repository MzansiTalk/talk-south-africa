import { fetchReelVast } from "@/lib/reel-preroll.functions";

/** HilltopAds VAST 3.0 in-stream tag used for the Reels pre-roll only. */
export const REEL_VAST_TAG =
  "https://faithfuloccasion.com/dmGF.zBd-GGNKvwZLGzUS/YePmf9/uWZ/UD1gkjPdTgcIzfMrTcQ/ykNyDJEBtTNUz/MtxONQDxf0/NuQ-";

/** Skip becomes available after 5 seconds. */
export const REEL_AD_SKIP_SECONDS = 5;

export type ReelAd = {
  mediaUrl: string;
  clickThrough: string | null;
  impressions: string[];
};

/** Unique value so the ad server and the browser never reuse a cached ad. */
function nonce() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function withNonce(url: string, key = "cb") {
  return url + (url.includes("?") ? "&" : "?") + `${key}=${nonce()}`;
}

function text(node: Element | null | undefined) {
  return (node?.textContent ?? "").trim();
}

/** Picks the highest-bitrate progressive MP4/WebM media file in the ad. */
function pickMedia(doc: Document) {
  const files = [...doc.querySelectorAll("MediaFile")]
    .map((node) => ({
      url: text(node),
      type: (node.getAttribute("type") ?? "").toLowerCase(),
      bitrate: Number(node.getAttribute("bitrate") ?? 0),
      delivery: (node.getAttribute("delivery") ?? "progressive").toLowerCase(),
    }))
    .filter((file) => file.url && file.delivery === "progressive" && file.type.startsWith("video/"))
    .sort((a, b) => b.bitrate - a.bitrate);
  return files[0]?.url ?? null;
}

/** Fetches the VAST document, following wrapper redirects (max 4 hops). */
async function loadVast(url: string, depth = 0): Promise<ReelAd | null> {
  if (depth > 4) return null;
  const { xml } = await fetchReelVast({ data: { url: withNonce(url) } });
  if (!xml) return null;

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return null;

  const impressions = [...doc.querySelectorAll("Impression")].map(text).filter(Boolean);

  const wrapper = text(doc.querySelector("VASTAdTagURI"));
  if (wrapper) {
    const nested = await loadVast(wrapper, depth + 1);
    return nested ? { ...nested, impressions: [...impressions, ...nested.impressions] } : null;
  }

  const media = pickMedia(doc);
  if (!media) return null;

  return {
    mediaUrl: withNonce(media, "mzcb"),
    clickThrough: text(doc.querySelector("ClickThrough")) || null,
    impressions,
  };
}

/** Loads a fresh ad for a single reel play. Returns null when there is no fill. */
export async function loadReelAd(): Promise<ReelAd | null> {
  try {
    return await loadVast(REEL_VAST_TAG);
  } catch {
    return null;
  }
}

/** Fire-and-forget tracking pixels. */
export function trackReelAd(urls: string[]) {
  for (const url of urls) {
    try {
      const image = new Image();
      image.src = withNonce(url, "t");
    } catch {
      // tracking must never break playback
    }
  }
}

/** Stops every other video so the ad and the reel are the only audio source. */
export function pauseAllVideos() {
  if (typeof document === "undefined") return;
  for (const video of [...document.querySelectorAll("video")]) {
    try {
      video.muted = true;
      video.pause();
    } catch {
      // ignore detached nodes
    }
  }
}
