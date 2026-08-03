import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useRef, useState } from "react";

import {
  BannerAd,
  InterstitialAd,
  NativeAd,
  useInterstitialAfterEvery,
  VideoAd,
} from "@/components/Ads";
import { Composer } from "@/components/Composer";
import { LiveRail } from "@/components/LiveRail";
import { PostCard } from "@/components/PostCard";
import { Screen } from "@/components/Shell";
import { StatusRail } from "@/components/StatusRail";
import { fetchFeed } from "@/lib/api";

/** 1-based position of a post among the long videos in the feed. */
function videoIndex(items: { media_type: string | null }[], index: number) {
  let count = 0;
  for (let i = 0; i <= index; i += 1) {
    if ((items[i]?.media_type ?? "").startsWith("video")) count += 1;
  }
  return count;
}

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
  const statuses = useQuery({ queryKey: ["feed", "status"], queryFn: () => fetchFeed("status") });

  const [videosWatched, setVideosWatched] = useState(0);
  const seenVideos = useRef(new Set<string>());
  const videoInterstitial = useInterstitialAfterEvery(videosWatched, 3);

  /** Counts a long video as watched once it is mostly on screen, so ads run every 3 videos. */
  const observeVideo = (id: string) => (node: HTMLDivElement | null) => {
    if (!node || seenVideos.current.has(id)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !seenVideos.current.has(id)) {
            seenVideos.current.add(id);
            setVideosWatched((current) => current + 1);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
  };

  return (
    <Screen showSearch>
      {videoInterstitial.open ? (
        <InterstitialAd onClose={videoInterstitial.close} placement="video_interstitial" />
      ) : null}

      <LiveRail />
      <StatusRail items={statuses.data ?? []} />
      <Composer />

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
          {items.map((item, index) => {
            const isVideo = (item.media_type ?? "").startsWith("video");
            const target = { postId: item.id, contentKind: item.kind, ownerId: item.user_id };
            const videoNumber = isVideo ? videoIndex(items, index) : 0;
            return (
              <div
                key={item.id}
                {...(isVideo ? { ref: observeVideo(item.id) } : {})}
                className="space-y-4"
              >
                <PostCard item={item} />
                {isVideo && videoNumber % 3 === 0 && !item.deleted_by_admin ? (
                  <VideoAd target={target} />
                ) : null}
                {(index + 1) % 5 === 0 && !item.deleted_by_admin ? (
                  <NativeAd target={target} />
                ) : null}
              </div>
            );
          })}
          <BannerAd placement="home_banner" />
        </div>
      )}
    </Screen>
  );
}
