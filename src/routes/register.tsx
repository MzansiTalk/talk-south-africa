import { createFileRoute } from "@tanstack/react-router";

import { AuthPanel } from "@/components/AuthPanel";
import { PublicPage } from "@/components/PublicShell";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sign Up Free — MzansiTalk" },
      {
        name: "description",
        content:
          "Create a free MzansiTalk account to upload videos, comment, like, follow creators and stream live to South Africa.",
      },
      { property: "og:title", content: "Sign Up Free — MzansiTalk" },
      {
        property: "og:description",
        content: "Join MzansiTalk free and start posting videos, reels and status updates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicPage>
      <AuthPanel initialMode="signup" />
    </PublicPage>
  ),
});
