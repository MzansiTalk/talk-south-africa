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
  return (decoded.match(/https?:\/\/[^\s"'<>)\]]+/g) ?? [])
    .map((url) => url.replace(/[.,;)]+$/, ""))
    .filter((url) => !/fonts\.googleapis|w3\.org/.test(url));
}

/**
 * Action links are wrapped by the mail provider's click tracker, so the token
 * only shows up after following the redirect. `redirect: "manual"` reads the
 * Location header without actually consuming the one-time token.
 */
async function resolveLink(url: string, hops = 5): Promise<string> {
  let current = url;
  for (let hop = 0; hop < hops; hop += 1) {
    const response = await fetch(current, { redirect: "manual" });
    const next = response.headers.get("location");
    if (!next) return current;
    current = new URL(next, current).toString();
    if (/\/auth\/v1\/verify/.test(current)) return current;
  }
  return current;
}

/**
 * Finds the auth action link for a given email type and returns both the link
 * as shown in the email and the auth verify URL it resolves to.
 */
async function findActionLink(body: string, type: "signup" | "recovery") {
  for (const link of extractLinks(body)) {
    const resolved = await resolveLink(link);
    if (/\/auth\/v1\/verify/.test(resolved) && new RegExp(`type=${type}`).test(resolved)) {
      return { link, resolved };
    }
  }
  return null;
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

    const action = await findActionLink(email.body, "signup");
    expect(action, `no signup confirmation link found in:\n${email.body}`).toBeTruthy();
    expect(action!.link).toMatch(/^https:\/\//);
    expect(action!.resolved).toContain("/auth/v1/verify");
    expect(action!.resolved).toMatch(/[?&](token|token_hash)=[^&]+/);
    expect(action!.resolved).toContain("type=signup");
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

    const action = await findActionLink(email.body, "recovery");
    expect(action, `no recovery link found in:\n${email.body}`).toBeTruthy();
    expect(action!.link).toMatch(/^https:\/\//);
    expect(action!.resolved).toContain("/auth/v1/verify");
    expect(action!.resolved).toMatch(/[?&](token|token_hash)=[^&]+/);
    expect(action!.resolved).toContain("type=recovery");
  }, 180_000);
});
