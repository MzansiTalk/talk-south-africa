import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { resetPasswordWithPassKey } from "@/lib/passkey.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — MzansiTalk" },
      {
        name: "description",
        content:
          "Enter your email and your personal Pass Key to set a new MzansiTalk password instantly.",
      },
      { property: "og:title", content: "Reset Your Password — MzansiTalk" },
      { property: "og:description", content: "Recover access to your MzansiTalk account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPassword,
});

function SecretField({
  value,
  onChange,
  placeholder,
  minLength,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  minLength: number;
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
        aria-label={show ? "Hide value" : "Show value"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [passKey, setPassKey] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await resetPasswordWithPassKey({
        data: {
          email: email.trim().toLowerCase(),
          passKey: passKey.trim(),
          password,
        },
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Password updated. Log in with your new password.");
      void navigate({ to: "/", replace: true });
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
          Enter your email and the Pass Key you created at sign up, then choose a new password.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            className="field field-focus"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={255}
          />
          <SecretField
            value={passKey}
            onChange={setPassKey}
            placeholder="Your Pass Key"
            minLength={6}
          />
          <SecretField
            value={password}
            onChange={setPassword}
            placeholder="New password (min 8 characters)"
            minLength={8}
          />
          <button type="submit" disabled={busy} className="btn-base btn-primary w-full">
            {busy ? "Saving…" : "Reset Password"}
          </button>
        </form>

        <Link to="/" className="mt-5 inline-block text-sm text-muted-foreground underline">
          Back to Log In
        </Link>
      </div>
    </div>
  );
}
