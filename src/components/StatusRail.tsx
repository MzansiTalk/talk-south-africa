import { Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Avatar, useMediaUrl } from "@/components/SignedMedia";
import type { FeedItem } from "@/lib/api";

export type StatusGroup = {
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  items: FeedItem[];
};

/** Groups status posts per member, newest member activity first. */
export function groupStatuses(items: FeedItem[]): StatusGroup[] {
  const map = new Map<string, StatusGroup>();
  for (const item of items) {
    const existing = map.get(item.user_id);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    map.set(item.user_id, {
      userId: item.user_id,
      name: item.author?.name ?? "MzansiTalk",
      username: item.author?.username ?? "",
      avatar: item.author?.avatar_url ?? null,
      items: [item],
    });
  }
  for (const group of map.values()) {
    group.items.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  return [...map.values()];
}

const IMAGE_MS = 5000;

function StatusFrame({
  item,
  onDone,
}: {
  item: FeedItem;
  onDone: () => void;
}) {
  const { data: url } = useMediaUrl(item.media_url);
  const isVideo = (item.media_type ?? "").startsWith("video");

  useEffect(() => {
    if (isVideo) return;
    const timer = window.setTimeout(onDone, IMAGE_MS);
    return () => window.clearTimeout(timer);
  }, [isVideo, onDone, item.id]);

  if (isVideo && url) {
    return (
      <video
        key={item.id}
        src={url}
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        onEnded={onDone}
      />
    );
  }

  if (url) {
    return <img key={item.id} src={url} alt={item.caption ?? "Status"} className="h-full w-full object-contain" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-8 text-center text-lg font-semibold text-primary-foreground">
      {item.caption ?? "Status"}
    </div>
  );
}

/** Full screen story viewer: progress bars, tap navigation and auto advance. */
export function StatusViewer({
  groups,
  startGroup,
  onClose,
}: {
  groups: StatusGroup[];
  startGroup: number;
  onClose: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(startGroup);
  const [itemIndex, setItemIndex] = useState(0);

  const group = groups[groupIndex];
  const item = group?.items[itemIndex];

  const next = useCallback(() => {
    setItemIndex((current) => {
      const list = groups[groupIndex]?.items ?? [];
      if (current + 1 < list.length) return current + 1;
      if (groupIndex + 1 < groups.length) {
        setGroupIndex(groupIndex + 1);
        return 0;
      }
      onClose();
      return current;
    });
  }, [groupIndex, groups, onClose]);

  const previous = useCallback(() => {
    setItemIndex((current) => {
      if (current > 0) return current - 1;
      if (groupIndex > 0) {
        const target = groupIndex - 1;
        setGroupIndex(target);
        return Math.max((groups[target]?.items.length ?? 1) - 1, 0);
      }
      return 0;
    });
  }, [groupIndex, groups]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, onClose]);

  if (!group || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur">
      <div className="flex gap-1 px-3 pt-3">
        {group.items.map((entry, index) => (
          <span key={entry.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={`block h-full rounded-full bg-gold ${index <= itemIndex ? "w-full" : "w-0"}`}
            />
          </span>
        ))}
      </div>

      <header className="flex items-center gap-3 px-3 py-3">
        <Link
          to="/u/$username"
          params={{ username: group.username }}
          onClick={onClose}
          className="flex min-w-0 items-center gap-2"
        >
          <Avatar path={group.avatar} name={group.name} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{group.name}</span>
            <span className="block truncate text-xs text-muted-foreground">@{group.username}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close status"
          className="btn-base ml-auto bg-transparent px-2 text-muted-foreground"
        >
          <X className="size-5" />
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden bg-brand">
        <StatusFrame item={item} onDone={next} />
        <button
          type="button"
          onClick={previous}
          aria-label="Previous status"
          className="absolute inset-y-0 left-0 w-1/3 bg-transparent"
        />
        <button
          type="button"
          onClick={next}
          aria-label="Next status"
          className="absolute inset-y-0 right-0 w-2/3 bg-transparent"
        />
      </div>

      {item.caption ? (
        <p className="px-4 py-3 text-center text-sm text-muted-foreground">{item.caption}</p>
      ) : null}
    </div>
  );
}

/** Horizontal "Create status" + member status circles rail. */
export function StatusRail({ items }: { items: FeedItem[] }) {
  const groups = useMemo(() => groupStatuses(items), [items]);
  const [open, setOpen] = useState<number | null>(null);
  const rail = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={rail} className="mb-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        <Link to="/create" className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand text-primary-foreground">
            <Plus className="size-6" />
          </span>
          <span className="truncate text-[0.62rem] font-semibold">Create Status</span>
        </Link>

        {groups.map((group, index) => (
          <button
            key={group.userId}
            type="button"
            onClick={() => setOpen(index)}
            className="flex w-16 shrink-0 flex-col items-center gap-1 text-center"
          >
            <span className="rounded-full bg-gold-gradient p-[2px]">
              <Avatar path={group.avatar} name={group.name} size={52} />
            </span>
            <span className="w-full truncate text-[0.62rem] font-medium">{group.name}</span>
          </button>
        ))}

        {groups.length === 0 ? (
          <p className="self-center text-xs text-muted-foreground">
            No status updates yet. They disappear after 24 hours.
          </p>
        ) : null}
      </div>

      {open !== null ? (
        <StatusViewer groups={groups} startGroup={open} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}
