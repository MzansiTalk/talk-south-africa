import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket } from "lucide-react";

import { Screen } from "@/components/Shell";
import { fetchMyBoosts } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/my-boosts")({
  head: () => ({
    meta: [
      { title: "My Boosts — MzansiTalk" },
      {
        name: "description",
        content:
          "Track every MzansiTalk boost you paid for: amount, dates, views gained and status, and boost again in one tap.",
      },
      { property: "og:title", content: "My Boosts — MzansiTalk" },
      { property: "og:description", content: "Your MzansiTalk boost dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyBoosts,
});

function MyBoosts() {
  const boosts = useQuery({ queryKey: ["my-boosts"], queryFn: fetchMyBoosts });
  const rows = boosts.data ?? [];

  return (
    <Screen title="My Boosts">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Rocket className="mx-auto size-8 text-gold" />
          <h2 className="mt-3 font-display text-lg font-bold">No boosts yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Boost any post, reel or photo from its menu to reach more people.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((boost) => {
            const active = boost.status === "active" && new Date(boost.ends_at) > new Date();
            return (
              <li key={boost.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {boost.post?.caption || `(${boost.post?.kind ?? "content"} with no caption)`}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase ${
                      active
                        ? "bg-gold-gradient text-gold-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {active ? "Active" : boost.status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Amount Paid</dt>
                    <dd className="font-semibold">R{Number(boost.amount).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Total Views Gained</dt>
                    <dd className="font-semibold">{boost.views_gained.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Start Date</dt>
                    <dd className="font-semibold">
                      {new Date(boost.starts_at).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">End Date</dt>
                    <dd className="font-semibold">{new Date(boost.ends_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <Link
                  to="/boost/$postId"
                  params={{ postId: boost.post_id }}
                  className="btn-base btn-primary mt-3 w-full"
                >
                  Boost Again
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
