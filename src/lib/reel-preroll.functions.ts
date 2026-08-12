import { createServerFn } from "@tanstack/react-start";

/**
 * Proxies the HilltopAds VAST document. The ad server does not send CORS
 * headers, so the browser cannot fetch the XML directly.
 */
export const fetchReelVast = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data || typeof data.url !== "string" || !/^https:\/\//.test(data.url)) {
      throw new Error("Invalid VAST url");
    }
    return { url: data.url };
  })
  .handler(async ({ data }) => {
    try {
      const response = await fetch(data.url, {
        cache: "no-store",
        headers: { accept: "application/xml,text/xml,*/*" },
      });
      if (!response.ok) return { xml: "" };
      return { xml: await response.text() };
    } catch {
      return { xml: "" };
    }
  });
