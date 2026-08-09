/**
 * ExoClick VAST 3.0 pre-roll support for MzansiTalk.
 *
 * A skippable in-stream video ad plays before EVERY reel, long video, status
 * and before a live stream starts. The ad is skippable after 5 seconds.
 * Any VAST failure silently plays the content instead (never crashes).
 */

import { fetchVastXml } from "@/lib/preroll.functions";

export const VAST_TAG_URL = "https://s.magsrv.com/v1/vast.php?idz=5998148";

/** Ad is skippable once this many seconds of the ad have played. */
export const PREROLL_SKIP_AFTER_SECONDS = 5;

/** Pre-roll runs on every intentional click (no frequency cap). */
export const PREROLL_EVERY_N_CONTENT = 1;

/** Pre-roll plays on every intentional click to watch, with no exceptions. */
export async function shouldShowPreRoll(_ownerId?: string | null | undefined) {
  if (typeof window === "undefined") return false;
  return true;
}

/**
 * Stops every video currently playing on the page (feed / reels / status previews)
 * so only the clicked content (or its pre-roll) has audio.
 */
export function pauseAllVideos() {
  if (typeof document === "undefined") return;
  for (const video of Array.from(document.querySelectorAll("video"))) {
    try {
      video.muted = true;
      video.pause();
    } catch {
      // Ignore videos that are mid-teardown.
    }
  }
}


export type VastCreative = {
  mediaUrl: string;
  clickThrough: string | null;
  impressionUrls: string[];
  clickTrackingUrls: string[];
};

function pickMediaFile(doc: Document) {
  const files = Array.from(doc.querySelectorAll("MediaFile"));
  const playable = files
    .map((node) => ({
      url: (node.textContent ?? "").trim(),
      type: (node.getAttribute("type") ?? "").toLowerCase(),
      width: Number(node.getAttribute("width") ?? "0") || 0,
    }))
    .filter((file) => file.url && file.type.startsWith("video/"));
  // Prefer mp4 (the only format every Android / iOS webview plays).
  const mp4 = playable.filter((file) => file.type.includes("mp4"));
  const pool = mp4.length > 0 ? mp4 : playable;
  return pool.sort((a, b) => a.width - b.width)[0]?.url ?? null;
}

function textList(doc: Document, selector: string) {
  return Array.from(doc.querySelectorAll(selector))
    .map((node) => (node.textContent ?? "").trim())
    .filter(Boolean);
}

/** Loads the ExoClick VAST tag through the server proxy. Resolves null when no ad can play. */
export async function loadVastCreative(
  signal?: AbortSignal,
  tagUrl: string = VAST_TAG_URL,
  depth = 0,
): Promise<VastCreative | null> {
  if (depth > 2) return null;
  try {
    const separator = tagUrl.includes("?") ? "&" : "?";
    const result = await fetchVastXml({ data: { url: `${tagUrl}${separator}cb=${Date.now()}` } });
    if (signal?.aborted) return null;
    const xml = result?.xml ?? "";
    if (!xml.trim()) return null;
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.querySelector("parsererror")) return null;


    const wrapper = (doc.querySelector("VASTAdTagURI")?.textContent ?? "").trim();
    if (wrapper && !doc.querySelector("MediaFile")) {
      return loadVastCreative(signal, wrapper, depth + 1);
    }

    const mediaUrl = pickMediaFile(doc);
    if (!mediaUrl) return null;

    return {
      mediaUrl,
      clickThrough: (doc.querySelector("ClickThrough")?.textContent ?? "").trim() || null,
      impressionUrls: textList(doc, "Impression"),
      clickTrackingUrls: textList(doc, "ClickTracking"),
    };
  } catch {
    return null;
  }
}

/** Fires VAST tracking pixels without letting a blocked request surface an error. */
export function firePixels(urls: string[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    try {
      const image = new Image();
      image.referrerPolicy = "no-referrer-when-downgrade";
      image.src = url;
    } catch {
      // Ignore blocked pixels.
    }
  }
}
