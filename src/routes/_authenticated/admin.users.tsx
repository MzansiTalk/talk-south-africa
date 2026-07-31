import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen, useIsAdmin } from "@/components/Shell";
import { fetchMembers, setBanned, setViral } from "@/lib/moderation";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Viral User Manager — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Turn viral reach on or off per member, see strike counts and (Owner only) ban or unban members.",
      },
      { property: "og:title", content: "Viral User Manager — MzansiTalk Admin" },
      { property: "og:description", content: "Manage viral reach, strikes and bans on MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UserManagerPage,
});

function UserManagerPage() {
  const { isAdmin, isOwner } = useIsAdmin();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const members = useQuery({
    queryKey: ["members", term],
    queryFn: () => fetchMembers(term),
    enabled: isAdmin,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["members"] });

  const viral = useMutation({
    mutationFn: (input: { userId: string; on: boolean }) => setViral(input.userId, input.on),
    onSuccess: (_result, input) => {
      toast.success(
        input.on
          ? "Viral ON — their posts reach 80% of feeds with a Trending badge."
          : "Viral OFF — normal algorithm.",
      );
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ban = useMutation({
    mutationFn: (input: { userId: string; banned: boolean }) =>
      setBanned(input.userId, input.banned, input.banned ? "Banned by Owner" : undefined),
    onSuccess: (_result, input) => {
      toast.success(input.banned ? "Member banned" : "Member unbanned");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return (
      <Screen title="Viral User Manager">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Viral User Manager">
      <input
        className="field field-focus"
        placeholder="Search members by name or username"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />

      <ul className="mt-3 space-y-2">
        {(members.data ?? []).map((member) => (
          <li key={member.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <Avatar path={member.avatar_url} name={member.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {member.name}{" "}
                  <span className="text-muted-foreground">@{member.username}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Strikes: {member.strikes ?? 0}/3
                  {member.is_banned ? " · BANNED" : ""}
                  {member.is_viral ? " · Viral ON" : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => viral.mutate({ userId: member.id, on: !member.is_viral })}
                className={`btn-base px-3 py-1.5 text-xs ${
                  member.is_viral ? "btn-gold" : "bg-secondary text-secondary-foreground"
                }`}
              >
                <Flame className="size-3.5" /> Viral {member.is_viral ? "ON" : "OFF"}
              </button>
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => ban.mutate({ userId: member.id, banned: !member.is_banned })}
                  className={`btn-base px-3 py-1.5 text-xs ${
                    member.is_banned
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {member.is_banned ? "Unban" : "Ban User"}
                </button>
              ) : (
                <span className="self-center text-[0.7rem] text-muted-foreground">
                  Only the Owner can ban members
                </span>
              )}
            </div>
          </li>
        ))}
        {(members.data ?? []).length === 0 ? (
          <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No members found.
          </li>
        ) : null}
      </ul>
    </Screen>
  );
}
