import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Eye,
  Facebook,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Rocket,
  Send,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, SignedMedia } from "@/components/SignedMedia";
import {
  addComment,
  deletePost,
  fetchComments,
  fetchConversations,
  sharePostToChat,
  sharePostToTimeline,
  toggleLike,
  toggleSave,
  type FeedItem,
} from "@/lib/api";
import { createReport } from "@/lib/moderation";



export function PostCard({ item }: { item: FeedItem }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [draft, setDraft] = useState("");
  const [repostCaption, setRepostCaption] = useState("");


  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["profile-content"] });
    void queryClient.invalidateQueries({ queryKey: ["saved"] });
  };

  const like = useMutation({
    mutationFn: () => toggleLike(item.id, item.likedByMe),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const save = useMutation({
    mutationFn: () => toggleSave(item.id, item.savedByMe),
    onSuccess: () => {
      invalidate();
      toast.success(item.savedByMe ? "Removed from Saved" : "Saved to your collection");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: () => deletePost(item.id, item.user_id),
    onSuccess: (byAdmin) => {
      invalidate();
      toast.success(byAdmin ? "Deleted by MzansiTalk Support" : "Post deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const chats = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    enabled: showShare,
  });

  const shareToChat = useMutation({
    mutationFn: (conversationId: string) => sharePostToChat(item.id, conversationId),
    onSuccess: () => {
      setShowShare(false);
      toast.success("Shared in chat");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const report = useMutation({
    mutationFn: () =>
      createReport({
        postId: item.id,
        reportedUserId: item.user_id,
        reason: "Reported by a member",
        details: item.caption ?? null,
      }),
    onSuccess: () => toast.success("Report sent to MzansiTalk Support"),
    onError: (error: Error) => toast.error(error.message),
  });

  const comments = useQuery({
    queryKey: ["comments", item.id],
    queryFn: () => fetchComments(item.id),
    enabled: showComments,
  });


  const post = useMutation({
    mutationFn: () => addComment(item.id, draft.trim()),
    onSuccess: () => {
      setDraft("");
      void comments.refetch();
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const shareLink = `${typeof window === "undefined" ? "" : window.location.origin}/u/${item.author?.username ?? ""}`;
  const shareText = `${item.caption ?? "Check this out on MzansiTalk"} ${shareLink}`;

  const repost = useMutation({
    mutationFn: () => sharePostToTimeline(item.id, repostCaption),
    onSuccess: () => {
      setShowShare(false);
      setRepostCaption("");
      invalidate();
      toast.success("Posted to your timeline");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copyLink = async () => {
    await navigator.clipboard?.writeText(shareLink).catch(() => undefined);
    toast.success("Link copied — open Vidmate and paste it there.");
  };


  const author = item.author;
  const boostActive = item.boost_expires_at
    ? new Date(item.boost_expires_at) > new Date()
    : Number(item.boost_amount) > 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-3 p-3">
        <Link
          to="/u/$username"
          params={{ username: author?.username ?? "" }}
          className="flex items-center gap-3"
        >
          <Avatar path={author?.avatar_url} name={author?.name ?? "M"} />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              {author?.name ?? "MzansiTalk User"}
              {author?.is_viral ? (
                <span className="rounded-full bg-gold-gradient px-2 py-0.5 text-[0.62rem] font-bold uppercase text-gold-foreground">
                  Trending
                </span>
              ) : null}
              {boostActive ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.62rem] font-bold uppercase text-secondary-foreground">
                  Sponsored
                </span>
              ) : null}
            </span>
            <span className="block text-xs text-muted-foreground">
              @{author?.username ?? "user"} · {new Date(item.created_at).toLocaleDateString()}
            </span>
          </span>
        </Link>

        <details className="relative ml-auto">
          <summary className="btn-base cursor-pointer list-none bg-transparent px-2 text-muted-foreground">
            <MoreHorizontal className="size-5" />
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-popover text-sm shadow-brand">
            <button
              type="button"
              onClick={() => remove.mutate()}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-destructive"
            >
              <Trash2 className="size-4" /> Delete
            </button>
            <Link
              to="/boost/$postId"
              params={{ postId: item.id }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <Rocket className="size-4 text-gold" /> Boost
            </Link>
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
              <Send className="size-4" /> Send in Chat
            </button>
            <button
              type="button"
              onClick={() => report.mutate()}
              disabled={report.isPending}
              className="w-full px-3 py-2.5 text-left"
            >
              Report
            </button>

          </div>
        </details>
      </div>

      {item.caption ? <p className="px-3 pb-3 text-sm leading-relaxed">{item.caption}</p> : null}

      {item.media_url ? (
        <SignedMedia
          path={item.media_url}
          type={item.media_type}
          className="max-h-[70vh] w-full object-cover"
          autoPlay
          loop={item.kind === "reel"}
        />
      ) : null}

      <div className="flex items-center gap-1 p-2">
        <button
          type="button"
          onClick={() => like.mutate()}
          className={`btn-base bg-transparent text-sm ${item.likedByMe ? "text-primary" : "text-muted-foreground"}`}
        >
          <Heart className={`size-5 ${item.likedByMe ? "fill-current" : ""}`} /> {item.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
          className="btn-base bg-transparent text-sm text-muted-foreground"
        >
          <MessageCircle className="size-5" /> {item.commentCount}
        </button>
        <button
          type="button"
          onClick={() => setShowShare((value) => !value)}
          className="btn-base bg-transparent text-sm text-muted-foreground"
          aria-label="Share"
        >
          <Share2 className="size-5" />
        </button>
        <span className="btn-base bg-transparent text-sm text-muted-foreground" title="Views">
          <Eye className="size-5" /> {Number(item.views ?? 0).toLocaleString()}
        </span>

        <button
          type="button"
          onClick={() => save.mutate()}
          className={`btn-base ml-auto bg-transparent text-sm ${item.savedByMe ? "text-gold" : "text-muted-foreground"}`}
        >
          <Bookmark className={`size-5 ${item.savedByMe ? "fill-current" : ""}`} />
        </button>
      </div>

      {showShare ? (
        <div className="space-y-3 border-t border-border p-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Share this {item.kind}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-base justify-start bg-secondary text-secondary-foreground"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-base justify-start bg-secondary text-secondary-foreground"
              >
                <Facebook className="size-4" /> Facebook
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="btn-base justify-start bg-secondary text-secondary-foreground"
              >
                <Link2 className="size-4" /> Vidmate
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="btn-base justify-start bg-secondary text-secondary-foreground"
              >
                <Users className="size-4" /> Copy link
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Share to my own timeline
            </p>
            <textarea
              className="field field-focus mt-2 min-h-16"
              placeholder="Write something about this..."
              value={repostCaption}
              onChange={(event) => setRepostCaption(event.target.value)}
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => repost.mutate()}
              disabled={repost.isPending}
              className="btn-base btn-primary mt-2 w-full"
            >
              Post to My Timeline
            </button>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Groups and chats in MzansiTalk
            </p>
            <ul className="mt-2 space-y-2">
              {(chats.data ?? []).map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => shareToChat.mutate(chat.id)}
                    className="btn-base w-full justify-start bg-secondary text-secondary-foreground"
                  >
                    {chat.is_group
                      ? chat.title || "Group Chat"
                      : (chat.members.map((member) => member.name).join(", ") || "Chat")}
                  </button>
                </li>
              ))}
              {(chats.data ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  No chats or groups yet. Start one from the Messages tab.
                </li>
              ) : null}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setShowShare(false)}
            className="btn-base bg-transparent text-xs text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      ) : null}


      {showComments ? (
        <div className="border-t border-border p-3">
          <div className="space-y-3">
            {(comments.data ?? []).map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Link to="/u/$username" params={{ username: comment.author?.username ?? "" }}>
                  <Avatar path={comment.author?.avatar_url} name={comment.author?.name ?? "M"} size={28} />
                </Link>
                <p className="text-sm">
                  <Link
                    to="/u/$username"
                    params={{ username: comment.author?.username ?? "" }}
                    className="font-semibold"
                  >
                    {comment.author?.name ?? "User"}
                  </Link>{" "}
                  {comment.body}
                </p>
              </div>
            ))}
            {(comments.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : null}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) post.mutate();
            }}
          >
            <input
              className="field field-focus"
              placeholder="Write a comment"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={500}
            />
            <button type="submit" className="btn-base btn-primary">
              Send
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

export function AdSlot() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Advertisement
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ad slot reserved — mobile ad network connects on the native build.
      </p>
    </div>
  );
}
