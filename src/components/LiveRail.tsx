import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";

import { Avatar } from "@/components/SignedMedia";
import { fetchVisibleLives } from "@/lib/live";

/**
 * Horizontal rail of lives shown at the top of the Home feed.
 * Boosted lives show for everyone; un-boosted ones only for friends and the host.
 */
export function LiveRail() {
  const lives = useQuery({ queryKey: ["lives"], queryFn: fetchVisibleLives, refetchInterval: 30_000 });
  const items = lives.data ?? [];
  if (items.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
        <Radio className="size-4 text-destructive" /> Live Now
      </h2>
      <ul className="flex gap-3 overflow-x-auto no-scrollbar">
        {items.map((stream) => (
          <li key={stream.id} className="shrink-0">
            <Link to="/live/$id" params={{ id: stream.id }} className="block w-20 text-center">
              <span className="relative inline-block rounded-full p-0.5 ring-2 ring-destructive">
                <Avatar path={stream.host?.avatar_url} name={stream.host?.name ?? "M"} size={60} />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-destructive px-1.5 py-0.5 text-[0.5rem] font-bold uppercase text-destructive-foreground">
                  Live
                </span>
              </span>
              <span className="mt-2 block truncate text-[0.68rem] font-medium">
                {stream.host?.name ?? "Member"}
              </span>
              {stream.is_boosted ? (
                <span className="block text-[0.6rem] font-bold text-gold">Boosted</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
