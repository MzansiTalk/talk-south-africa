import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { AdSlot, PostCard } from "@/components/PostCard";
import { Screen } from "@/components/Shell";
import { fetchFeed } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/reels")({
  head: () => ({
    meta: [
      { title: "Reels — MzansiTalk" },
      {
        name: "description",
        content: "Full screen MzansiTalk reels that auto play and loop. Swipe for the next one.",
      },
      { property: "og:title", content: "Reels — MzansiTalk" },
      { property: "og:description", content: "Short videos from creators across South Africa." },
    ],
  }),
  component: Reels,
});

function Reels() {
  const [term, setTerm] = useState("");
  const reels = useQuery({ queryKey: ["feed", "reels"], queryFn: () => fetchFeed("reel") });

  const items = (reels.data ?? []).filter((item) =>
    term.trim() ? (item.caption ?? "").toLowerCase().includes(term.trim().toLowerCase()) : true,
  );

  return (
    <Screen title="Reels">
      <div className="field field-focus mb-4 flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="w-full bg-transparent outline-none"
          placeholder="Search videos by caption, sound or hashtag"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No reels yet. Create one from the Create tab.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-4">
              <PostCard item={item} />
              {(index + 1) % 3 === 0 ? <AdSlot /> : null}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <AdSlot />
      </div>
    </Screen>
  );
}
