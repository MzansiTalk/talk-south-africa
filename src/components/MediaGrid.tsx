import { Link } from "@tanstack/react-router";
import { Bookmark, Eye, Plus, ThumbsUp, Video } from "lucide-react";
import { type ReactNode } from "react";

import { useMediaUrl } from "@/components/SignedMedia";
import type { FeedItem } from "@/lib/api";

/** 1300 -> "1.3K", 396 -> "396". */
export function formatCount(value: number | null | undefined) {
  const count = Number(value ?? 0);
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(count);
}

function Thumb({ item }: { item: FeedItem }) {
  const { data: url } = useMediaUrl(item.media_url);
  const isVideo = (item.media_type ?? "").startsWith("video");

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-2 text-center text-[0.6rem] text-muted-foreground">
        {item.caption?.slice(0, 40) ?? "MzansiTalk"}
      </div>
    );
  }

  return isVideo ? (
    <video
      src={url}
      className="h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
      tabIndex={-1}
    />
  ) : (
    <img src={url} alt={item.caption ?? "MzansiTalk media"} loading="lazy" className="h-full w-full object-cover" />
  );
}

function Tile({ item, onOpen }: { item: FeedItem; onOpen: (item: FeedItem) => void }) {
  const trending = item.is_trending || Number(item.boost_amount ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-muted"
      aria-label={`Open ${item.kind} with ${formatCount(item.views)} views`}
    >
      <Thumb item={item} />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background/85 to-transparent" />

      {item.kind === "reel" ? (
        <span className="absolute left-1 top-1 rounded bg-background/70 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide">
          Reel
        </span>
      ) : item.kind === "status" ? (
        <span className="absolute left-1 top-1 rounded bg-background/70 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide">
          Status
        </span>
      ) : null}

      <span className="absolute bottom-1 left-1 flex items-center gap-1 text-[0.6rem] font-semibold text-foreground">
        <Eye className="size-3" /> {formatCount(item.views)}
      </span>

      {trending ? <span className="absolute bottom-1 right-1 text-[0.7rem]">🔥</span> : null}
    </button>
  );
}

/** Instagram-style 3 column grid used on every profile for Reels and Status. */
export function MediaGrid({
  items,
  onOpen,
  createLabel,
  emptyText,
}: {
  items: FeedItem[];
  onOpen: (item: FeedItem) => void;
  createLabel?: string | undefined;
  emptyText?: string | undefined;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {createLabel ? (
        <Link
          to="/create"
          className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-lg bg-reel-gradient text-center"
        >
          <span className="relative grid size-9 place-items-center rounded-full bg-background/25">
            <Video className="size-4 text-primary-foreground" />
            <Plus className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-background/90 text-foreground" />
          </span>
          <span className="px-1 text-[0.62rem] font-bold text-primary-foreground">{createLabel}</span>
        </Link>
      ) : null}

      {items.map((item) => (
        <Tile key={item.id} item={item} onOpen={onOpen} />
      ))}

      {items.length === 0 && !createLabel ? (
        <p className="col-span-3 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {emptyText ?? "Nothing here yet."}
        </p>
      ) : null}
    </div>
  );
}

/** "Saved" / "Liked" pill filters shown under the profile tabs. */
export function CollectionPills({
  value,
  onChange,
}: {
  value: "none" | "saved" | "liked";
  onChange: (next: "none" | "saved" | "liked") => void;
}) {
  const pill = (key: "saved" | "liked", label: string, icon: ReactNode) => (
    <button
      key={key}
      type="button"
      onClick={() => onChange(value === key ? "none" : key)}
      className={`btn-base py-1.5 text-xs ${
        value === key ? "btn-primary" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="mt-3 flex gap-2">
      {pill("saved", "Saved", <Bookmark className="size-3.5" />)}
      {pill("liked", "Liked", <ThumbsUp className="size-3.5" />)}
    </div>
  );
}

/** All | Reels | Photos | Status underline tabs. */
export function ProfileTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 pb-2 text-sm font-semibold ${
            value === tab
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
