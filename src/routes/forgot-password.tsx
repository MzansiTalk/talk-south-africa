import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — MzansiTalk" },
      {
        name: "description",
        content: "Enter your email and MzansiTalk sends you a 6-digit code to reset your password.",
      },
      { property: "og:title", content: "Reset Your Password — MzansiTalk" },
      { property: "og:description", content: "Recover access to your MzansiTalk account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setStep("code");
      setAttempts(0);
      toast.success("If this email exists, we sent a code");
    } catch {
      // Never reveal whether the account exists.
      setStep("code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (attempts >= 5) {
      toast.error("Too many attempts. Please wait 15 minutes and try again.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "recovery",
      });
      if (error) {
        setAttempts((prev) => prev + 1);
        throw new Error("That code is wrong or has expired. Tap Resend Code.");
      }
      setStep("password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const setNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      void navigate({ to: "/home", replace: true });
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
          {step === "email"
            ? "Enter your email. We send you a 6-digit code that expires in 10 minutes."
            : step === "code"
              ? "Paste the 6-digit code from your email."
              : "Choose your new password."}
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-5 space-y-3">
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
              {busy ? "Sending…" : "Send Code"}
            </button>
          </form>
        ) : step === "code" ? (
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
            <button type="submit" disabled={busy} className="btn-base btn-gold w-full">
              {busy ? "Checking…" : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-muted-foreground underline"
            >
              Resend Code / use another email
            </button>
          </form>
        ) : (
          <form onSubmit={setNewPassword} className="mt-5 space-y-3">
            <div className="relative">
              <input
                className="field field-focus pr-11"
                type={show ? "text" : "password"}
                placeholder="New password (min 8 characters)"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={72}
              />
              <button
                type="button"
                onClick={() => setShow((prev) => !prev)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <input
              className="field field-focus"
              type={show ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
            <button type="submit" disabled={busy} className="btn-base btn-gold w-full">
              {busy ? "Saving…" : "Set New Password & Enter App"}
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
