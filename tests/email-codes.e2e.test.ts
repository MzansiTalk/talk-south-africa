/**
 * End-to-end email delivery test.
 *
 * Creates a throwaway sandbox inbox (mail.tm), signs a brand-new user up
 * through the backend auth API, then triggers a password reset for the same
 * address. For each email it asserts:
 *   1. the message actually arrives, and
 *   2. the body contains a standalone 6-digit code.
 *
 * Network + real auth rate limits are involved, so it is opt-in:
 *   RUN_EMAIL_E2E=1 bunx vitest run tests/email-codes.e2e.test.ts
 */
import { describe, expect, it } from "vitest";

const RUN = process.env["RUN_EMAIL_E2E"] === "1";
const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"] ?? "";
const ANON_KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";

const MAIL_TM = "https://api.mail.tm";
/** A standalone 6-digit code, e.g. "123456" but not part of a longer number. */
const SIX_DIGIT_CODE = /(?<!\d)\d{6}(?!\d)/;

type Inbox = { address: string; token: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url} -> ${response.status} ${text}`);
  return text ? JSON.parse(text) : null;
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
      return { subject: full.subject as string, body: `${full.text ?? ""}\n${full.html ?? ""}` };
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
  it("delivers a signup verification email containing a 6-digit code", async () => {
    const inbox = await createInbox();
    await authFetch("/signup", {
      email: inbox.address,
      password: `Mzansi-${Math.random().toString(36).slice(2)}-8`,
      data: { name: "Sandbox Tester" },
    });

    const email = await waitForEmail(inbox, /confirm|verif/i);
    expect(email.body.length).toBeGreaterThan(0);
    expect(email.body).toMatch(SIX_DIGIT_CODE);
  }, 120_000);

  it("delivers a password reset email containing a 6-digit code", async () => {
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
    expect(email.body).toMatch(SIX_DIGIT_CODE);
  }, 180_000);
});
