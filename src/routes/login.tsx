import { createFileRoute } from "@tanstack/react-router";

import { AuthPanel } from "@/components/AuthPanel";
import { PublicPage } from "@/components/PublicShell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — MzansiTalk" },
      {
        name: "description",
        content:
          "Log in to MzansiTalk to post videos, comment, like, follow creators and go live from anywhere in South Africa.",
      },
      { property: "og:title", content: "Log In — MzansiTalk" },
      {
        property: "og:description",
        content: "Members log in here to post, comment, like and follow on MzansiTalk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicPage>
      <AuthPanel initialMode="login" />
    </PublicPage>
  ),
});
