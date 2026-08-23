import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { Eye, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { PublicPage, useSessionState } from "@/components/PublicShell";
import { fetchPublicVideo, fetchPublicVideos } from "@/lib/public-videos.functions";

export const Route = createFileRoute("/watch/$id")({
  head: () => ({
    meta: [
      { title: "Watch a free video — MzansiTalk" },
      {
        name: "description",
        content:
          "Play this South African video for free on MzansiTalk. No account needed to watch — sign up free to comment, like and post your own.",
      },
      { property: "og:title", content: "Watch a free video — MzansiTalk" },
      {
        property: "og:description",
        content: "Free video from MzansiTalk creators. Press play, no login required.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const { id } = useParams({ from: "/watch/$id" });
  const navigate = useNavigate();
  const signedIn = useSessionState();

  const video = useQuery({
    queryKey: ["public-video", id],
    queryFn: () => fetchPublicVideo({ data: { id } }),
  });
  const more = useQuery({ queryKey: ["public-videos"], queryFn: () => fetchPublicVideos() });

  const requireLogin = (action: string) => {
    toast.error(`Please Login to ${action}`);
    void navigate({ to: "/login" });
  };

  const item = video.data ?? null;

  return (
    <PublicPage>
      {video.isLoading ? (
        <div className="aspect-video w-full animate-pulse rounded-2xl bg-muted" />
      ) : !item ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-xl font-bold">This video is not available</h1>
          <Link to="/" className="btn-base btn-primary mt-4">
            Back to all videos
          </Link>
        </div>
      ) : (
        <article>
          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            <video
              src={item.url}
              className="h-auto max-h-[75vh] w-full"
              controls
              autoPlay
              playsInline
              preload="auto"
            />
          </div>

          <h1 className="mt-4 font-display text-2xl font-bold">{item.caption}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              {item.authorName} · @{item.authorUsername}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="size-4" /> {item.views.toLocaleString()} views
            </span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {signedIn ? (
              <>
                <Link to="/home" className="btn-base btn-primary px-4 py-2">
                  <Heart className="size-4" /> Like &amp; comment in the app
                </Link>
                <Link
                  to="/create"
                  className="btn-base border border-border bg-secondary px-4 py-2 text-secondary-foreground"
                >
                  Post your own video
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => requireLogin("like")}
                  className="btn-base border border-border bg-secondary px-4 py-2 text-secondary-foreground"
                >
                  <Heart className="size-4" /> Like
                </button>
                <button
                  type="button"
                  onClick={() => requireLogin("comment")}
                  className="btn-base border border-border bg-secondary px-4 py-2 text-secondary-foreground"
                >
                  <MessageCircle className="size-4" /> Comment
                </button>
                <button
                  type="button"
                  onClick={() => requireLogin("follow")}
                  className="btn-base border border-border bg-secondary px-4 py-2 text-secondary-foreground"
                >
                  Follow
                </button>
              </>
            )}
          </div>

          {signedIn ? null : (
            <div
              className="mt-4 rounded-2xl border border-border bg-card p-4"
              onClick={() => requireLogin("comment")}
            >
              <p className="text-sm font-semibold">Comments</p>
              <input
                readOnly
                placeholder="Please Login to comment"
                className="field field-focus mt-2 cursor-pointer"
                aria-label="Please Login to comment"
              />
            </div>
          )}
        </article>
      )}

      <h2 className="mt-10 font-display text-lg font-bold">More free videos</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(more.data ?? [])
          .filter((row) => row.id !== id)
          .slice(0, 6)
          .map((row) => (
            <Link
              key={row.id}
              to="/watch/$id"
              params={{ id: row.id }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-video w-full bg-muted">
                <video
                  src={row.url}
                  className="h-full w-full object-cover"
                  preload="metadata"
                  muted
                  playsInline
                />
              </div>
              <p className="truncate p-3 text-sm font-semibold">{row.caption}</p>
            </Link>
          ))}
      </div>
    </PublicPage>
  );
}
