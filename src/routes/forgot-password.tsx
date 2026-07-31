import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — MzansiTalk" },
      {
        name: "description",
        content: "Enter your email and MzansiTalk sends you a code to reset your password.",
      },
      { property: "og:title", content: "Reset Your Password — MzansiTalk" },
      { property: "og:description", content: "Recover access to your MzansiTalk account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset code sent. Check your email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold">Forgot Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email address. We send you a reset link with a code, then you set a new
          password.
        </p>

        {sent ? (
          <div className="mt-5 rounded-xl border border-border bg-card p-4 text-sm">
            <p>
              Email sent to <span className="font-semibold">{email}</span>. Open it on this device
              and tap the link to set a new password.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              className="field field-focus"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={255}
            />
            <button type="submit" disabled={busy} className="btn-base btn-primary w-full">
              {busy ? "Sending…" : "Send Reset Code"}
            </button>
          </form>
        )}

        <Link to="/" className="mt-5 inline-block text-sm text-muted-foreground underline">
          Back to Log In
        </Link>
      </div>
    </div>
  );
}
