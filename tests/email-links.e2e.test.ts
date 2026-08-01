/**
 * End-to-end email delivery test.
 *
 * Creates a throwaway sandbox inbox (mail.tm), signs a brand-new user up
 * through the backend auth API, then triggers a password reset for the same
 * address. For each email it asserts:
 *   1. the message actually arrives, and
 *   2. the body contains a working action link (confirm / recovery) pointing
 *      at the backend auth verify endpoint with a token.
 *
 * Network + real auth rate limits are involved, so it is opt-in:
 *   RUN_EMAIL_E2E=1 bunx vitest run tests/email-links.e2e.test.ts
 */
import { describe, expect, it } from "vitest";

const RUN = process.env["RUN_EMAIL_E2E"] === "1";
const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const ANON_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";

const MAIL_TM = "https://api.mail.tm";
/** Every http(s) URL in the email body, with HTML entities decoded. */
function extractLinks(body: string) {
  const decoded = body.replace(/&amp;/g, "&").replace(/&#x2F;/gi, "/");
  return (decoded.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? []).map((url) =>
    url.replace(/[.,;]+$/, ""),
  );
}

/**
 * Finds the auth action link for a given email type. Supabase sends links to
 * /auth/v1/verify (or a configured redirect) carrying a token and a type.
 */
function findActionLink(body: string, type: "signup" | "recovery") {
  return extractLinks(body).find(
    (url) => /token=|token_hash=/.test(url) && new RegExp(`type=${type}`).test(url),
  );
}


type Inbox = { address: string; token: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function json(url: string, init?: RequestInit) {
  // The sandbox mail provider rate limits aggressively; back off on 429.
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, init);
    const text = await response.text();
    if (response.status === 429 && attempt < 8) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (!response.ok) {
      throw new Error(`${init?.method ?? "GET"} ${url} -> ${response.status} ${text}`);
    }
    return text ? JSON.parse(text) : null;
  }
}


async function createInbox(): Promise<Inbox> {
  const [domain] = (await json(`${MAIL_TM}/domains?page=1`))["hydra:member"];
  // Keep the local part short and dot-free — the sandbox provider rejects long/dotted ones.
  const address = `mtt${Math.random().toString(36).slice(2, 10)}@${domain.domain}`;
  const password = `Test-${Math.random().toString(36).slice(2, 8)}-9`;
  await json(`${MAIL_TM}/accounts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  // mail.tm briefly 401s a freshly created account, so retry the token call.
  let token = "";
  for (let attempt = 0; attempt < 6 && !token; attempt += 1) {
    await sleep(1500);
    try {
      token = (
        await json(`${MAIL_TM}/token`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ address, password }),
        })
      ).token;
    } catch {
      // keep retrying until the sandbox account is usable
    }
  }
  if (!token) throw new Error(`Could not obtain a sandbox inbox token for ${address}`);

  return { address, token };
}

/** Polls the sandbox inbox until a message whose subject matches arrives. */
async function waitForEmail(inbox: Inbox, match: RegExp, timeoutMs = 90_000) {
  const headers = { authorization: `Bearer ${inbox.token}` };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = (await json(`${MAIL_TM}/messages?page=1`, { headers }))["hydra:member"] as {
      id: string;
      subject: string;
    }[];
    const hit = messages.find((message) => match.test(message.subject));
    if (hit) {
      const full = await json(`${MAIL_TM}/messages/${hit.id}`, { headers });
      const body = `${full.text ?? ""}\n${full.html ?? ""}`;
      if (process.env["DUMP_EMAILS"]) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(`/tmp/mail/${hit.id}.txt`, body);
      }
      return { subject: full.subject as string, body };
    }
    await sleep(3000);
  }
  throw new Error(`No email matching ${match} arrived within ${timeoutMs}ms`);
}

const authFetch = (path: string, body: unknown) =>
  json(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify(body),
  });

describe.runIf(RUN)("MzansiTalk auth emails", () => {
  it("delivers a signup verification email containing a confirmation link", async () => {
    const inbox = await createInbox();
    await authFetch("/signup", {
      email: inbox.address,
      password: `Mzansi-${Math.random().toString(36).slice(2)}-8`,
      data: { name: "Sandbox Tester" },
    });

    const email = await waitForEmail(inbox, /confirm|verif/i);
    expect(email.body.length).toBeGreaterThan(0);

    const link = findActionLink(email.body, "signup");
    expect(link, `no signup confirmation link found in:\n${email.body}`).toBeTruthy();
    expect(link).toMatch(/^https:\/\//);
    expect(link).toContain("/auth/v1/verify");
  }, 120_000);

  it("delivers a password reset email containing a recovery link", async () => {
    const inbox = await createInbox();
    await authFetch("/signup", {
      email: inbox.address,
      password: `Mzansi-${Math.random().toString(36).slice(2)}-8`,
      data: { name: "Sandbox Tester" },
    });
    await waitForEmail(inbox, /confirm|verif/i);

    await authFetch("/recover", { email: inbox.address });

    const email = await waitForEmail(inbox, /reset|recovery|password/i);
    expect(email.body.length).toBeGreaterThan(0);

    const link = findActionLink(email.body, "recovery");
    expect(link, `no recovery link found in:\n${email.body}`).toBeTruthy();
    expect(link).toMatch(/^https:\/\//);
    expect(link).toContain("/auth/v1/verify");
  }, 180_000);
});
