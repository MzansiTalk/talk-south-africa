import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PostCard } from "@/components/PostCard";
import { ReelPreRollAd } from "@/components/ReelPreRollAd";
import { Screen } from "@/components/Shell";
import { fetchFeed } from "@/lib/api";
import { countView } from "@/lib/creators";
import { pauseAllVideos } from "@/lib/reel-preroll";



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
  const seen = useRef(new Set<string>());
  const reels = useQuery({ queryKey: ["feed", "reels"], queryFn: () => fetchFeed("reel") });

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
            observer.disconnect();
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
  };

  const [adKey, setAdKey] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const pending = useRef<HTMLElement | null>(null);
  const bypass = useRef(false);

  /**
   * Reels page only: plays a fresh HilltopAds VAST pre-roll, then opens the
   * reel the member clicked. Autoplay previews while scrolling are untouched.
   */
  const playReelWithAd = (trigger: HTMLElement) => {
    pauseAllVideos();
    pending.current = trigger;
    setAdKey((key) => key + 1);
    setShowAd(true);
  };

  const onAdDone = () => {
    setShowAd(false);
    const trigger = pending.current;
    pending.current = null;
    if (!trigger) return;
    bypass.current = true;
    trigger.click();
    setTimeout(() => {
      bypass.current = false;
    }, 0);
  };

  const interceptWatchClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (bypass.current || showAd) return;
    const target = event.target as HTMLElement | null;
    const trigger = target?.closest<HTMLElement>('button[aria-label="Open in full screen"]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    playReelWithAd(trigger);
  };

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
        <div className="space-y-4" onClickCapture={interceptWatchClick}>
          {items.map((item) => (
            <div key={item.id} ref={observe(item.id)} className="space-y-4">
              <PostCard item={item} />
            </div>
          ))}
        </div>
      )}

      {showAd ? <ReelPreRollAd key={adKey} onDone={onAdDone} /> : null}
    </Screen>
  );
}


