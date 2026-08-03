import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Heart, MessageCircle, MessageSquare, Share2, UserPlus } from "lucide-react";
import { useEffect } from "react";

import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { fetchNotifications, markNotificationsRead, type NotificationRow } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — MzansiTalk" },
      {
        name: "description",
        content: "Likes, comments, follows and MzansiTalk Support updates in one place.",
      },
      { property: "og:title", content: "Notifications — MzansiTalk" },
      { property: "og:description", content: "Stay on top of your MzansiTalk activity." },
    ],
  }),
  component: NotificationsPage,
});

function KindIcon({ kind }: { kind: string }) {
  const className = "size-4";
  if (kind.includes("like")) return <Heart className={className} />;
  if (kind.includes("comment")) return <MessageCircle className={className} />;
  if (kind.includes("follow")) return <UserPlus className={className} />;
  if (kind.includes("share")) return <Share2 className={className} />;
  if (kind.includes("message") || kind.includes("dm")) return <MessageSquare className={className} />;
  return <Bell className={className} />;
}

function NotificationRowItem({ item }: { item: NotificationRow }) {
  const body = (
    <span className="flex min-w-0 items-center gap-3">
      <span className="relative shrink-0">
        <Avatar path={item.actor?.avatar_url} name={item.actor?.name ?? "M"} size={40} />
        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <KindIcon kind={item.kind} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm">
          {item.actor?.name ? <span className="font-semibold">{item.actor.name} </span> : null}
          {item.message}
        </span>
        <span className="block text-xs text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
        </span>
      </span>
      {item.is_read ? null : <span className="ml-auto size-2 shrink-0 rounded-full bg-destructive" />}
    </span>
  );

  const className = `block p-3 ${item.is_read ? "" : "bg-secondary/40"}`;

  if (item.kind.includes("message") || item.kind.includes("dm")) {
    return (
      <li>
        <Link to="/chat" className={className}>
          {body}
        </Link>
      </li>
    );
  }

  if (item.kind.includes("status")) {
    return (
      <li>
        <Link to="/home" className={className}>
          {body}
        </Link>
      </li>
    );
  }

  if (item.actor?.username) {
    return (
      <li>
        <Link to="/u/$username" params={{ username: item.actor.username }} className={className}>
          {body}
        </Link>
      </li>
    );
  }

  return <li className={className}>{body}</li>;
}

function NotificationsPage() {
  const queryClient = useQueryClient();
  const items = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });

  useEffect(() => {
    void markNotificationsRead().then(() =>
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
    );
  }, [queryClient]);

  const list = items.data ?? [];

  return (
    <Screen title="Notifications">
      {list.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {list.map((item) => (
            <NotificationRowItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Screen>
  );
}
