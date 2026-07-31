import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useState } from "react";

import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { search } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search — MzansiTalk" },
      {
        name: "description",
        content: "Search MzansiTalk for users by name or username, plus posts, reels and photos.",
      },
      { property: "og:title", content: "Search — MzansiTalk" },
      { property: "og:description", content: "Find people and content across MzansiTalk." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [term, setTerm] = useState("");
  const results = useQuery({
    queryKey: ["search", term],
    queryFn: () => search(term.trim()),
    enabled: term.trim().length > 1,
  });

  return (
    <Screen title="Search">
      <div className="field field-focus flex items-center gap-2">
        <SearchIcon className="size-4 text-muted-foreground" />
        <input
          className="w-full bg-transparent outline-none"
          placeholder="Users, posts, reels, photos"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          autoFocus
        />
      </div>

      {(results.data?.people ?? []).length > 0 ? (
        <section className="mt-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            People
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {(results.data?.people ?? []).map((person) => (
              <li key={person.id}>
                <Link
                  to="/u/$username"
                  params={{ username: person.username }}
                  className="flex items-center gap-3 p-3"
                >
                  <Avatar path={person.avatar_url} name={person.name} />
                  <span>
                    <span className="block text-sm font-semibold">{person.name}</span>
                    <span className="block text-xs text-muted-foreground">@{person.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(results.data?.content ?? []).length > 0 ? (
        <section className="mt-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Content
          </h2>
          {(results.data?.content ?? []).map((item) => (
            <PostCard key={item.id} item={item} />
          ))}
        </section>
      ) : null}

      {term.trim().length > 1 && !results.isLoading && (results.data?.people ?? []).length === 0 && (results.data?.content ?? []).length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No results for “{term}”.</p>
      ) : null}
    </Screen>
  );
}
