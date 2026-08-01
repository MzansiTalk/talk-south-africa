import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setStep("code");
      toast.success("Code sent. Check your email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });
      if (error) throw error;
      if (password) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
      }
      toast.success("You're in");
      void navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold">Forgot Password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "email"
            ? "Enter your email. We send you a 6-digit code — or just tap the link in the email."
            : "Paste the code from your email. You can set a new password now or leave it blank to just log in."}
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-5 space-y-3">
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
              {busy ? "Sending…" : "Send Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-5 space-y-3">
            <input
              className="field field-focus tracking-[0.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              maxLength={10}
            />
            <input
              className="field field-focus"
              type="password"
              placeholder="New password (optional)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              maxLength={72}
            />
            <button type="submit" disabled={busy} className="btn-base btn-gold w-full">
              {busy ? "Checking…" : "Confirm & Enter App"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-muted-foreground underline"
            >
              Use a different email
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
