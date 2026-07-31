import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Flame } from "lucide-react";

import { AdSlot, PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { fetchFeed } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home Feed — MzansiTalk" },
      {
        name: "description",
        content: "Your MzansiTalk home feed: posts, photos, videos and reels from all of Mzansi.",
      },
      { property: "og:title", content: "Home Feed — MzansiTalk" },
      { property: "og:description", content: "Posts, photos, videos and reels from all of Mzansi." },
    ],
  }),
  component: HomeFeed,
});

function HomeFeed() {
  const feed = useQuery({ queryKey: ["feed", "home"], queryFn: () => fetchFeed() });
  const items = (feed.data ?? []).filter((item) => item.kind !== "status");
  const topBoosters = [...(feed.data ?? [])]
    .filter((item) => Number(item.boost_amount) > 0)
    .slice(0, 10);

  return (
    <Screen showSearch>
      <section className="mb-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Crown className="size-4 text-gold" /> Top Boosters This Week
        </h2>
        {topBoosters.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No boosts yet this week. Boosting arrives with the payments release.
          </p>
        ) : (
          <ol className="mt-3 flex gap-4 overflow-x-auto no-scrollbar">
            {topBoosters.map((item, index) => (
              <li key={item.id} className="flex w-16 flex-col items-center gap-1 text-center">
                <Avatar path={item.author?.avatar_url} name={item.author?.name ?? "M"} size={48} />
                <span className="truncate text-[0.68rem] font-semibold">
                  #{index + 1} @{item.author?.username}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {feed.isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Flame className="mx-auto size-8 text-gold" />
          <h2 className="mt-3 font-display text-lg font-bold">The feed is quiet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to post something on MzansiTalk.
          </p>
          <Link to="/create" className="btn-base btn-primary mt-4">
            Create a post
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-4">
              <PostCard item={item} />
              {(index + 1) % 5 === 0 ? <AdSlot /> : null}
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}
