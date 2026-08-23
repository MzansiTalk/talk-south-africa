import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalSection, PublicPage } from "@/components/PublicShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — MzansiTalk" },
      {
        name: "description",
        content:
          "The MzansiTalk terms and conditions: account rules, acceptable content, copyright, moderation, payments and liability for users of our South African video platform.",
      },
      { property: "og:title", content: "Terms & Conditions — MzansiTalk" },
      {
        property: "og:description",
        content: "Rules for watching, posting and earning on MzansiTalk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicPage>
      <h1 className="font-display text-3xl font-extrabold">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 22 August 2026</p>

      <LegalSection title="1. Acceptance">
        <p>
          By visiting MzansiTalk or creating an account you agree to these terms. If you do not agree,
          please do not use the platform. You must be at least 13 years old to hold an account, and at
          least 18 to receive creator payouts.
        </p>
      </LegalSection>

      <LegalSection title="2. Watching is free">
        <p>
          Public videos on MzansiTalk can be watched by anyone without an account. Posting, commenting,
          liking, following, messaging and live streaming require a free registered account.
        </p>
      </LegalSection>

      <LegalSection title="3. Your content">
        <p>
          You keep ownership of everything you upload. By posting, you grant MzansiTalk a
          non-exclusive, royalty-free licence to host, store, reformat and display that content on the
          platform so it can be shown to other users. You confirm you have the rights to everything you
          upload, including music and clips.
        </p>
      </LegalSection>

      <LegalSection title="4. Prohibited content and conduct">
        <p>
          You may not post hate speech, threats, harassment, sexual content involving minors, graphic
          violence, illegal goods, scams, malware, spam, impersonation, or content that infringes
          someone else&apos;s copyright or privacy. Automated scraping, bot traffic, artificial view
          inflation and attempts to bypass moderation are prohibited.
        </p>
      </LegalSection>

      <LegalSection title="5. Moderation, strikes and appeals">
        <p>
          Content is reviewed automatically and by our moderation team. We may remove content, restrict
          features, issue strikes or terminate accounts that break these terms. Three strikes result in
          an automatic ban. Account holders may appeal a decision from within the app and we aim to
          respond within 24 hours.
        </p>
      </LegalSection>

      <LegalSection title="6. Copyright complaints">
        <p>
          If you believe your work has been used without permission, email{" "}
          <a href="mailto:contact@mzansitalk.site" className="underline">
            contact@mzansitalk.site
          </a>{" "}
          with the URL, proof of ownership and your contact details. Verified claims are actioned
          promptly and repeat infringers are removed.
        </p>
      </LegalSection>

      <LegalSection title="7. Payments and earnings">
        <p>
          Digital items such as boosts, coins and premium access are sold through our approved payment
          providers. Digital purchases are consumed immediately and are generally non-refundable except
          where South African consumer law requires otherwise. Creator earnings are paid only to
          verified accounts that meet the published thresholds and comply with these terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Availability and liability">
        <p>
          MzansiTalk is provided &quot;as is&quot;. We work hard to keep the platform online but cannot
          guarantee uninterrupted service, and we are not liable for indirect or consequential loss
          arising from your use of the platform. Nothing in these terms limits rights you have under
          South African law.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes and governing law">
        <p>
          We may update these terms; material changes will be posted on this page with a new date.
          These terms are governed by the laws of the Republic of South Africa.
        </p>
      </LegalSection>

      <div className="mt-6">
        <Link to="/privacy" className="btn-base btn-primary px-4 py-2">
          Read the Privacy Policy
        </Link>
      </div>
    </PublicPage>
  );
}
