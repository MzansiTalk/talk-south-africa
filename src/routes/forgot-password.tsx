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
        content: "Enter your email and MzansiTalk sends you a secure link to reset your password.",
      },
      { property: "og:title", content: "Reset Your Password — MzansiTalk" },
      { property: "og:description", content: "Recover access to your MzansiTalk account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const sendLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch {
      // Never reveal whether the account exists.
    } finally {
      setSent(true);
      setBusy(false);
      toast.success("If this email exists, we sent a reset link");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold">Forgot Password</h1>

        {sent ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              We emailed a password reset link to {email || "your email"}. Open the email and tap the
              link — it opens a page where you choose your new password. The link expires in 10
              minutes.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-5 w-full text-sm text-muted-foreground underline"
            >
              Send again / use another email
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email. We send you a secure reset link that expires in 10 minutes.
            </p>
            <form onSubmit={sendLink} className="mt-5 space-y-3">
              <input
                className="field field-focus"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={255}
              />
              <button type="submit" disabled={busy} className="btn-base btn-primary w-full">
                {busy ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          </>
        )}

        <Link to="/" className="mt-5 inline-block text-sm text-muted-foreground underline">
          Back to Log In
        </Link>
      </div>
    </div>
  );
}
