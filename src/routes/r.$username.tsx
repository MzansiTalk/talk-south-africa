import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";

import logo from "@/assets/mzansitalk-logo.png";
import { rememberReferrer } from "@/lib/creators";

export const Route = createFileRoute("/r/$username")({
  head: () => ({
    meta: [
      { title: "Join MzansiTalk on invite — MzansiTalk" },
      {
        name: "description",
        content:
          "You were invited to MzansiTalk. Create a free account to watch reels, posts and status from across South Africa.",
      },
      { property: "og:title", content: "Join MzansiTalk on invite" },
      {
        property: "og:description",
        content: "Accept your MzansiTalk invite and join the community for free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferralLanding,
});

function ReferralLanding() {
  const { username } = useParams({ from: "/r/$username" });
  const navigate = useNavigate();

  useEffect(() => {
    rememberReferrer(username);
    const timer = window.setTimeout(() => {
      void navigate({ to: "/", replace: true });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [navigate, username]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <img src={logo} alt="MzansiTalk logo" width={72} height={72} className="rounded-2xl" />
      <h1 className="font-display text-2xl font-extrabold">
        Mzansi<span className="text-gold">Talk</span>
      </h1>
      <p className="text-sm text-muted-foreground">
        @{username} invited you. Taking you to sign up…
      </p>
    </main>
  );
}
