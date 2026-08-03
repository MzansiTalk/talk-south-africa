import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { Screen } from "@/components/Shell";

export const Route = createFileRoute("/_authenticated/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MzansiTalk" },
      {
        name: "description",
        content:
          "How MzansiTalk handles your data, in-app purchases through Paystack and Google Play, and ads served by Meta Audience Network.",
      },
      { property: "og:title", content: "Privacy Policy — MzansiTalk" },
      {
        property: "og:description",
        content: "MzansiTalk privacy policy covering in-app purchases and Meta ads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <Screen title="Privacy Policy">
      <p className="flex items-center gap-2 rounded-2xl border border-gold/50 bg-gold/10 p-4 text-xs font-semibold">
        <ShieldCheck className="size-4 text-gold" /> This page is maintained by the MzansiTalk owner
        and explains what the app collects and how money and ads work.
      </p>

      <Section title="What we collect">
        <p>
          Your name, username, email address, profile photo and the posts, reels, status updates,
          comments and messages you choose to create. We also keep basic activity counts such as views,
          likes and ad impressions so creator earnings can be calculated.
        </p>
      </Section>

      <Section title="In-App Purchases">
        <p>
          MzansiTalk offers in-app purchases — for example Boost Live, coin packs and a monthly premium
          plan. Payments are processed by our payment provider (Paystack on the web, and Google Play
          Billing inside the Android app). We never see or store your card or bank details; we only
          store the purchase record, the amount and whether it succeeded.
        </p>
      </Section>

      <Section title="Meta Ads">
        <p>
          Ads in MzansiTalk are served by Meta Audience Network. Meta may collect limited device and
          ad-interaction data to choose and measure ads, subject to Meta&apos;s own privacy policy.
          Google AdMob is not used anywhere in this app.
        </p>
        <p>
          Every ad has a &quot;Report ad&quot; button. Reports are stored so the owner can review and
          remove ads that break policy.
        </p>
      </Section>

      <Section title="Who can see your data">
        <p>
          Other members see what you post publicly. Only you can see your private messages and your
          own earnings. Only the owner and approved admins can see moderation reports, payout requests
          and platform totals.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          You can delete your posts at any time. To delete your whole account and its data, contact
          support from the Settings screen and we will remove it.
        </p>
      </Section>

      <Link to="/settings" className="btn-base btn-primary mt-4 w-full">
        Back to Settings
      </Link>
    </Screen>
  );
}
