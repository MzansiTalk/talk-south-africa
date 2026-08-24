import { createServerFn } from "@tanstack/react-start";

export type { PrerollCreative } from "@/lib/vast.server";

/** Server-side VAST fetch (avoids browser CORS); public so guests get pre-roll too. */
export const fetchPreroll = createServerFn({ method: "GET" }).handler(async () => {
  const { getPrerollCreative } = await import("@/lib/vast.server");
  return getPrerollCreative();
});
