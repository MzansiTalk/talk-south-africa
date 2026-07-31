import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { fetchMySupportThread, sendSupportMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Contact Support — MzansiTalk" },
      {
        name: "description",
        content:
          "Message the MzansiTalk Support team from inside the app and get replies in your support thread.",
      },
      { property: "og:title", content: "Contact Support — MzansiTalk" },
      { property: "og:description", content: "Talk to the MzansiTalk Support team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const thread = useQuery({ queryKey: ["support-thread"], queryFn: fetchMySupportThread });

  const send = useMutation({
    mutationFn: () => sendSupportMessage(text.trim()),
    onSuccess: () => {
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["support-thread"] });
      toast.success("Message sent to MzansiTalk Support");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Screen title="MzansiTalk Support">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <LifeBuoy className="size-4 text-gold" /> Support Inbox
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The MzansiTalk team replies right here inside the app.
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {(thread.data ?? []).map((message) => (
          <li
            key={message.id}
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              message.is_staff_reply
                ? "border border-border bg-card"
                : "ml-auto bg-brand text-primary-foreground"
            }`}
          >
            {message.is_staff_reply ? (
              <p className="mb-1 text-[0.65rem] font-bold uppercase text-gold">MzansiTalk Support</p>
            ) : null}
            <p className="whitespace-pre-wrap">{message.body}</p>
          </li>
        ))}
        {(thread.data ?? []).length === 0 ? (
          <li className="text-sm text-muted-foreground">No messages yet. Ask us anything.</li>
        ) : null}
      </ul>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        <input
          className="field field-focus"
          placeholder="How can we help?"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn-base btn-primary px-3" aria-label="Send to support">
          <Send className="size-4" />
        </button>
      </form>
    </Screen>
  );
}
