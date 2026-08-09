import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side fetch of the ExoClick VAST tag.
 * The ad server does not send CORS headers, so a browser fetch is blocked and no
 * ad ever loads. Proxying the XML through the server fixes that.
 */
const ALLOWED_HOSTS = ["s.magsrv.com", "syndication.exoclick.com", "a.magsrv.com"];

export const fetchVastXml = createServerFn({ method: "GET" })
  .inputValidator((data: { url?: string } | undefined) => ({ url: data?.url ?? "" }))
  .handler(async ({ data }) => {
    const target = data.url || "https://s.magsrv.com/v1/vast.php?idz=5998148";
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return { xml: "" };
    }
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) return { xml: "" };
    try {
      const response = await fetch(parsed.toString(), {
        headers: { "user-agent": "Mozilla/5.0 (Linux; Android 12) MzansiTalk", accept: "*/*" },
        cache: "no-store",
      });
      if (!response.ok) return { xml: "" };
      return { xml: await response.text() };
    } catch {
      return { xml: "" };
    }

  });
