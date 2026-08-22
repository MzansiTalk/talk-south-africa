import { createServerFn } from "@tanstack/react-start";

export type { PublicVideo } from "@/lib/public-videos.server";

/** Public video wall for guests — no session required. */
export const fetchPublicVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { listPublicVideos } = await import("@/lib/public-videos.server");
  return listPublicVideos(12);
});

/** A single public video, playable by guests without login. */
export const fetchPublicVideo = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string" || data.id.length < 8) {
      throw new Error("Invalid video id");
    }
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const { getPublicVideo } = await import("@/lib/public-videos.server");
    return getPublicVideo(data.id);
  });
