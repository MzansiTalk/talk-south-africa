import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/mzansitalk-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { claimStoredReferral } from "@/lib/creators";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign Up or Log In — MzansiTalk" },
      {
        name: "description",
        content:
          "Please Sign Up or Log In to view MzansiTalk. Free forever — posts, reels and status from all over South Africa.",
      },
      { property: "og:title", content: "Sign Up or Log In — MzansiTalk" },
      {
        property: "og:description",
        content: "MzansiTalk is members-only. Create a free account to watch reels, posts and status.",
      },
    ],
  }),
  component: AuthWall,
});

function PasswordField({
  value,
  onChange,
  placeholder,
  minLength = 8,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="field field-focus pr-11"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={minLength}
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
  );
}

function AuthWall() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "verify">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  const enterApp = async () => {
    await claimStoredReferral();
    toast.success("Welcome to MzansiTalk");
    void navigate({ to: "/home", replace: true });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) {
          await enterApp();
          return;
        }
        setMode("verify");
        setAttempts(0);
        toast.success("We sent a 6-digit code to your email");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("not confirmed")) {
          setMode("verify");
          setAttempts(0);
          toast.error("Please verify your email first");
          return;
        }
        throw new Error("Incorrect email or password");
      }
      void navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
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
        type: "signup",
      });
      if (error) {
        setAttempts((prev) => prev + 1);
        throw new Error("That code is wrong or has expired. Tap Resend Code.");
      }
      await enterApp();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setAttempts(0);
      toast.success("New code sent. Check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-brand opacity-30 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="MzansiTalk logo"
            width={84}
            height={84}
            className="rounded-2xl shadow-brand"
          />
          <h1 className="mt-4 font-display text-3xl font-extrabold">
            Mzansi<span className="text-gold">Talk</span>
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            Please Sign Up or Log In to view MzansiTalk
          </p>
        </div>

        {mode === "verify" ? (
          <form onSubmit={verify} className="mt-6 space-y-3">
            <h2 className="font-display text-lg font-bold">Enter Verification Code</h2>
            <p className="text-sm text-muted-foreground">
              We emailed a 6-digit code to {email || "your email"}. It expires in 10 minutes.
            </p>
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
              {busy ? "Checking…" : "Verify & Enter App"}
            </button>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={busy}
              className="w-full text-sm text-muted-foreground underline"
            >
              Resend Code
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full text-sm text-muted-foreground underline"
            >
              Back to Log In
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(["login", "signup"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`btn-base py-2 text-sm ${
                    mode === value ? "btn-primary" : "bg-transparent text-muted-foreground"
                  }`}
                >
                  {value === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              {mode === "signup" ? (
                <input
                  className="field field-focus"
                  placeholder="Full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={60}
                />
              ) : null}
              <input
                className="field field-focus"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={255}
              />
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"}
                minLength={mode === "signup" ? 8 : 6}
              />
              <button type="submit" disabled={busy} className="btn-base btn-gold w-full">
                {busy ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-muted-foreground underline">
                Forgot Password?
              </Link>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" /> 100% free to watch
              </span>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Want to advertise? Sign in first — pricing and checkout live inside the app.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
