import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/Shell";
import { fetchNotifications } from "@/lib/api";

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

function NotificationsPage() {
  const items = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });

  return (
    <Screen title="Notifications">
      {(items.data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {(items.data ?? []).map((item) => (
            <li key={item.id} className="p-3 text-sm">
              <span className="font-semibold capitalize">{item.kind}</span> — {item.message}
              <span className="block text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
