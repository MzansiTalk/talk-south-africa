import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  BarChart3,

  Flag,
  Flame,
  Gavel,
  Inbox,
  LineChart,
  Megaphone,

  Music,
  Rocket,
  ScrollText,
  ShieldAlert,
  Trash2,
  UserCog,
  Wallet,
} from "lucide-react";

import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen, useIsAdmin } from "@/components/Shell";
import { deletePost, fetchFeed, search } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — MzansiTalk" },
      {
        name: "description",
        content: "MzansiTalk admin tools: review recent content, remove posts and find members.",
      },
      { property: "og:title", content: "Admin — MzansiTalk" },
      { property: "og:description", content: "Moderation tools for the MzansiTalk team." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, isOwner } = useIsAdmin();
  const queryClient = useQueryClient();

  const recent = useQuery({ queryKey: ["feed", "admin"], queryFn: () => fetchFeed(), enabled: isAdmin });
  const members = useQuery({ queryKey: ["search", ""], queryFn: () => search(""), enabled: isAdmin });

  const remove = useMutation({
    mutationFn: (input: { id: string; ownerId: string }) => deletePost(input.id, input.ownerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Content removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return (
      <Screen title="Admin">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">
            This area is only available to the MzansiTalk team.
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Admin">
      <section className="grid grid-cols-2 gap-2">
        <Link to="/admin/users" className="btn-base bg-secondary text-secondary-foreground">
          <Flame className="size-4 text-gold" /> Viral Users
        </Link>
        <Link to="/admin/reports" className="btn-base bg-secondary text-secondary-foreground">
          <Flag className="size-4" /> Reports Inbox
        </Link>
        <Link to="/admin/moderation-log" className="btn-base bg-secondary text-secondary-foreground">
          <ScrollText className="size-4" /> Moderation Log
        </Link>
        <Link to="/admin/copyright" className="btn-base bg-secondary text-secondary-foreground">
          <Music className="size-4" /> Copyright Log
        </Link>
        <Link to="/admin/boosts" className="btn-base bg-secondary text-secondary-foreground">
          <Rocket className="size-4" /> Boost Manager
        </Link>
        <Link to="/admin/support" className="btn-base bg-secondary text-secondary-foreground">
          <Inbox className="size-4" /> Support Inbox
        </Link>
        {isOwner ? (
          <Link to="/admin/appeals" className="btn-base bg-secondary text-secondary-foreground">
            <Gavel className="size-4 text-gold" /> Appeals (Owner)
          </Link>
        ) : null}
        {isOwner ? (
          <Link to="/admin/payment-settings" className="btn-base bg-secondary text-secondary-foreground">
            <Wallet className="size-4 text-gold" /> Owner Money Center
          </Link>
        ) : null}

        <Link to="/admin/management" className="btn-base bg-secondary text-secondary-foreground">
          <UserCog className="size-4" /> Admin Management
        </Link>

        {isOwner ? (
          <Link to="/admin/earnings" className="btn-base bg-secondary text-secondary-foreground">
            <BarChart3 className="size-4" /> Earnings
          </Link>
        ) : null}
        {isOwner ? (
          <Link to="/admin/payouts" className="btn-base bg-secondary text-secondary-foreground">
            <Banknote className="size-4 text-gold" /> Payouts (Owner)
          </Link>
        ) : null}

      </section>


      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Recent Content</h2>
        <ul className="mt-3 space-y-2">
          {(recent.data ?? []).slice(0, 25).map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-2">
              <Avatar path={item.author?.avatar_url} name={item.author?.name ?? "M"} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">
                  @{item.author?.username} · {item.kind}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.caption || "(no caption)"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove.mutate({ id: item.id, ownerId: item.user_id })}
                className="btn-base bg-destructive px-2 py-1.5 text-destructive-foreground"
                aria-label="Delete content"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
          {(recent.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No content to review.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Members</h2>
        <ul className="mt-3 space-y-2">
          {(members.data?.people ?? []).map((person) => (
            <li key={person.id} className="flex items-center gap-3">
              <Avatar path={person.avatar_url} name={person.name} size={32} />
              <span className="text-sm">
                {person.name} <span className="text-muted-foreground">@{person.username}</span>
              </span>
            </li>
          ))}
          {(members.data?.people ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No members found.</li>
          ) : null}
        </ul>
      </section>
    </Screen>
  );
}
