import { createFileRoute, useNavigate } from "@tanstack/react-router";

import logo from "@/assets/mzansitalk-logo.png";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to MzansiTalk — Connect with South Africa" },
      {
        name: "description",
        content:
          "Welcome to MzansiTalk. Connect with South Africa through posts, reels, status and chat. Tap Start Chat to begin.",
      },
      { property: "og:title", content: "Welcome to MzansiTalk" },
      { property: "og:description", content: "Connect with South Africa — posts, reels, status and chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WelcomeScreen,
});

function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <img src={logo} alt="MzansiTalk logo" width={96} height={96} className="rounded-2xl" />

      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome to Mzansi<span className="text-gold">Talk</span>
        </h1>
        <p className="text-muted-foreground">Connect with South Africa</p>
      </div>

      <button
        type="button"
        onClick={() => void navigate({ to: "/" })}
        className="btn-base w-full max-w-xs bg-primary py-3 text-base font-semibold text-primary-foreground"
      >
        Start Chat
      </button>
    </main>
  );
}
