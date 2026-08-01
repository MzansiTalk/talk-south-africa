import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffStatus = "owner" | "admin" | "pending" | "denied";

export type AdminRow = {
  userId: string;
  email: string;
  role: "owner" | "admin";
  approved: boolean;
  createdAt: string;
};

/**
 * Public step before sign-in: makes sure the Owner account exists.
 * Only ever acts when the email is the Owner email AND the supplied password
 * matches the Owner bootstrap password. Never sends emails or notifications.
 */
export const prepareOwnerLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => ({
    email: String(data.email ?? "").trim().toLowerCase(),
    password: String(data.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const { OWNER_EMAIL, OWNER_BOOTSTRAP_PASSWORD } = await import("./admin.server");
    if (data.email !== OWNER_EMAIL || data.password !== OWNER_BOOTSTRAP_PASSWORD) {
      return { prepared: false as const };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users.find((user) => user.email?.toLowerCase() === OWNER_EMAIL);

    if (existing) {
      // Keep the Owner account in sync with the Owner password.
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: OWNER_BOOTSTRAP_PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: OWNER_EMAIL,
        password: OWNER_BOOTSTRAP_PASSWORD,
        email_confirm: true,
        user_metadata: { name: "MzansiTalk Support" },
      });
      if (error) throw new Error(error.message);
    }

    return { prepared: true as const };
  });

/** Called after a successful sign-in on /admin-login. Decides staff access. */
export const verifyStaffAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ status: StaffStatus }> => {
    const { OWNER_EMAIL } = await import("./admin.server");
    const email = String(context.claims?.["email"] ?? "").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (email === OWNER_EMAIL) {
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          [
            { user_id: context.userId, role: "owner" as const, approved: true },
            { user_id: context.userId, role: "admin" as const, approved: true },
          ],
          { onConflict: "user_id,role" },
        );
      return { status: "owner" };
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role, approved")
      .eq("user_id", context.userId);

    const staff = (roles ?? []).filter((row) => row.role === "admin" || row.role === "owner");
    if (staff.length === 0) return { status: "denied" };
    if (!staff.some((row) => row.approved)) return { status: "pending" };
    return { status: staff.some((row) => row.role === "owner") ? "owner" : "admin" };
  });

async function assertOwner(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await (context.supabase as any).rpc("is_owner", { _user_id: context.userId });
  if (!data) throw new Error("Access Denied. Owner Only.");
}

export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminRow[]> => {
    await assertOwner(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, approved, created_at")
      .in("role", ["owner", "admin"])
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const emails = new Map((list?.users ?? []).map((user) => [user.id, user.email ?? ""]));

    const seen = new Set<string>();
    const rows: AdminRow[] = [];
    for (const row of roles ?? []) {
      const key = `${row.user_id}:${row.role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        userId: row.user_id,
        email: emails.get(row.user_id) ?? "(unknown)",
        role: row.role as "owner" | "admin",
        approved: Boolean((row as { approved?: boolean }).approved),
        createdAt: row.created_at,
      });
    }
    // Owner rows first, and hide the duplicate admin row of the owner.
    const ownerIds = new Set(rows.filter((row) => row.role === "owner").map((row) => row.userId));
    return rows.filter((row) => row.role === "owner" || !ownerIds.has(row.userId));
  });

export const createAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; password: string }) => {
    const email = String(data.email ?? "").trim().toLowerCase();
    const password = String(data.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    return { email, password };
  })
  .handler(async ({ data, context }) => {
    await assertOwner(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = (list?.users ?? []).find((user) => user.email?.toLowerCase() === data.email)?.id;

    if (!userId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      userId = created.user?.id;
    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }
    if (!userId) throw new Error("Could not create the admin account");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" as const, approved: true }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { userId, email: data.email };
  });

export const setAdminApproved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; approved: boolean }) => ({
    userId: String(data.userId),
    approved: Boolean(data.approved),
  }))
  .handler(async ({ data, context }) => {
    await assertOwner(context as never);
    if (data.userId === context.userId) throw new Error("You cannot change your own access");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ approved: data.approved })
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => ({ userId: String(data.userId) }))
  .handler(async ({ data, context }) => {
    await assertOwner(context as never);
    if (data.userId === context.userId) throw new Error("You cannot remove yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if ((target ?? []).some((row) => row.role === "owner")) {
      throw new Error("The Owner account cannot be modified or removed");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: "user" as const, approved: true }, { onConflict: "user_id,role" });

    return { ok: true as const };
  });

/**
 * Promote an existing member to admin by email.
 * Allowed for any approved staff member (Owner or approved admin).
 * Nobody can promote themselves — role writes only ever happen here, server-side.
 */
export const promoteToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => {
    const email = String(data.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address");
    return { email };
  })
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await (context.supabase as any).rpc("is_active_staff", {
      _user_id: context.userId,
    });
    if (!isStaff) throw new Error("Access Denied");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const target = (list?.users ?? []).find((user) => user.email?.toLowerCase() === data.email);
    if (!target) throw new Error("No MzansiTalk member uses that email");
    if (target.id === context.userId) throw new Error("You cannot change your own role");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: target.id, role: "admin" as const, approved: true }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);

    return { email: data.email };
  });
