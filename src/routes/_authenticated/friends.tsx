import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Search as SearchIcon, UserPlus } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { search, setFollow, startDirectChat } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Find Friends — MzansiTalk" },
      {
        name: "description",
        content: "Search for people on MzansiTalk, follow them and start a chat straight away.",
      },
      { property: "og:title", content: "Find Friends — MzansiTalk" },
      { property: "og:description", content: "Search users, follow them and message them instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindFriends,
});

function FindFriends() {
  const [term, setTerm] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const results = useQuery({
    queryKey: ["find-friends", term],
    queryFn: () => search(term.trim()),
    enabled: term.trim().length > 1,
  });

  const follow = useMutation({
    mutationFn: (targetId: string) => setFollow(targetId, true),
    onSuccess: (_data, targetId) => {
      setFollowed((current) => ({ ...current, [targetId]: true }));
      void queryClient.invalidateQueries({ queryKey: ["follow-counts"] });
    },
  });

  const message = useMutation({
    mutationFn: (targetId: string) => startDirectChat(targetId),
    onSuccess: (conversationId) => {
      void navigate({ to: "/chat/$id", params: { id: conversationId } });
    },
  });

  const people = results.data?.people ?? [];

  return (
    <Screen title="Find Friends">
      <div className="field field-focus flex items-center gap-2">
        <SearchIcon className="size-4 text-muted-foreground" />
        <input
          className="w-full bg-transparent outline-none"
          placeholder="Search users"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          autoFocus
        />
      </div>

      {term.trim().length < 2 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Type a name or username to find people on MzansiTalk.
        </p>
      ) : results.isLoading ? (
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No members found.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <Link to="/u/$username" params={{ username: person.username }} className="shrink-0">
                <Avatar path={person.avatar_url} name={person.name} size={44} />
              </Link>
              <Link
                to="/u/$username"
                params={{ username: person.username }}
                className="min-w-0 flex-1"
              >
                <span className="block truncate text-sm font-semibold">{person.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{person.username}
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => follow.mutate(person.id)}
                  disabled={followed[person.id] === true}
                  className="btn-base btn-primary px-3 py-2 text-xs disabled:opacity-60"
                >
                  <UserPlus className="size-4" />
                  {followed[person.id] === true ? "Following" : "Follow"}
                </button>
                <button
                  type="button"
                  onClick={() => message.mutate(person.id)}
                  className="btn-base bg-secondary px-3 py-2 text-xs text-secondary-foreground"
                >
                  <MessageCircle className="size-4" />
                  Message
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
