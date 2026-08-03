/**
 * Google Cloud Vision + Video Intelligence risk scoring (server only).
 *
 * Returns a 0-100 risk score plus the flags that produced it. Callers turn the
 * score into a moderation verdict (< 50 approved, >= 50 removed).
 */

const LIKELIHOOD_SCORE: Record<string, number> = {
  VERY_UNLIKELY: 0,
  UNLIKELY: 15,
  POSSIBLE: 55,
  LIKELY: 80,
  VERY_LIKELY: 97,
  LIKELIHOOD_UNSPECIFIED: 0,
  UNKNOWN: 0,
};

export type AiVerdict = { score: number; flags: string[]; provider: string };

async function fetchBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not read the uploaded file [${response.status}]`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/** Google Cloud Vision SAFE_SEARCH_DETECTION for photos. */
export async function scoreImage(url: string, apiKey: string): Promise<AiVerdict> {
  const content = await fetchBase64(url);
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          { image: { content }, features: [{ type: "SAFE_SEARCH_DETECTION" }] },
        ],
      }),
    },
  );
  const body = await response.text();
  if (!response.ok) {
    console.error(`Vision API failed [${response.status}]: ${body}`);
    throw new Error(`Vision API failed [${response.status}]: ${body}`);
  }
  const parsed = JSON.parse(body) as {
    responses?: { safeSearchAnnotation?: Record<string, string>; error?: { message: string } }[];
  };
  const first = parsed.responses?.[0];
  if (first?.error) throw new Error(`Vision API error: ${first.error.message}`);
  const annotation = first?.safeSearchAnnotation ?? {};

  let score = 0;
  const flags: string[] = [];
  for (const [key, likelihood] of Object.entries(annotation)) {
    const value = LIKELIHOOD_SCORE[likelihood] ?? 0;
    if (value >= 55) flags.push(`${key}:${likelihood.toLowerCase()}`);
    if (value > score) score = value;
  }
  return { score, flags, provider: "google-vision" };
}

/** Google Cloud Video Intelligence EXPLICIT_CONTENT_DETECTION for videos. */
export async function scoreVideo(url: string, apiKey: string): Promise<AiVerdict> {
  const inputContent = await fetchBase64(url);
  const start = await fetch(
    `https://videointelligence.googleapis.com/v1/videos:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputContent, features: ["EXPLICIT_CONTENT_DETECTION"] }),
    },
  );
  const startBody = await start.text();
  if (!start.ok) {
    console.error(`Video Intelligence API failed [${start.status}]: ${startBody}`);
    throw new Error(`Video Intelligence API failed [${start.status}]: ${startBody}`);
  }
  const { name } = JSON.parse(startBody) as { name?: string };
  if (!name) throw new Error("Video Intelligence API returned no operation name");

  // Long-running operation: poll for up to ~60s.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const poll = await fetch(
      `https://videointelligence.googleapis.com/v1/${name}?key=${encodeURIComponent(apiKey)}`,
    );
    const pollBody = await poll.text();
    if (!poll.ok) {
      console.error(`Video Intelligence poll failed [${poll.status}]: ${pollBody}`);
      throw new Error(`Video Intelligence poll failed [${poll.status}]: ${pollBody}`);
    }
    const parsed = JSON.parse(pollBody) as {
      done?: boolean;
      error?: { message: string };
      response?: {
        annotationResults?: {
          explicitAnnotation?: { frames?: { pornographyLikelihood?: string }[] };
        }[];
      };
    };
    if (parsed.error) throw new Error(`Video Intelligence error: ${parsed.error.message}`);
    if (!parsed.done) continue;

    const frames =
      parsed.response?.annotationResults?.[0]?.explicitAnnotation?.frames ?? [];
    let score = 0;
    for (const frame of frames) {
      const value = LIKELIHOOD_SCORE[frame.pornographyLikelihood ?? "UNKNOWN"] ?? 0;
      if (value > score) score = value;
    }
    const flags = score >= 55 ? ["explicit_video_frames"] : [];
    return { score, flags, provider: "google-video-intelligence" };
  }

  throw new Error("Video moderation timed out");
}
