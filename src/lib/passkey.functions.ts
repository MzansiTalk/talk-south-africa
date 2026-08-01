import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signUpSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  passKey: z.string().trim().min(6).max(64),
});

const resetSchema = z.object({
  email: z.string().trim().email().max(255),
  passKey: z.string().trim().min(6).max(64),
  password: z.string().min(8).max(72),
});

export const signUpWithPassKey = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }) => {
    const { hashPassKey } = await import("./passkey.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user) {
      const message = (error?.message ?? "").toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        return { ok: false as const, message: "That email already has an account. Log in instead." };
      }
      return { ok: false as const, message: "Could not create your account. Please try again." };
    }

    const { error: keyError } = await supabaseAdmin
      .from("user_pass_keys")
      .upsert(
        { user_id: created.user.id, pass_key_hash: hashPassKey(data.passKey) },
        { onConflict: "user_id" },
      );
    if (keyError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, message: "Could not save your Pass Key. Please try again." };
    }

    return { ok: true as const };
  });

export const resetPasswordWithPassKey = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data }) => {
    const { verifyPassKey, findUserIdByEmail } = await import("./passkey.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const denied = {
      ok: false as const,
      message: "Access Denied. Email and Pass Key do not match.",
    };

    const userId = await findUserIdByEmail(data.email.toLowerCase());
    if (!userId) return denied;

    const { data: row } = await supabaseAdmin
      .from("user_pass_keys")
      .select("pass_key_hash")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row || !verifyPassKey(data.passKey, row.pass_key_hash)) return denied;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.password,
    });
    if (error) return { ok: false as const, message: "Could not update your password." };

    return { ok: true as const };
  });
