import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollText, ShieldAlert } from "lucide-react";

import { Screen } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — MzansiTalk" },
      {
        name: "description",
        content:
          "MzansiTalk Community Guidelines: no nudity, hate speech, violence, gambling, fake news, harassment or copyright theft. Report or block anyone who breaks them.",
      },
      { property: "og:title", content: "Community Guidelines — MzansiTalk" },
      {
        property: "og:description",
        content: "What is banned on MzansiTalk and how reports, flags and strikes work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidelinesPage,
});

const BANNED = [
  {
    title: "Nudity and sexual content",
    body: "No nudity, pornography, sexual services or any content involving minors. Accounts posting it are removed immediately.",
  },
  {
    title: "Hate speech",
    body: "No racism, tribalism, xenophobia, or attacks on people for race, religion, ethnicity, gender, disability or sexual orientation.",
  },
  {
    title: "Violence and graphic content",
    body: "No gore, threats, incitement, terrorist or organised-crime content, or glorifying harm and self-harm.",
  },
  {
    title: "Gambling",
    body: "No betting, casino, lottery, sports-betting or crypto-gambling promotions, links or referral codes.",
  },
  {
    title: "Fake news and misinformation",
    body: "No fabricated news, manipulated media, or misleading health, election or emergency claims.",
  },
  {
    title: "Harassment, scams and copyright theft",
    body: "No bullying, doxxing, phishing, fake giveaways, or reuploading music, film or someone else's content as your own.",
  },
];

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
        <ScrollText className="size-4 text-gold" /> These guidelines apply to every post, reel,
        status, comment, live stream and message on MzansiTalk.
      </p>

      <section className="mt-4 space-y-3">
        {BANNED.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <ShieldAlert className="size-4 text-destructive" /> {item.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>

      <Section title="Reporting and blocking">
        <p>
          Every post, reel, live stream and profile has <strong>Report</strong> and{" "}
          <strong>Block</strong> controls. Reports are stored for staff review, and blocking is
          unlimited — a blocked member cannot message you or see your content.
        </p>
        <p>
          Content that is flagged is hidden from the feed until a staff member reviews it. Breaking
          these rules earns a strike, and three strikes bans the account automatically. Bans can be
          appealed from Settings.
        </p>
      </Section>

      <Section title="Monetisation">
        <p>
          MzansiTalk carries no advertising. Creator earnings come from in-app purchases and
          sponsored placements only, and content that breaks these guidelines is not eligible for
          monetisation or creator earnings.
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
