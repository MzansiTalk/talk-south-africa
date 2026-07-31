import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen, useIsAdmin } from "@/components/Shell";
import { fetchSupportInbox, replyToSupport } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({
    meta: [
      { title: "Support Inbox — MzansiTalk Admin" },
      {
        name: "description",
        content: "MzansiTalk Support Inbox: read member support threads and reply from the admin panel.",
      },
      { property: "og:title", content: "Support Inbox — MzansiTalk Admin" },
      { property: "og:description", content: "Answer MzansiTalk member support requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportInbox,
});

function SupportInbox() {
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const inbox = useQuery({
    queryKey: ["support-inbox"],
    queryFn: fetchSupportInbox,
    enabled: isAdmin,
  });

  const reply = useMutation({
    mutationFn: (input: { userId: string; body: string }) =>
      replyToSupport(input.userId, input.body),
    onSuccess: (_data, input) => {
      setDrafts((current) => ({ ...current, [input.userId]: "" }));
      void queryClient.invalidateQueries({ queryKey: ["support-inbox"] });
      toast.success("Reply sent");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return (
      <Screen title="Support Inbox">
        <p className="rounded-2xl border border-destructive bg-destructive/10 p-6 text-center text-sm font-bold">
          Access Denied. Admins only.
        </p>
      </Screen>
    );
  }

  const threads = inbox.data ?? [];

  return (
    <Screen title="Support Inbox">
      {threads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Inbox className="mx-auto size-8 text-gold" />
          <p className="mt-3 text-sm text-muted-foreground">No support messages yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {threads.map((thread) => {
            const userId = thread.user?.id ?? thread.messages[0]?.thread_user_id ?? "";
            return (
              <li key={userId} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    path={thread.user?.avatar_url ?? null}
                    name={thread.user?.name ?? "M"}
                    size={32}
                  />
                  <p className="text-sm font-semibold">@{thread.user?.username ?? "member"}</p>
                </div>
                <ul className="mt-3 space-y-2">
                  {thread.messages.map((message) => (
                    <li
                      key={message.id}
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        message.is_staff_reply
                          ? "ml-auto bg-brand text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {message.body}
                    </li>
                  ))}
                </ul>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const body = (drafts[userId] ?? "").trim();
                    if (body) reply.mutate({ userId, body });
                  }}
                >
                  <input
                    className="field field-focus"
                    placeholder="Reply as MzansiTalk Support"
                    value={drafts[userId] ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [userId]: event.target.value }))
                    }
                  />
                  <button type="submit" className="btn-base btn-primary px-3" aria-label="Send reply">
                    <Send className="size-4" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
