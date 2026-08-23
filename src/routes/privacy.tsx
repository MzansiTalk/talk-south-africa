import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalSection, PublicPage } from "@/components/PublicShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MzansiTalk" },
      {
        name: "description",
        content:
          "MzansiTalk privacy policy: what data we collect, how cookies work, how advertising and analytics partners such as Google and TrafficStars may process data, and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — MzansiTalk" },
      {
        property: "og:description",
        content: "How MzansiTalk collects, uses and protects your personal information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicPage>
      <h1 className="font-display text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 22 August 2026</p>

      <LegalSection title="Information we collect">
        <p>
          Visitors can browse and watch videos on MzansiTalk without an account. When you do register,
          we collect your name, username, email address, password (stored only as a secure hash), your
          recovery Pass Key hash and any profile photo or bio you add. When you use the community
          features we store the posts, reels, status updates, comments, likes, follows and messages you
          create.
        </p>
        <p>
          Like almost every website, our servers automatically log technical information: IP address,
          browser type, device type, operating system, referring page, pages viewed and timestamps. We
          use this to keep the service secure, prevent abuse and understand which content is popular.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and similar technologies">
        <p>
          MzansiTalk uses cookies and browser local storage for essential purposes only: keeping you
          signed in, remembering your preferences and protecting against fraudulent sign-ins. You can
          block or delete cookies in your browser settings, but you may then be unable to stay logged
          in. Where a third-party service is used (see below), that service may set its own cookies or
          identifiers according to its own policy.
        </p>
      </LegalSection>

      <LegalSection title="Advertising and analytics partners">
        <p>
          MzansiTalk does not currently display advertising on the site, and no ad script, banner,
          pop-under or video ad tag is served from our pages. If we introduce advertising in future,
          it may be delivered by third-party advertising networks and exchanges — for example{" "}
          <strong>TrafficStars</strong> or <strong>Google</strong> — and those partners may use
          cookies, device identifiers, approximate location and page-context data to select and
          measure the ads shown to you. Any such partner acts as an independent controller of the data
          it collects, and its own privacy policy governs that processing. We will update this page and
          disclose the partner before any ad code is placed on MzansiTalk.
        </p>
        <p>
          Payment providers (for boosts, coins and sponsored placements) receive only the information
          needed to process a transaction. MzansiTalk never sees or stores your card or bank details.
        </p>
      </LegalSection>

      <LegalSection title="How we use your information">
        <p>
          We use your data to operate the platform, show you content, deliver notifications, calculate
          creator earnings, moderate content, comply with South African law and protect users from
          spam, fraud and abuse. We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection title="Sharing and storage">
        <p>
          Data is stored with our hosting and database providers under contract, using encryption in
          transit (HTTPS) and at rest. We share personal data only with those service providers, with
          law-enforcement or regulators where legally required, or where you have asked us to.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Under the Protection of Personal Information Act (POPIA) you may request access to, or
          correction or deletion of, your personal information, and you may withdraw consent or object
          to processing. Email{" "}
          <a href="mailto:contact@mzansitalk.site" className="underline">
            contact@mzansitalk.site
          </a>{" "}
          and we will respond within 30 days. Deleting your account removes your profile, uploads and
          messages from the platform.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          MzansiTalk is not intended for people under 13. If we learn that an account belongs to a
          child under 13 we delete it and its content.
        </p>
      </LegalSection>

      <div className="mt-6">
        <Link to="/terms" className="btn-base btn-primary px-4 py-2">
          Read the Terms &amp; Conditions
        </Link>
      </div>
    </PublicPage>
  );
}
