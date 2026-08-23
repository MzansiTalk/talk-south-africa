import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, PlayCircle } from "lucide-react";

import { PublicPage } from "@/components/PublicShell";
import { fetchPublicVideos, type PublicVideo } from "@/lib/public-videos.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MzansiTalk — Watch Free South African Videos" },
      {
        name: "description",
        content:
          "Watch free South African videos and reels on MzansiTalk — no login needed. Sign up free to post, comment, like and follow Mzansi creators.",
      },
      { property: "og:title", content: "MzansiTalk — Watch Free South African Videos" },
      {
        property: "og:description",
        content:
          "Free video entertainment from across South Africa. Press play instantly, no account required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicHome,
});

function formatViews(views: number) {
  if (views >= 1000) return `${(views / 1000).toFixed(1)}k views`;
  return `${views} view${views === 1 ? "" : "s"}`;
}

function VideoCard({ video }: { video: PublicVideo }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <Link
        to="/watch/$id"
        params={{ id: video.id }}
        className="relative block aspect-video w-full overflow-hidden bg-muted"
        aria-label={`Play ${video.caption}`}
      >
        <video
          src={video.url}
          className="h-full w-full object-cover"
          preload="metadata"
          muted
          playsInline
        />
        <span className="absolute inset-0 flex items-center justify-center bg-background/25">
          <PlayCircle className="size-12 text-foreground drop-shadow" />
        </span>
        <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[0.66rem] font-bold uppercase">
          {video.kind === "reel" ? "Reel" : "Video"}
        </span>
      </Link>
      <div className="p-3">
        <h3 className="truncate font-display text-sm font-bold">{video.caption}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {video.caption} — shared on MzansiTalk by {video.authorName}. Free to watch, no account
          needed.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
          <Eye className="size-3.5" /> {formatViews(video.views)} · @{video.authorUsername}
        </p>
      </div>
    </article>
  );
}

function PublicHome() {
  const videos = useQuery({ queryKey: ["public-videos"], queryFn: () => fetchPublicVideos() });
  const items = videos.data ?? [];

  return (
    <PublicPage>
      <section className="rounded-3xl border border-border bg-card p-6 text-center sm:p-10">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          Free South African video entertainment
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          MzansiTalk is where South Africa watches and shares short videos, reels and everyday
          moments. Press play on anything below — watching is free and open to everyone. Create a
          free account when you want to upload, comment, like and follow creators.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/register" className="btn-base btn-gold px-4 py-2 font-bold">
            Sign Up Free
          </Link>
          <Link
            to="/login"
            className="btn-base border border-border bg-secondary px-4 py-2 font-bold text-secondary-foreground"
          >
            Login
          </Link>
        </div>
      </section>

      <h2 className="mt-10 font-display text-xl font-bold">Watch now</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap any video to play it straight away — no login, no pop-ups.
      </p>

      {videos.isLoading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="h-56 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          New videos are being uploaded right now. Please check back in a moment.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </PublicPage>
  );
}
