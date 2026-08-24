const VAST_URL = "https://runative-syndicate.com/do2/c370d83d8c654bafa41a5263785fefa1/vast?";
const SPOT_ID = "5178824";

export type PrerollCreative = {
  mediaUrl: string;
  clickThrough: string | null;
  impressions: string[];
};

function tags(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) out.push((match[1] ?? "").trim());
  return out;
}

function clean(value: string) {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}

function pickMedia(xml: string): string | null {
  const re = /<MediaFile\b([^>]*)>([\s\S]*?)<\/MediaFile>/gi;
  let best: { url: string; bitrate: number } | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const attrs = match[1] ?? "";
    const url = clean(match[2] ?? "");
    if (!url) continue;
    const type = /type\s*=\s*"([^"]+)"/i.exec(attrs)?.[1] ?? "";
    if (type && !/mp4|webm|ogg/i.test(type)) continue;
    const bitrate = Number(/bitrate\s*=\s*"(\d+)"/i.exec(attrs)?.[1] ?? "0");
    if (!best || bitrate > best.bitrate) best = { url, bitrate };
  }
  return best?.url ?? null;
}

async function load(url: string, depth = 0): Promise<PrerollCreative | null> {
  if (depth > 3) return null;
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/xml,text/xml,*/*" },
  });
  if (!response.ok) return null;
  const xml = await response.text();

  const wrapper = tags(xml, "VASTAdTagURI").map(clean).find(Boolean);
  if (wrapper) return load(wrapper, depth + 1);

  const mediaUrl = pickMedia(xml);
  if (!mediaUrl) return null;

  return {
    mediaUrl,
    clickThrough: tags(xml, "ClickThrough").map(clean).find(Boolean) ?? null,
    impressions: tags(xml, "Impression").map(clean).filter(Boolean),
  };
}

/** Requests a fresh TrafficStars pre-roll creative; returns null on no-fill or error. */
export async function getPrerollCreative(): Promise<PrerollCreative | null> {
  const separator = VAST_URL.endsWith("?") || VAST_URL.endsWith("&") ? "" : "&";
  const url = `${VAST_URL}${separator}spot_id=${SPOT_ID}&cb=${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  try {
    return await load(url);
  } catch {
    return null;
  }
}
