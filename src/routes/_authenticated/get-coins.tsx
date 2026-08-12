import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Coins, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import {
  addRewardCoins,
  billingAvailable,
  fetchEntitlements,
  PRODUCTS,
  requestPurchase,
  type ProductId,
} from "@/lib/billing";

const REWARDED_COINS = 5;

export const Route = createFileRoute("/_authenticated/get-coins")({
  head: () => ({
    meta: [
      { title: "Get Coins — MzansiTalk" },
      {
        name: "description",
        content:
          "Buy 100 MzansiTalk coins through Google Play Billing, go Premium to remove ads, or watch a rewarded ad for 5 free coins.",
      },
      { property: "og:title", content: "Get Coins — MzansiTalk" },
      { property: "og:description", content: "Coins, Premium and rewarded coins on MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GetCoinsPage,
});

function GetCoinsPage() {
  const queryClient = useQueryClient();
  const wallet = useQuery({ queryKey: ["entitlements"], queryFn: fetchEntitlements });
  const playBilling = billingAvailable();

  const buy = useMutation({
    mutationFn: (productId: ProductId) => requestPurchase(productId),
    onSuccess: (data, productId) => {
      queryClient.setQueryData(["entitlements"], data);
      toast.success(
        productId === "coins_100"
          ? "100 coins added to your balance."
          : "Premium is active — ads are off and your verified badge is on.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reward = useMutation({
    mutationFn: () => addRewardCoins(REWARDED_COINS),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entitlements"] });
      toast.success(`You earned ${REWARDED_COINS} free coins.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Screen title="Get Coins">
      <section className="rounded-2xl border border-border bg-card p-5 text-center">
        <Coins className="mx-auto size-8 text-gold" />
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Your balance</p>
        <p className="font-display text-3xl font-bold text-gold">{wallet.data?.coins ?? 0}</p>
        {wallet.data?.premium_active ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-600">
            <BadgeCheck className="size-4" /> Premium active — no ads
          </p>
        ) : null}
      </section>

      {!playBilling ? (
        <p className="mt-3 rounded-2xl border border-border bg-secondary p-4 text-xs text-muted-foreground">
          Coins, Premium and Boost Live are digital items, so they are sold only through Google Play
          Billing. Open MzansiTalk in the Android app to complete a purchase.
        </p>
      ) : null}

      {(["coins_100", "premium_monthly_r29"] as ProductId[]).map((id) => {
        const product = PRODUCTS[id];
        return (
          <section key={id} className="mt-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold">
              {product.title} · {product.priceLabel}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
            <button
              type="button"
              disabled={buy.isPending}
              onClick={() => buy.mutate(id)}
              className="btn-base btn-primary mt-3 w-full disabled:opacity-60"
            >
              {buy.isPending && buy.variables === id
                ? "Opening Google Play…"
                : `Buy ${product.title}`}
            </button>
          </section>
        );
      })}

      <Link to="/live" className="btn-base mt-3 w-full bg-secondary text-secondary-foreground">
        <Rocket className="size-4" /> Go Live and boost your stream
      </Link>
    </Screen>
  );
}
