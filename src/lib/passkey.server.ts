import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ITERATIONS = 120_000;
const KEYLEN = 32;
const DIGEST = "sha256";

export function hashPassKey(passKey: string): string {
  const salt = randomBytes(16);
  const derived = pbkdf2Sync(passKey.normalize("NFKC"), salt, ITERATIONS, KEYLEN, DIGEST);
  return `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export function verifyPassKey(passKey: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = Buffer.from(parts[2]!, "base64");
  const expected = Buffer.from(parts[3]!, "base64");
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const derived = pbkdf2Sync(
    passKey.normalize("NFKC"),
    salt,
    iterations,
    expected.length,
    DIGEST,
  );
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((user) => (user.email ?? "").toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
