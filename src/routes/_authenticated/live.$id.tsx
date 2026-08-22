import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Heart, Radio, Share2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/api";
import {
  addLiveComment,
  fetchJoinRequests,
  fetchLive,
  fetchLiveComments,
  fetchLiveLikes,
  leaveLive,
  MAX_LIVE_HOURS,
  requestToJoin,
  shareLiveToTimeline,
  toggleLiveLike,
} from "@/lib/live";

export const Route = createFileRoute("/_authenticated/live/$id")({
  head: () => ({
    meta: [
      { title: "Live — MzansiTalk" },
      {
        name: "description",
        content:
          "Watch a MzansiTalk live stream: comment, like, share it to your timeline and request to join the host on video.",
      },
      { property: "og:title", content: "Live — MzansiTalk" },
      { property: "og:description", content: "Watch a MzansiTalk live stream." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LiveViewer,
});

function LiveViewer() {
  const { id } = useParams({ from: "/_authenticated/live/$id" });
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [limited, setLimited] = useState(false);

  const me = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const live = useQuery({ queryKey: ["live", id], queryFn: () => fetchLive(id), refetchInterval: 15_000 });
  const comments = useQuery({ queryKey: ["live-comments", id], queryFn: () => fetchLiveComments(id) });
  const likes = useQuery({ queryKey: ["live-likes", id], queryFn: () => fetchLiveLikes(id) });
  const requests = useQuery({ queryKey: ["live-requests", id], queryFn: () => fetchJoinRequests(id) });

  useEffect(() => {
    const channel = supabase
      .channel(`live-view-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_comments" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-comments", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_likes" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-likes", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_join_requests" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-requests", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live", id] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // "Timeline Limited" popup for every viewer once the 4 hour cap is hit.
  useEffect(() => {
    const stream = live.data;
    if (!stream) return;
    const over =
      stream.status !== "live" || new Date(stream.scheduled_end_at).getTime() <= Date.now();
    if (over) setLimited(true);
  }, [live.data]);

  const post = useMutation({
    mutationFn: () => addLiveComment(id, comment),
    onSuccess: () => {
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["live-comments", id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const like = useMutation({
    mutationFn: () => toggleLiveLike(id, likes.data?.likedByMe ?? false),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["live-likes", id] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const share = useMutation({
    mutationFn: () => shareLiveToTimeline(live.data!),
    onSuccess: () => toast.success("Shared to your timeline only."),
    onError: (error: Error) => toast.error(error.message),
  });

  const ask = useMutation({
    mutationFn: () => requestToJoin(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["live-requests", id] });
      toast.success("Request sent. Wait for the host to approve you.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leave = useMutation({
    mutationFn: () => leaveLive(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["live-requests", id] });
      toast.success("You left the live. Request again to come back.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stream = live.data;
  const mine = (requests.data ?? []).find((row) => row.user_id === me.data?.id);
  const joined = (requests.data ?? []).filter((row) => row.status === "approved");

  if (!stream) {
    return (
      <Screen title="Live">
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {live.isLoading ? "Loading live…" : "This live is no longer available."}
        </p>
      </Screen>
    );
  }

  return (
    <Screen title={stream.host?.name ? `${stream.host.name} Live` : "Live"}>
      {limited ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
            <h2 className="font-display text-lg font-bold">Timeline Limited</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This live has ended (max {MAX_LIVE_HOURS} hours). You can find it on{" "}
              {stream.host?.name ?? "the host"}&apos;s profile.
            </p>
            <Link
              to="/u/$username"
              params={{ username: stream.host?.username ?? "" }}
              className="btn-base btn-primary mt-4 w-full"
            >
              Open profile
            </Link>
          </div>
        </div>
      ) : null}

      <div className="relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-2xl bg-black text-center">
        <div>
          <Avatar path={stream.host?.avatar_url} name={stream.host?.name ?? "M"} size={72} />
          <p className="mt-3 text-sm font-bold text-primary-foreground">{stream.host?.name}</p>
          <p className="mt-1 px-6 text-xs text-primary-foreground/70">
            {stream.title ?? "Live now on MzansiTalk"}
          </p>
        </div>
        <span className="absolute left-2 top-2 rounded bg-destructive px-2 py-0.5 text-[0.65rem] font-bold uppercase text-destructive-foreground">
          ● Live
        </span>
        {stream.is_boosted ? (
          <span className="absolute right-2 top-2 rounded bg-gold px-2 py-0.5 text-[0.6rem] font-bold uppercase text-background">
            Boosted
          </span>
        ) : null}
        {joined.length > 0 ? (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {joined.map((row) => (
              <Avatar key={row.id} path={row.member?.avatar_url} name={row.member?.name ?? "M"} size={28} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => like.mutate()}
          className={`btn-base py-2 text-xs ${
            likes.data?.likedByMe ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"
          }`}
        >
          <Heart className="size-4" /> {likes.data?.count ?? 0}
        </button>
        <button
          type="button"
          onClick={() => share.mutate()}
          className="btn-base bg-secondary py-2 text-xs text-secondary-foreground"
        >
          <Share2 className="size-4" /> Share
        </button>
        {mine?.status === "approved" ? (
          <button
            type="button"
            onClick={() => leave.mutate()}
            className="btn-base bg-destructive py-2 text-xs text-destructive-foreground"
          >
            Leave Live
          </button>
        ) : (
          <button
            type="button"
            onClick={() => ask.mutate()}
            disabled={mine?.status === "pending"}
            className="btn-base btn-primary py-2 text-xs disabled:opacity-60"
          >
            <UserPlus className="size-4" />
            {mine?.status === "pending" ? "Pending" : "Request to Join"}
          </button>
        )}
      </div>

      {mine?.status === "rejected" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          The host did not approve your last request. You can request again.
        </p>
      ) : null}

      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Radio className="size-3.5 text-destructive" /> Shares go to your own timeline only — never
        the main feed.
      </p>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Comments</h2>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {(comments.data ?? []).map((row) => (
            <li key={row.id} className="flex items-start gap-2">
              <Avatar path={row.author?.avatar_url} name={row.author?.name ?? "M"} size={26} />
              <p className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">{row.author?.name ?? "Member"}</span>{" "}
                <span className="text-muted-foreground">{row.body}</span>
              </p>
            </li>
          ))}
          {(comments.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">Be the first to comment.</li>
          ) : null}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (comment.trim()) post.mutate();
          }}
        >
          <input
            className="field field-focus"
            placeholder="Add a comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <button type="submit" className="btn-base btn-primary px-3 text-xs">
            Send
          </button>
        </form>
      </section>
    </Screen>
  );
}
