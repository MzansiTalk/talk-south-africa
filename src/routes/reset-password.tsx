import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a New Password — MzansiTalk" },
      { name: "description", content: "Choose a new password for your MzansiTalk account." },
      { property: "og:title", content: "Set a New Password — MzansiTalk" },
      { property: "og:description", content: "Finish resetting your MzansiTalk password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
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
      <form onSubmit={submit} className="w-full max-w-sm space-y-3">
        <h1 className="font-display text-2xl font-bold">New Password</h1>
        <input
          className="field field-focus"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          maxLength={72}
        />
        <input
          className="field field-focus"
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
          minLength={6}
          maxLength={72}
        />
        <button type="submit" disabled={busy} className="btn-base btn-gold w-full">
          {busy ? "Saving…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
