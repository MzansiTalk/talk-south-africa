import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { getMyEmail, OWNER_EMAIL } from "@/lib/api";
import { decideAppeal, fetchAppeals } from "@/lib/moderation";

export const Route = createFileRoute("/_authenticated/admin/appeals")({
  head: () => ({
    meta: [
      { title: "Appeals Inbox — MzansiTalk Owner" },
      {
        name: "description",
        content: "Owner-only inbox for MzansiTalk ban appeals written by members.",
      },
      { property: "og:title", content: "Appeals Inbox — MzansiTalk Owner" },
      { property: "og:description", content: "Owner-only ban appeals for MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppealsInbox,
});

function AppealsInbox() {
  const queryClient = useQueryClient();
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;
  const appeals = useQuery({ queryKey: ["appeals"], queryFn: fetchAppeals, enabled: isOwner });

  const decide = useMutation({
    mutationFn: (input: { appealId: string; userId: string; approve: boolean }) =>
      decideAppeal(input),
    onSuccess: (_result, input) => {
      toast.success(input.approve ? "Appeal approved. Member unbanned." : "Appeal rejected.");
      void queryClient.invalidateQueries({ queryKey: ["appeals"] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (email.isLoading) {
    return (
      <Screen title="Appeals Inbox">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="Appeals Inbox">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Appeals Inbox">
      <ul className="space-y-2">
        {(appeals.data ?? []).map((appeal) => (
          <li key={appeal.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">
                {appeal.user?.name ?? "Member"}{" "}
                <span className="text-muted-foreground">@{appeal.user?.username ?? "user"}</span>
              </p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-bold uppercase">
                {appeal.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(appeal.created_at).toLocaleString("en-ZA")}
            </p>
            <p className="mt-2 text-sm">{appeal.message}</p>
            {appeal.status === "open" ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    decide.mutate({ appealId: appeal.id, userId: appeal.user_id, approve: true })
                  }
                  className="btn-base btn-primary px-3 py-1.5 text-xs"
                >
                  Approve &amp; Unban
                </button>
                <button
                  type="button"
                  onClick={() =>
                    decide.mutate({ appealId: appeal.id, userId: appeal.user_id, approve: false })
                  }
                  className="btn-base bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
                >
                  Reject
                </button>
              </div>
            ) : null}
          </li>
        ))}
        {(appeals.data ?? []).length === 0 ? (
          <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No appeals yet.
          </li>
        ) : null}
      </ul>
    </Screen>
  );
}
