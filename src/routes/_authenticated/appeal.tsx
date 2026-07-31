import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { fetchMyProfile } from "@/lib/api";
import { fetchMyAppeals, submitAppeal } from "@/lib/moderation";

export const Route = createFileRoute("/_authenticated/appeal")({
  head: () => ({
    meta: [
      { title: "Appeal a Ban — MzansiTalk" },
      {
        name: "description",
        content: "Send an appeal to MzansiTalk Support if your account was banned by Auto-Mod.",
      },
      { property: "og:title", content: "Appeal a Ban — MzansiTalk" },
      { property: "og:description", content: "Ask the MzansiTalk Owner to review your ban." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppealPage,
});

function AppealPage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const appeals = useQuery({ queryKey: ["my-appeals"], queryFn: fetchMyAppeals });
  const [message, setMessage] = useState("");

  const send = useMutation({
    mutationFn: () => submitAppeal(message.trim()),
    onSuccess: () => {
      setMessage("");
      toast.success("Appeal sent to MzansiTalk Support");
      void queryClient.invalidateQueries({ queryKey: ["my-appeals"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Screen title="Appeal a Ban">
      <div className="rounded-2xl border border-border bg-card p-4">
        <Gavel className="size-6 text-gold" />
        <h2 className="mt-2 font-display text-lg font-bold">Account status</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile.data?.is_banned
            ? `Your account is banned${profile.data.ban_reason ? `: ${profile.data.ban_reason}` : ""}.`
            : `Your account is in good standing. Strikes: ${profile.data?.strikes ?? 0}/3.`}
        </p>
      </div>

      <form
        className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (message.trim()) send.mutate();
        }}
      >
        <label className="block text-xs font-semibold text-muted-foreground" htmlFor="appeal">
          Tell the Owner why this should be reviewed
        </label>
        <textarea
          id="appeal"
          className="field field-focus min-h-28"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1000}
          required
        />
        <button type="submit" disabled={send.isPending} className="btn-base btn-primary w-full">
          {send.isPending ? "Sending…" : "Send Appeal"}
        </button>
      </form>

      <section className="mt-4 space-y-2">
        {(appeals.data ?? []).map((appeal) => (
          <div key={appeal.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(appeal.created_at).toLocaleString("en-ZA")}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-bold uppercase">
                {appeal.status}
              </span>
            </div>
            <p className="mt-2 text-sm">{appeal.message}</p>
            {appeal.decision_note ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Support: {appeal.decision_note}
              </p>
            ) : null}
          </div>
        ))}
      </section>
    </Screen>
  );
}
