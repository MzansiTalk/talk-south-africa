import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { prepareOwnerLogin, verifyStaffAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Staff Sign In — MzansiTalk" },
      {
        name: "description",
        content: "Private sign in for the MzansiTalk Owner and approved admins.",
      },
      { property: "og:title", content: "Staff Sign In — MzansiTalk" },
      { property: "og:description", content: "Private MzansiTalk staff access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await prepareOwnerLogin({ data: { email: email.trim(), password } });

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setMessage("Access Denied");
        return;
      }

      const { status } = await verifyStaffAccess();
      if (status === "pending") {
        await supabase.auth.signOut();
        setMessage("Waiting for Owner Approval");
        return;
      }
      if (status === "denied") {
        await supabase.auth.signOut();
        setMessage("Access Denied");
        return;
      }

      toast.success(status === "owner" ? "Welcome back, Owner" : "Welcome back, Admin");
      void navigate({ to: "/admin", replace: true });
    } catch {
      setMessage("Access Denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-2xl bg-secondary p-3">
            <ShieldCheck className="size-7 text-gold" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Staff Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Private door for the MzansiTalk Owner and approved admins.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            className="field field-focus"
            type="email"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={255}
          />
          <input
            className="field field-focus"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            maxLength={72}
          />
          <button type="submit" disabled={busy} className="btn-base btn-primary w-full">
            {busy ? "Checking…" : "Enter Admin Panel"}
          </button>
        </form>

        {message ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            <ShieldAlert className="size-4" /> {message}
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted-foreground underline">
            Back to MzansiTalk
          </Link>
        </div>
      </div>
    </div>
  );
}
