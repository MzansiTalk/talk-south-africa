/**
 * Google Play Billing for MzansiTalk digital goods.
 *
 * Google Play bans third-party payment providers for digital items, so Boost
 * Live, coin packs and Premium are ALL sold through Google Play Billing — there
 * is no Paystack checkout for any of these three products. Paystack remains only
 * for off-platform advertiser invoices (Sponsored placements), never for
 * in-app digital goods.
 *
 * Inside the Android app the native Play Billing bridge is exposed on
 * `window.Capacitor.Plugins.InAppPurchase` (Capacitor plugin). On the web there
 * is no Play Billing, so purchases are rejected with a clear message instead of
 * silently falling back to a card charge.
 */

import { supabase } from "@/integrations/supabase/client";

export type ProductId = "boost_live_r50" | "coins_100" | "premium_monthly_r29";

export type Product = {
  id: ProductId;
  title: string;
  description: string;
  priceLabel: string;
  amount: number;
  type: "inapp" | "subs";
};

export const PRODUCTS: Record<ProductId, Product> = {
  boost_live_r50: {
    id: "boost_live_r50",
    title: "Boost Live",
    description:
      "Shows your live to everyone in the Home feed and gives you the Boosted badge for 24 hours.",
    priceLabel: "R50.00",
    amount: 50,
    type: "inapp",
  },
  coins_100: {
    id: "coins_100",
    title: "100 Coins",
    description: "Adds 100 coins to your balance to spend inside MzansiTalk.",
    priceLabel: "R29.00",
    amount: 29,
    type: "inapp",
  },
  premium_monthly_r29: {
    id: "premium_monthly_r29",
    title: "Premium Monthly",
    description: "Removes all ads and gives you the verified badge. Renews monthly.",
    priceLabel: "R29.00 / month",
    amount: 29,
    type: "subs",
  },
};

export type Entitlements = {
  coins: number;
  boost_active: boolean;
  boost_expires_at: string | null;
  premium_until: string | null;
  premium_active: boolean;
};

export const EMPTY_ENTITLEMENTS: Entitlements = {
  coins: 0,
  boost_active: false,
  boost_expires_at: null,
  premium_until: null,
  premium_active: false,
};

type NativePurchase = { productId?: string; purchaseToken?: string; orderId?: string };

type BillingPlugin = {
  initialize?: () => Promise<unknown>;
  purchase?: (options: { productId: string; productType?: string }) => Promise<NativePurchase>;
  restorePurchases?: () => Promise<{ purchases?: NativePurchase[] }>;
  getPurchases?: () => Promise<{ purchases?: NativePurchase[] }>;
};

function nativeBilling(): BillingPlugin | null {
  if (typeof window === "undefined") return null;
  const capacitor = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> };
    }
  ).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  const plugin = capacitor.Plugins?.["InAppPurchase"] as BillingPlugin | undefined;
  return plugin ?? null;
}

export function billingAvailable(): boolean {
  return nativeBilling() !== null;
}

/**
 * Records the purchase and grants the entitlement in one server-side call.
 * The database function is the single point of truth: it de-duplicates the
 * purchase token, so a replayed receipt can never grant coins or a boost twice.
 */
async function grant(productId: ProductId, purchase: NativePurchase = {}): Promise<Entitlements> {
  // Empty strings are treated as "no receipt" server-side (NULLIF), which keeps
  // the purchase-token de-duplication index correct.
  const { data, error } = await supabase.rpc("grant_iap_entitlement", {
    _product_id: productId,
    _purchase_token: purchase.purchaseToken ?? "",
    _order_id: purchase.orderId ?? "",
  });
  if (error) throw new Error(error.message);
  return { ...EMPTY_ENTITLEMENTS, ...((data ?? {}) as Partial<Entitlements>) };
}

/** Reads the member's coin balance, live boost and premium state. */
export async function fetchEntitlements(): Promise<Entitlements> {
  const { data, error } = await supabase.rpc("my_entitlements");
  if (error || !data) return EMPTY_ENTITLEMENTS;
  return { ...EMPTY_ENTITLEMENTS, ...(data as Partial<Entitlements>) };
}

/**
 * Starts the Google Play purchase flow for one of the three Play Console
 * products, then validates and grants it server-side.
 */
export async function requestPurchase(productId: ProductId): Promise<Entitlements> {
  const product = PRODUCTS[productId];
  const plugin = nativeBilling();
  if (!plugin?.purchase) {
    throw new Error(
      `${product.title} is sold through Google Play Billing. Open MzansiTalk in the Android app to buy it.`,
    );
  }
  await plugin.initialize?.().catch(() => undefined);
  const purchase = await plugin.purchase({ productId, productType: product.type });
  return grant(productId, purchase);
}

/** Re-applies every purchase Google Play still has on record for this account. */
export async function restorePurchases(): Promise<{
  restored: number;
  entitlements: Entitlements;
}> {
  const plugin = nativeBilling();
  if (!plugin) {
    throw new Error("Restore Purchases only works inside the MzansiTalk Android app.");
  }
  await plugin.initialize?.().catch(() => undefined);
  const result = (await (plugin.restorePurchases?.() ??
    plugin.getPurchases?.() ??
    Promise.resolve({}))) as {
    purchases?: NativePurchase[];
  };
  const purchases = result.purchases ?? [];
  let entitlements = await fetchEntitlements();
  let restored = 0;
  for (const purchase of purchases) {
    const id = purchase.productId as ProductId | undefined;
    if (!id || !(id in PRODUCTS)) continue;
    entitlements = await grant(id, purchase);
    restored += 1;
  }
  return { restored, entitlements };
}

/** Rewarded ads pay coins here — never from a purchase path. */
export async function addRewardCoins(coins: number): Promise<number> {
  const { data, error } = await supabase.rpc("add_reward_coins", { _coins: coins });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
