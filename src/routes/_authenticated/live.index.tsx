import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Heart, Radio, Rocket, UserMinus, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCTS, requestPurchase } from "@/lib/billing";
import {
  addLiveComment,
  endLive,
  fetchJoinRequests,
  fetchLiveComments,
  fetchLiveLikes,
  fetchMyActiveLive,
  MAX_LIVE_GUESTS,
  MAX_LIVE_HOURS,
  setJoinStatus,
  startLive,
} from "@/lib/live";

export const Route = createFileRoute("/_authenticated/live/")({
  head: () => ({
    meta: [
      { title: "Go Live — MzansiTalk" },
      {
        name: "description",
        content:
          "Go Live on MzansiTalk for up to 4 hours, boost your live so everyone sees it, and bring up to 2 friends on video with you.",
      },
      { property: "og:title", content: "Go Live — MzansiTalk" },
      { property: "og:description", content: "Start a live broadcast on MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GoLivePage,
});

function countdown(endIso: string) {
  const left = new Date(endIso).getTime() - Date.now();
  if (left <= 0) return "0:00:00";
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function GoLivePage() {
  const queryClient = useQueryClient();
  const [boost, setBoost] = useState(false);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [tick, setTick] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const live = useQuery({ queryKey: ["my-live"], queryFn: fetchMyActiveLive });
  const streamId = live.data?.id ?? null;

  /** Boost Live is a digital item, so it must go through Google Play Billing. */
  const buyBoost = useMutation({
    mutationFn: () => requestPurchase("boost_live_r50"),
    onSuccess: (data) => {
      queryClient.setQueryData(["entitlements"], data);
      setBoost(true);
      toast.success("Boost Live is active for 24 hours.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const comments = useQuery({
    queryKey: ["live-comments", streamId],
    queryFn: () => fetchLiveComments(streamId!),
    enabled: Boolean(streamId),
  });
  const likes = useQuery({
    queryKey: ["live-likes", streamId],
    queryFn: () => fetchLiveLikes(streamId!),
    enabled: Boolean(streamId),
  });
  const requests = useQuery({
    queryKey: ["live-requests", streamId],
    queryFn: () => fetchJoinRequests(streamId!),
    enabled: Boolean(streamId),
  });

  // Realtime comments, likes and join requests while the host is broadcasting.
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase
      .channel(`live-host-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_comments" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-comments", streamId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_likes" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-likes", streamId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_join_requests" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-requests", streamId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  // 1 second clock for the 4 hour countdown.
  useEffect(() => {
    if (!streamId) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [streamId]);

  const stopCamera = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const openCamera = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = media;
      if (videoRef.current) videoRef.current.srcObject = media;
      chunksRef.current = [];
      const recorder = new MediaRecorder(media);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      return true;
    } catch {
      toast.error("Camera and microphone permission is needed to go live");
      return false;
    }
  };

  const begin = useMutation({
    mutationFn: async () => {
      const ready = await openCamera();
      if (!ready) throw new Error("Camera blocked");
      return startLive({ title, boosted: boost });
    },
    onSuccess: () => {
      setLimitReached(false);
      void queryClient.invalidateQueries({ queryKey: ["my-live"] });
      void queryClient.invalidateQueries({ queryKey: ["lives"] });
      toast.success(
        boost
          ? "You are LIVE and boosted — everyone can see you in the Home feed."
          : "You are LIVE. Your friends can see you now.",
      );
    },
    onError: (error: Error) => {
      stopCamera();
      if (error.message !== "Camera blocked") toast.error(error.message);
    },
  });

  const finish = useMutation({
    mutationFn: async () => {
      if (!streamId) return;
      const recorder = recorderRef.current;
      const recording = await new Promise<Blob | null>((resolve) => {
        if (!recorder || recorder.state === "inactive") {
          resolve(
            chunksRef.current.length ? new Blob(chunksRef.current, { type: "video/webm" }) : null,
          );
          return;
        }
        recorder.onstop = () =>
          resolve(
            chunksRef.current.length ? new Blob(chunksRef.current, { type: "video/webm" }) : null,
          );
        recorder.stop();
      });
      await endLive(streamId, recording);
      stopCamera();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-live"] });
      void queryClient.invalidateQueries({ queryKey: ["lives"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Live ended. It was saved to your profile for 60 days.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const post = useMutation({
    mutationFn: () => addLiveComment(streamId!, comment),
    onSuccess: () => {
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["live-comments", streamId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const decide = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "rejected" | "left" }) =>
      setJoinStatus(input.id, input.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["live-requests", streamId] }),
    onError: (error: Error) => toast.error(error.message),
  });

  // 4 hour cap: show "Timeline Limited" and end the live automatically.
  useEffect(() => {
    if (!live.data || limitReached) return;
    if (new Date(live.data.scheduled_end_at).getTime() > Date.now()) return;
    setLimitReached(true);
    finish.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, live.data?.scheduled_end_at]);

  const joined = (requests.data ?? []).filter((row) => row.status === "approved");
  const pending = (requests.data ?? []).filter((row) => row.status === "pending");

  if (!live.data) {
    return (
      <Screen title="Go Live">
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-destructive/15">
            <Radio className="size-8 text-destructive" />
          </span>
          <h2 className="mt-3 font-display text-lg font-bold">Go Live on MzansiTalk</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You can broadcast for up to {MAX_LIVE_HOURS} hours. Bring up to {MAX_LIVE_GUESTS} people
            on video with you.
          </p>

          <input
            className="field field-focus mt-4"
            placeholder="What is your live about? (optional)"
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
          />

          <button
            type="button"
            disabled={buyBoost.isPending}
            onClick={() => {
              if (boost) {
                setBoost(false);
                return;
              }
              buyBoost.mutate();
            }}
            aria-pressed={boost}
            className={`mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left disabled:opacity-60 ${
              boost ? "border-gold bg-gold/10" : "border-border bg-secondary"
            }`}
          >
            <Rocket className={`size-5 ${boost ? "text-gold" : "text-muted-foreground"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">
                Boost Live — {PRODUCTS.boost_live_r50.priceLabel} to reach more people
              </span>
              <span className="block text-xs text-muted-foreground">
                {buyBoost.isPending
                  ? "Opening Google Play…"
                  : boost
                    ? "Boosted: your live appears in the Home feed for everyone and you keep the Boosted badge for 24 hours."
                    : "Not boosted: only your friends will see this live. Tap to buy through Google Play."}
              </span>
            </span>
            <span
              className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${boost ? "bg-gold" : "bg-muted"}`}
            >
              <span
                className={`block size-5 rounded-full bg-background transition ${boost ? "translate-x-5" : ""}`}
              />
            </span>
          </button>

          <p className="mt-3 text-xs text-muted-foreground">
            Boost Live is a digital item, so it is sold through Google Play Billing — never a card
            or EFT. The Boosted badge lasts 24 hours; the live itself can run for up to{" "}
            {MAX_LIVE_HOURS} hours and its recording is saved to your profile for 60 days.
          </p>

          <button
            type="button"
            onClick={() => begin.mutate()}
            disabled={begin.isPending}
            className="btn-base mt-4 w-full bg-destructive text-destructive-foreground disabled:opacity-60"
          >
            <Radio className="size-4" /> {begin.isPending ? "Starting…" : "Go Live"}
          </button>
        </section>
      </Screen>
    );
  }

  return (
    <Screen title="You are Live">
      {limitReached ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
            <h2 className="font-display text-lg font-bold">Timeline Limited</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This live reached the {MAX_LIVE_HOURS} hour limit and has ended. It was saved to your
              profile.
            </p>
            <button
              type="button"
              onClick={() => setLimitReached(false)}
              className="btn-base btn-primary mt-4 w-full"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-[3/4] w-full object-cover"
        />
        <span className="absolute left-2 top-2 rounded bg-destructive px-2 py-0.5 text-[0.65rem] font-bold uppercase text-destructive-foreground">
          ● Live
        </span>
        <span className="absolute right-2 top-2 rounded bg-background/70 px-2 py-0.5 text-[0.65rem] font-bold">
          {countdown(live.data.scheduled_end_at)}
        </span>
        {live.data.is_boosted ? (
          <span className="absolute bottom-2 left-2 rounded bg-gold px-2 py-0.5 text-[0.6rem] font-bold uppercase text-background">
            Boosted
          </span>
        ) : null}
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-background/70 px-2 py-0.5 text-[0.65rem] font-semibold">
          <Heart className="size-3 text-destructive" /> {likes.data?.count ?? 0}
        </span>
      </div>

      <button
        type="button"
        onClick={() => finish.mutate()}
        disabled={finish.isPending}
        className="btn-base mt-3 w-full bg-destructive text-destructive-foreground disabled:opacity-60"
      >
        {finish.isPending ? "Ending…" : "End Live"}
      </button>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Users className="size-4" /> Join Requests ({pending.length})
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {joined.length}/{MAX_LIVE_GUESTS} on video with you. Extra requests stay pending until
          someone leaves.
        </p>

        {joined.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {joined.map((row) => (
              <li key={row.id} className="flex items-center gap-2">
                <Avatar path={row.member?.avatar_url} name={row.member?.name ?? "M"} size={30} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {row.member?.name} <span className="text-xs text-green-600">· on video</span>
                </span>
                <button
                  type="button"
                  onClick={() => decide.mutate({ id: row.id, status: "left" })}
                  className="btn-base bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                >
                  <UserMinus className="size-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No new requests.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((row) => (
              <li key={row.id} className="flex items-center gap-2">
                <Avatar path={row.member?.avatar_url} name={row.member?.name ?? "M"} size={30} />
                <span className="min-w-0 flex-1 truncate text-sm">{row.member?.name}</span>
                <button
                  type="button"
                  onClick={() => decide.mutate({ id: row.id, status: "approved" })}
                  className="btn-base btn-primary px-2 py-1 text-xs"
                >
                  <Check className="size-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide.mutate({ id: row.id, status: "rejected" })}
                  className="btn-base bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                >
                  <X className="size-3.5" /> Reject
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Live Comments</h2>
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
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
            <li className="text-sm text-muted-foreground">No comments yet.</li>
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
            placeholder="Say something to your viewers"
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
