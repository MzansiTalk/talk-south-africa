import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";

import { Screen } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — MzansiTalk" },
      {
        name: "description",
        content:
          "The rules for posting on MzansiTalk: no nudity, hate speech, violence, harassment, illegal goods or copyright theft. Three strikes and the account is banned.",
      },
      { property: "og:title", content: "Community Guidelines — MzansiTalk" },
      {
        property: "og:description",
        content: "What is allowed and not allowed on MzansiTalk, and how moderation works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidelinesPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function GuidelinesPage() {
  return (
    <Screen title="Community Guidelines">
      <p className="flex items-center gap-2 rounded-2xl border border-gold/50 bg-gold/10 p-4 text-xs font-semibold">
        <ScrollText className="size-4 text-gold" /> These guidelines are maintained by the MzansiTalk
        owner and apply to every post, reel, status, comment, live stream and message.
      </p>

      <Section title="Not allowed on MzansiTalk">
        <ul className="list-disc space-y-1 pl-4">
          <li>Nudity, sexual content, sexual services or any content involving minors.</li>
          <li>Hate speech, racism, tribalism or attacks on people for who they are.</li>
          <li>Graphic violence, gore, threats, or glorifying harm or self-harm.</li>
          <li>Bullying, harassment, doxxing or sharing someone&apos;s private information.</li>
          <li>Illegal goods: drugs, weapons, stolen items, counterfeit money or documents.</li>
          <li>Scams, fake giveaways, phishing, spam and engagement-bait.</li>
          <li>Copyright theft — reuploading music, film or someone else&apos;s content as your own.</li>
          <li>Misleading health, election or emergency information.</li>
        </ul>
      </Section>

      <Section title="Monetisation">
        <p>
          MzansiTalk carries no advertising anywhere in the app. Monetisation comes from in-app
          purchases and sponsored placements, and content that breaks these guidelines is not
          eligible for monetisation or creator earnings.
        </p>
      </Section>

      <Section title="How moderation works">
        <p>
          Every post is scanned automatically for sexual and copyright violations, and any member can
          report content, a profile or an ad. Approved staff review reports.
        </p>
        <p>
          Breaking these rules earns a strike. Three strikes bans the account automatically. Bans can be
          appealed from Settings, and every moderation action is written to an audit log.
        </p>
      </Section>

      <Section title="Ads and advertisers">
        <p>
          Every ad in MzansiTalk has &quot;Why am I seeing this ad?&quot; and &quot;Report ad&quot;
          controls. Reported ads are reviewed by the owner and can be blocked. Advertisers must follow
          Meta&apos;s advertising standards.
        </p>
      </Section>

      <div className="mt-4 space-y-2">
        <Link to="/privacy" className="btn-base w-full bg-secondary text-secondary-foreground">
          Read the Privacy Policy
        </Link>
        <Link to="/settings" className="btn-base btn-primary w-full">
          Back to Settings
        </Link>
      </div>
    </Screen>
  );
}
