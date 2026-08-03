import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  BannerAd,
  InterstitialAd,
  useInterstitialAfterEvery,
  VideoAd,
} from "@/components/Ads";

import { PostCard } from "@/components/PostCard";
import { Screen } from "@/components/Shell";
import { fetchFeed } from "@/lib/api";
import { countView } from "@/lib/creators";


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
  validateSearch: (search: Record<string, unknown>) => ({
    post: typeof search['post'] === "string" ? (search['post'] as string) : "",
  }),
  component: Reels,
});

function Reels() {
  const { post } = Route.useSearch();
  const [term, setTerm] = useState("");
  const [watched, setWatched] = useState(0);
  const seen = useRef(new Set<string>());
  const reels = useQuery({ queryKey: ["feed", "reels"], queryFn: () => fetchFeed("reel") });
  const interstitial = useInterstitialAfterEvery(watched, 3);

  const filtered = (reels.data ?? []).filter((item) =>
    term.trim() ? (item.caption ?? "").toLowerCase().includes(term.trim().toLowerCase()) : true,
  );
  // Opening a reel from a profile grid puts that reel at the top of the player.
  const items = post
    ? [...filtered].sort((a, b) => Number(b.id === post) - Number(a.id === post))
    : filtered;

  useEffect(() => {
    for (const item of items.slice(0, 5)) void countView(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reels.data]);

  /** Counts a reel as "watched" once it is mostly on screen. */
  const observe = (id: string) => (node: HTMLDivElement | null) => {
    if (!node || seen.current.has(id)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !seen.current.has(id)) {
            seen.current.add(id);
            setWatched((current) => current + 1);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
  };

  return (
    <Screen title="Reels">
      {interstitial.open ? (
        <InterstitialAd
          onClose={interstitial.close}
          placement="reel_interstitial"
          {...(items[0]
            ? { target: { postId: items[0].id, contentKind: "reel", ownerId: items[0].user_id } }
            : {})}
        />
      ) : null}

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
            <div key={item.id} ref={observe(item.id)} className="space-y-4">
              <PostCard item={item} />
              {(index + 1) % 3 === 0 && !item.deleted_by_admin ? (
                <VideoAd target={{ postId: item.id, contentKind: "reel", ownerId: item.user_id }} />
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[3.6rem] z-20 mx-auto w-full max-w-2xl px-3">
        <BannerAd
          placement="reel_banner"
          {...(items[0]
            ? { target: { postId: items[0].id, contentKind: "reel", ownerId: items[0].user_id } }
            : {})}
        />
      </div>
    </Screen>
  );
}

