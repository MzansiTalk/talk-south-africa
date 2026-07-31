import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AdSlot, PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { fetchFeed } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/status")({
  head: () => ({
    meta: [
      { title: "Status — MzansiTalk" },
      {
        name: "description",
        content: "24 hour photo and video status updates from the people you follow on MzansiTalk.",
      },
      { property: "og:title", content: "Status — MzansiTalk" },
      { property: "og:description", content: "Status updates that disappear after 24 hours." },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const statuses = useQuery({ queryKey: ["feed", "status"], queryFn: () => fetchFeed("status") });
  const items = statuses.data ?? [];

  return (
    <Screen title="Status">
      <div className="mb-4 flex gap-4 overflow-x-auto no-scrollbar">
        {items.map((item) => (
          <div key={item.id} className="flex w-16 flex-col items-center gap-1 text-center">
            <span className="rounded-full bg-gold-gradient p-[2px]">
              <Avatar path={item.author?.avatar_url} name={item.author?.name ?? "M"} size={52} />
            </span>
            <span className="truncate text-[0.66rem] text-muted-foreground">
              @{item.author?.username}
            </span>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active status updates. They disappear after 24 hours.
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-4">
            <PostCard item={item} />
            {(index + 1) % 4 === 0 ? <AdSlot /> : null}
          </div>
        ))}
      </div>
    </Screen>
  );
}
