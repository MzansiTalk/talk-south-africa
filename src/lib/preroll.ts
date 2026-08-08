/**
 * ExoClick VAST 3.0 pre-roll support for MzansiTalk.
 *
 * A 5 second skippable in-stream video ad plays before a member watches a reel,
 * a long video or a status. Rules that never change:
 *  - never on the member's own upload
 *  - at most one ad per 3 pieces of content
 *  - any VAST failure silently plays the content instead (never crashes)
 */

import { getCurrentUserId } from "@/lib/api";

export const VAST_TAG_URL = "https://s.magsrv.com/v1/vast.php?idz=5998094";

/** Ad is skippable once this many seconds of the ad have played. */
export const PREROLL_SKIP_AFTER_SECONDS = 5;

/** One pre-roll for every N pieces of content watched. */
export const PREROLL_EVERY_N_CONTENT = 3;

const COUNTER_KEY = "mzansitalk:preroll-content-count";

function readCounter() {
  try {
    return Number(window.localStorage.getItem(COUNTER_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function writeCounter(value: number) {
  try {
    window.localStorage.setItem(COUNTER_KEY, String(value));
  } catch {
    // Private mode / webview storage blocked: fall back to no capping state.
  }
}

/**
 * Decides whether this piece of content gets a pre-roll, and counts it.
 * Returns false for the member's own content and for 2 out of every 3 items.
 */
export async function shouldShowPreRoll(ownerId: string | null | undefined) {
  if (typeof window === "undefined") return false;
  try {
    const userId = await getCurrentUserId();
    if (userId && ownerId && userId === ownerId) return false;
  } catch {
    // Session lookup failure must never block playback.
  }
  const next = readCounter() + 1;
  writeCounter(next);
  return next % PREROLL_EVERY_N_CONTENT === 1;
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

/** Loads the ExoClick VAST tag. Resolves null whenever no ad can be played. */
export async function loadVastCreative(
  signal?: AbortSignal,
  tagUrl: string = VAST_TAG_URL,
  depth = 0,
): Promise<VastCreative | null> {
  if (depth > 2) return null;
  try {
    const separator = tagUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${tagUrl}${separator}cb=${Date.now()}`, {
      ...(signal ? { signal } : {}),
      credentials: "omit",
    });
    if (!response.ok) return null;
    const xml = await response.text();
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
