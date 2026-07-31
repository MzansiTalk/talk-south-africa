import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { createSponsoredOrder, fetchPublicPricing } from "@/lib/api";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise With Us — MzansiTalk" },
      {
        name: "description",
        content:
          "Promote your brand to South Africa on MzansiTalk. Sponsored posts, boosts and impression packages with instant Paystack checkout.",
      },
      { property: "og:title", content: "Advertise With Us — MzansiTalk" },
      {
        property: "og:description",
        content: "Sponsored posts, boosts and impression packages on MzansiTalk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdvertisePage,
});

type Pack = { key: string; label: string; amount: number; days: number; blurb: string };

function AdvertisePage() {
  const pricing = useQuery({ queryKey: ["public-pricing"], queryFn: fetchPublicPricing });
  const [selected, setSelected] = useState<string>("sponsored_7");
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const p = pricing.data;
  const packs: Pack[] = [
    {
      key: "impressions",
      label: "1 000 Impressions",
      amount: p?.price_per_1000_impressions ?? 50,
      days: 7,
      blurb: "Your ad shown 1 000 times across feed, reels and status.",
    },
    {
      key: "sponsored_7",
      label: "Sponsored Post — 7 Days",
      amount: p?.price_sponsored_7_days ?? 500,
      days: 7,
      blurb: "A full week pinned in the feed with a Sponsored badge.",
    },
    {
      key: "sponsored_30",
      label: "Sponsored Post — 30 Days",
      amount: p?.price_sponsored_30_days ?? 1500,
      days: 30,
      blurb: "A full month of reach — best value for brands.",
    },
    {
      key: "boost_post",
      label: "Boost 1 Post",
      amount: p?.price_boost_post ?? 20,
      days: 1,
      blurb: "Push a single post to more Mzansi timelines.",
    },
    {
      key: "boost_7",
      label: "Boost 7 Days",
      amount: p?.price_boost_7_days ?? 100,
      days: 7,
      blurb: "A week of extra reach on one post.",
    },
  ];
  const pack = packs.find((item) => item.key === selected) ?? packs[1]!;

  const pay = useMutation({
    mutationFn: async () => {
      if (!brandName.trim()) throw new Error("Please add your brand name");
      if (!/^\S+@\S+\.\S+$/.test(brandEmail.trim())) throw new Error("Please add a valid email");
      const reference = `MZ-AD-${Date.now()}`;
      await createSponsoredOrder({
        brandName: brandName.trim().slice(0, 100),
        brandEmail: brandEmail.trim().slice(0, 255),
        phone: phone.trim().slice(0, 30),
        package: pack.label,
        amount: pack.amount,
        days: pack.days,
        message: message.trim().slice(0, 1000),
        reference,
      });
      const key = p?.paystack_public_key;
      if (!key) return { checkout: null as string | null };
      const url = `https://paystack.com/pay/?key=${encodeURIComponent(key)}&amount=${Math.round(
        pack.amount * 100,
      )}&email=${encodeURIComponent(brandEmail.trim())}&reference=${encodeURIComponent(reference)}`;
      return { checkout: url };
    },
    onSuccess: (result) => {
      if (result.checkout) {
        window.open(result.checkout, "_blank", "noopener,noreferrer");
        toast.success("Order created. Finish your payment in the Paystack window.");
      } else {
        toast.success("Request received. Our team will send you a payment link shortly.");
      }
      setBrandName("");
      setBrandEmail("");
      setPhone("");
      setMessage("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-16 pt-8">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">MzansiTalk</p>
        <h1 className="mt-2 font-display text-3xl font-black">Advertise With Us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Put your brand in front of Mzansi — feed, reels, status and comments. Pay securely with
          Paystack{p?.paystack_test_mode ? " (test mode)" : ""}.
        </p>
      </header>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide">Our Prices</h2>
        {packs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSelected(item.key)}
            className={`w-full rounded-2xl border p-4 text-left ${
              selected === item.key ? "border-gold bg-gold/10" : "border-border bg-card"
            }`}
          >
            <span className="flex items-center justify-between">
              <span className="font-display font-bold">{item.label}</span>
              <span className="font-display font-black text-gold">R{item.amount.toFixed(0)}</span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">{item.blurb}</span>
          </button>
        ))}
      </section>

      <section className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Your Details</h2>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Brand / Business Name</span>
          <input
            className="field field-focus mt-1"
            maxLength={100}
            value={brandName}
            onChange={(event) => setBrandName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Email</span>
          <input
            type="email"
            className="field field-focus mt-1"
            maxLength={255}
            value={brandEmail}
            onChange={(event) => setBrandEmail(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">Phone (optional)</span>
          <input
            className="field field-focus mt-1"
            maxLength={30}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">
            What do you want to advertise?
          </span>
          <textarea
            className="field field-focus mt-1 min-h-24"
            maxLength={1000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => pay.mutate()}
          disabled={pay.isPending}
          className="btn-base btn-primary w-full disabled:opacity-60"
        >
          {pay.isPending ? "Creating order…" : `Pay Now — R${pack.amount.toFixed(0)}`}
        </button>
        <p className="text-[0.68rem] text-muted-foreground">
          Payments are handled securely by Paystack. Once payment clears, your sponsored post appears in
          the MzansiTalk admin queue for approval.
        </p>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/" className="font-semibold underline">
          Back to MzansiTalk
        </Link>
      </p>
    </main>
  );
}
