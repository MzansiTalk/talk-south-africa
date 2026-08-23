import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalSection, PublicPage } from "@/components/PublicShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — MzansiTalk" },
      {
        name: "description",
        content:
          "About MzansiTalk: a South African video entertainment community where anyone can watch free videos and members share reels, status updates and live streams.",
      },
      { property: "og:title", content: "About Us — MzansiTalk" },
      {
        property: "og:description",
        content: "Learn who runs MzansiTalk, what we publish and how our creator community works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicPage>
      <h1 className="font-display text-3xl font-extrabold">About MzansiTalk</h1>

      <LegalSection title="Who we are">
        <p>
          MzansiTalk is a South African entertainment and social video platform built for everyday
          people across all nine provinces. We started with one simple idea: South Africans are some
          of the funniest, most creative storytellers in the world, and they deserve a home-grown
          place to share that talent instead of getting lost on platforms built for other countries.
          From Soweto comedy skits and Durban dance challenges to Cape Town street music, township
          food clips, soccer reactions, matric memories and family celebrations, MzansiTalk collects
          the videos that make Mzansi laugh, dance and talk.
        </p>
        <p>
          Anyone can watch on MzansiTalk. Our homepage is completely open, so visitors can press play
          on any video without registering, paying or installing anything. Data is expensive in South
          Africa, so we keep our pages light, our videos compressed and our layout mobile-first for
          people browsing on a phone.
        </p>
      </LegalSection>

      <LegalSection title="What members can do">
        <p>
          A free MzansiTalk account unlocks the community side of the platform: uploading videos,
          reels and 24-hour status updates, commenting, liking, following creators, private messaging
          and going live to your followers. Members who build a real audience can apply to our
          Creator Programme and earn from their content through in-app purchases and sponsored
          placements.
        </p>
      </LegalSection>

      <LegalSection title="Safety and standards">
        <p>
          Every upload passes through automated moderation and a human review queue. Hate speech,
          harassment, sexual content involving minors, graphic violence and copyright infringement
          are removed, and repeat offenders lose their accounts. Members can report any video or
          comment, and account holders can appeal a moderation decision within 24 hours.
        </p>
        <p>
          MzansiTalk is operated from South Africa. Questions, partnership offers and press requests
          can go to{" "}
          <a href="mailto:contact@mzansitalk.site" className="underline">
            contact@mzansitalk.site
          </a>
          .
        </p>
      </LegalSection>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/" className="btn-base btn-primary px-4 py-2">
          Watch free videos
        </Link>
        <Link
          to="/contact"
          className="btn-base border border-border bg-secondary px-4 py-2 text-secondary-foreground"
        >
          Contact us
        </Link>
      </div>
    </PublicPage>
  );
}
