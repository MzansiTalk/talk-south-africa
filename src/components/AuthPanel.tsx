import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/mzansitalk-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { claimStoredReferral } from "@/lib/creators";
import { signUpWithPassKey } from "@/lib/passkey.functions";

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

/** Shared login / sign up card used by /login and /register. */
export function AuthPanel({ initialMode }: { initialMode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passKey, setPassKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  const signIn = async (welcome: boolean) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error("Incorrect email or password");
    if (welcome) {
      await claimStoredReferral();
      toast.success("Welcome to MzansiTalk");
    }
    void navigate({ to: "/home", replace: true });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        if (passKey.trim().length < 6) throw new Error("Pass Key must be at least 6 characters");
        const result = await signUpWithPassKey({
          data: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            passKey: passKey.trim(),
          },
        });
        if (!result.ok) throw new Error(result.message);
        await signIn(true);
        return;
      }

      await signIn(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-sm py-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-brand opacity-20 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col items-center text-center">
          <img
            src={logo}
            alt="MzansiTalk logo"
            width={72}
            height={72}
            className="rounded-2xl shadow-brand"
          />
          <h1 className="mt-4 font-display text-2xl font-extrabold">
            {mode === "login" ? "Log in to MzansiTalk" : "Create your MzansiTalk account"}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            Members can post, comment, like and go live
          </p>
        </div>

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
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <PasswordField
                value={passKey}
                onChange={setPassKey}
                placeholder="Create Pass Key (min 6 characters)"
                minLength={6}
              />
              <p className="text-xs text-gold">
                ⚠️ Never share this Pass Key or forget it. You will need it to reset your password.
              </p>
            </div>
          ) : null}
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
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link to="/register" className="underline">
                Create a free account
              </Link>
            </>
          ) : (
            <>
              Already a member?{" "}
              <Link to="/login" className="underline">
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
