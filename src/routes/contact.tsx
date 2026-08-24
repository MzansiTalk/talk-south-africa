import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { LegalSection, PublicPage } from "@/components/PublicShell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — MzansiTalk" },
      {
        name: "description",
        content:
          "Contact the MzansiTalk team at contact@mzansitalk.site for support, copyright complaints, partnerships or press enquiries about our South African video platform.",
      },
      { property: "og:title", content: "Contact Us — MzansiTalk" },
      {
        property: "og:description",
        content: "Reach the MzansiTalk team by email or through our contact form.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(`MzansiTalk enquiry from ${name || "a visitor"}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:contact@mzansitalk.site?subject=${subject}&body=${body}`;
    toast.success("Opening your email app — we reply within 2 working days.");
  };

  return (
    <PublicPage>
      <h1 className="font-display text-3xl font-extrabold">Contact MzansiTalk</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Support questions, copyright complaints, advertising and partnership enquiries, press requests
        — we read everything. The fastest route is email and we reply within two working days.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div>
          <LegalSection title="Email us">
            <p className="flex items-center gap-2 text-foreground">
              <Mail className="size-4 text-gold" />
              <a href="mailto:contact@mzansitalk.site" className="font-semibold underline">
                contact@mzansitalk.site
              </a>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-gold" /> Johannesburg, South Africa
            </p>
          </LegalSection>

          <LegalSection title="What to include">
            <p>
              For account or moderation issues, include your MzansiTalk username and the link to the
              video or comment. For copyright complaints, include proof of ownership and the URL.
            </p>
          </LegalSection>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Send a message</h2>
          <div className="mt-3 space-y-3">
            <input
              className="field field-focus"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
            />
            <input
              className="field field-focus"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={255}
            />
            <textarea
              className="field field-focus min-h-32"
              placeholder="How can we help?"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              maxLength={2000}
            />
            <button type="submit" className="btn-base btn-gold w-full font-bold">
              <Send className="size-4" /> Send message
            </button>
          </div>
        </form>
      </div>
    </PublicPage>
  );
}
