import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";

import { Avatar } from "@/components/SignedMedia";
import { fetchMyProfile } from "@/lib/api";

/** Facebook-style "What's on your mind?" composer entry point. */
export function Composer() {
  const profile = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });

  return (
    <section className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
      <Link to="/profile" aria-label="Your profile" className="shrink-0">
        <Avatar path={profile.data?.avatar_url} name={profile.data?.name ?? "M"} size={40} />
      </Link>
      <Link
        to="/create"
        className="min-w-0 flex-1 truncate rounded-full bg-secondary px-4 py-2.5 text-sm text-muted-foreground"
      >
        What&apos;s on your mind?
      </Link>
      <Link to="/create" className="btn-base shrink-0 bg-secondary px-3 py-2 text-xs text-secondary-foreground">
        <ImageIcon className="size-4" /> Photo
      </Link>
    </section>
  );
}
