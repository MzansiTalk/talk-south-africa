import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, ShieldCheck } from "lucide-react";
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

function AuthWall() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your MzansiTalk account.");
          return;
        }
        await claimStoredReferral();
        toast.success("Welcome to MzansiTalk");
        void navigate({ to: "/home", replace: true });
        return;

      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      void navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
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
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={60}
            />
          ) : null}
          <input
            className="field field-focus"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={255}
          />
          <input
            className="field field-focus"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            maxLength={72}
          />
          <button type="submit" disabled={busy} className="btn-base btn-gold w-full">
            {busy ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-muted-foreground underline">
            Forgot password?
          </Link>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> 100% free to watch
          </span>
        </div>

        <p className="mt-3 text-center text-xs">
          <Link to="/advertise" className="font-semibold text-gold underline">
            Advertise With Us
          </Link>
        </p>
      </div>
    </div>
  );
}
