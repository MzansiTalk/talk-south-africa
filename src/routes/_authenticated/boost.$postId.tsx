import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Rocket, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import {
  BOOST_PACKAGES,
  createBoost,
  estimateBoost,
  MIN_BOOST,
  paymentsReady,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/boost/$postId")({
  head: () => ({
    meta: [
      { title: "Boost Your Content — MzansiTalk" },
      {
        name: "description",
        content:
          "Boost a MzansiTalk post from R20 and reach more people across South Africa. See estimated reach before you pay.",
      },
      { property: "og:title", content: "Boost Your Content — MzansiTalk" },
      { property: "og:description", content: "Pay to push your post higher in the MzansiTalk feed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BoostScreen,
});

function BoostScreen() {
  const { postId } = useParams({ from: "/_authenticated/boost/$postId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number>(20);
  const [days, setDays] = useState<number>(1);
  const [custom, setCustom] = useState(false);

  const ready = useQuery({ queryKey: ["payments-ready"], queryFn: paymentsReady });
  const estimate = estimateBoost(amount, days);

  const pay = useMutation({
    mutationFn: () => createBoost({ postId, amount, days }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-boosts"] });
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["top-boosters"] });
      toast.success("Boost active. Your content now shows higher in the feed.");
      void navigate({ to: "/my-boosts" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Screen title="Boost Content">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Rocket className="size-4 text-gold" /> Quick Packages
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {BOOST_PACKAGES.map((pkg) => {
            const active = !custom && amount === pkg.amount && days === pkg.days;
            return (
              <button
                key={pkg.label}
                type="button"
                onClick={() => {
                  setCustom(false);
                  setAmount(pkg.amount);
                  setDays(pkg.days);
                }}
                className={`rounded-xl border p-3 text-center text-xs font-semibold ${
                  active
                    ? "border-primary bg-brand text-primary-foreground"
                    : "border-border bg-secondary text-secondary-foreground"
                }`}
              >
                <span className="block font-display text-lg">R{pkg.amount}</span>
                {pkg.days} {pkg.days === 1 ? "Day" : "Days"}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setCustom(true)}
          className={`btn-base mt-3 w-full ${custom ? "btn-primary" : "bg-secondary text-secondary-foreground"}`}
        >
          Custom Amount
        </button>

        {custom ? (
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="amount">
              Amount in Rand (minimum R{MIN_BOOST}, no maximum)
            </label>
            <input
              id="amount"
              type="number"
              min={MIN_BOOST}
              step={1}
              className="field field-focus"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="days">
              Number of days
            </label>
            <input
              id="days"
              type="number"
              min={1}
              max={90}
              className="field field-focus"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <TrendingUp className="size-4 text-gold" /> Live Estimate
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary p-3">
            <span className="block font-display text-lg font-bold">
              {estimate.reach.toLocaleString()}
            </span>
            <span className="text-[0.68rem] uppercase text-muted-foreground">Estimated Reach</span>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <span className="block font-display text-lg font-bold">
              {estimate.views.toLocaleString()}
            </span>
            <span className="text-[0.68rem] uppercase text-muted-foreground">Views</span>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <span className="block font-display text-lg font-bold">{estimate.days}</span>
            <span className="text-[0.68rem] uppercase text-muted-foreground">Days</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Higher payment means your content shows more often in the feed.
        </p>
      </section>

      {ready.data === false ? (
        <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Card payments are not connected yet. The Owner must add Paystack keys under Admin →
          Payment Settings. Boosts created now are recorded as test boosts.
        </p>
      ) : null}

      <button
        type="button"
        disabled={amount < MIN_BOOST || pay.isPending}
        onClick={() => pay.mutate()}
        className="btn-base btn-primary mt-4 w-full disabled:opacity-60"
      >
        {pay.isPending ? "Processing…" : `Pay R${amount} and Boost`}
      </button>
    </Screen>
  );
}
