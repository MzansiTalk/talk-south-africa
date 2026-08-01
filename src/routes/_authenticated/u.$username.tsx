import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { PostCard } from "@/components/PostCard";
import { Avatar, useMediaUrl } from "@/components/SignedMedia";
import { Screen, useIsAdmin } from "@/components/Shell";
import {
  fetchFollowCounts,
  fetchProfileByUsername,
  fetchUserContent,
  isBlocked,
  isFollowing,
  setBlock,
  setFollow,
  startDirectChat,
} from "@/lib/api";


export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Profile — MzansiTalk" },
      { name: "description", content: "View a MzansiTalk member's profile, photos and reels." },
      { property: "og:title", content: "Profile — MzansiTalk" },
      { property: "og:description", content: "Follow members and watch their posts and reels." },
    ],
  }),
  component: UserProfile,
});

function UserProfile() {
  const { isAdmin } = useIsAdmin();

  const { username } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();


  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: () => fetchProfileByUsername(username),
  });
  const target = profile.data;
  const cover = useMediaUrl(target?.cover_url);

  const counts = useQuery({
    queryKey: ["follow-counts", target?.id],
    queryFn: () => fetchFollowCounts(target!.id),
    enabled: Boolean(target?.id),
  });
  const following = useQuery({
    queryKey: ["is-following", target?.id],
    queryFn: () => isFollowing(target!.id),
    enabled: Boolean(target?.id),
  });
  const content = useQuery({
    queryKey: ["profile-content", target?.id],
    queryFn: () => fetchUserContent(target!.id),
    enabled: Boolean(target?.id),
  });

  const follow = useMutation({
    mutationFn: () => setFollow(target!.id, !following.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["is-following", target?.id] });
      void queryClient.invalidateQueries({ queryKey: ["follow-counts", target?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const blocked = useQuery({
    queryKey: ["is-blocked", target?.id],
    queryFn: () => isBlocked(target!.id),
    enabled: Boolean(target?.id),
  });

  const block = useMutation({
    mutationFn: () => setBlock(target!.id, !blocked.data),
    onSuccess: () => {
      toast.success(
        blocked.data
          ? "User unblocked. You can see and message each other again."
          : "User blocked. They can no longer message you or see your posts.",
      );
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const message = useMutation({
    mutationFn: () => startDirectChat(target!.id),
    onSuccess: (id) => navigate({ to: "/chat/$id", params: { id } }),
    onError: (error: Error) => toast.error(error.message),
  });


  if (profile.isLoading) {
    return (
      <Screen title="Profile">
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!target) {
    return (
      <Screen title="Profile">
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          This profile is not available.
        </p>
      </Screen>
    );
  }

  return (
    <Screen title={`@${target.username}`}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="h-32 bg-brand">
          {cover.data ? (
            <img src={cover.data} alt="Cover photo" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="px-4 pb-4">
          <div className="-mt-8 inline-block rounded-full ring-4 ring-card">
            <Avatar path={target.avatar_url} name={target.name} size={72} />
          </div>
          <h1 className="mt-2 font-display text-xl font-bold">{target.name}</h1>
          <p className="text-sm text-muted-foreground">@{target.username}</p>
          {isAdmin ? (
            <p className="mt-1 text-xs font-bold text-destructive">
              Strikes: {target.strikes ?? 0}/3{target.is_banned ? " · BANNED" : ""}
            </p>
          ) : null}
          {target.bio ? <p className="mt-2 text-sm">{target.bio}</p> : null}


          <div className="mt-3 flex gap-5 text-sm">
            <span>
              <span className="font-bold">{counts.data?.followers ?? 0}</span>{" "}
              <span className="text-muted-foreground">Followers</span>
            </span>
            <span>
              <span className="font-bold">{counts.data?.following ?? 0}</span>{" "}
              <span className="text-muted-foreground">Following</span>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => follow.mutate()}
              className={`btn-base ${following.data ? "bg-secondary text-secondary-foreground" : "btn-primary"}`}
            >
              {following.data ? "Unfollow" : "Follow"}
            </button>
            <button
              type="button"
              onClick={() => message.mutate()}
              disabled={message.isPending}
              className="btn-base bg-secondary text-secondary-foreground"
            >
              <MessageSquare className="size-4" /> Message
            </button>
            <button
              type="button"
              onClick={() => block.mutate()}
              className="btn-base bg-transparent text-destructive"
            >
              {blocked.data ? "Unblock" : "Block"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {(content.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No content yet.
          </p>
        ) : (
          (content.data ?? []).map((item) => <PostCard key={item.id} item={item} />)
        )}
      </div>
    </Screen>
  );
}
