import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import {
  type AppSettings,
  fetchAppSettings,
  fetchSponsoredOrders,
  getMyEmail,
  OWNER_EMAIL,
  saveAppSettings,
  setSponsoredOrderStatus,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/payment-settings")({
  head: () => ({
    meta: [
      { title: "Owner Money Center — MzansiTalk" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk money control centre: AdMob ad revenue keys, Paystack sponsored and boost payments, and your own pricing.",
      },
      { property: "og:title", content: "Owner Money Center — MzansiTalk" },
      { property: "og:description", content: "One page to control every way MzansiTalk earns money." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MoneyCenter,
});

const EMPTY: AppSettings = {
  admob_app_id: "",
  admob_banner_id: "",
  admob_interstitial_id: "",
  admob_rewarded_id: "",
  admob_rewarded_interstitial_id: "",
  admob_native_id: "",
  admob_status_id: "",
  admob_payment_email: OWNER_EMAIL,
  meta_app_id: "",
  meta_banner_placement_id: "",
  meta_interstitial_placement_id: "",
  meta_rewarded_placement_id: "",
  ads_banner_enabled: true,
  ads_interstitial_enabled: true,
  ads_rewarded_enabled: true,
  ads_native_enabled: true,
  paystack_public_key: "",
  paystack_webhook_url: "",
  paystack_payout_email: OWNER_EMAIL,
  price_per_1000_impressions: 50,
  price_sponsored_7_days: 500,
  price_sponsored_30_days: 1500,
  price_boost_post: 20,
  price_boost_7_days: 100,
  admob_test_mode: true,
  paystack_test_mode: true,
  test_mode: true,
  live_mode: false,
};

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        className="field field-focus mt-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-display text-sm font-bold">R</span>
        <input
          type="number"
          min={0}
          step="1"
          className="field field-focus"
          value={String(value)}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
        />
      </div>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`btn-base w-full justify-between ${
        checked ? "btn-primary" : "bg-secondary text-secondary-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs font-bold">{checked ? "ON" : "OFF"}</span>
    </button>
  );
}

function MoneyCenter() {
  const queryClient = useQueryClient();
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;

  const settings = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    enabled: isOwner,
  });
  const orders = useQuery({
    queryKey: ["sponsored-orders"],
    queryFn: fetchSponsoredOrders,
    enabled: isOwner,
  });
  const [form, setForm] = useState<AppSettings>(EMPTY);

  useEffect(() => {
    if (settings.data) {
      setForm({ ...EMPTY, ...(settings.data as Partial<AppSettings>) });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (patch: Partial<AppSettings>) => saveAppSettings(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["ad-config"] });
      void queryClient.invalidateQueries({ queryKey: ["payments-ready"] });
      void queryClient.invalidateQueries({ queryKey: ["public-pricing"] });
      toast.success("Saved. All money goes directly to your own accounts.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const orderStatus = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      setSponsoredOrderStatus(input.id, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sponsored-orders"] });
      toast.success("Sponsored order updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (email.isLoading) {
    return (
      <Screen title="Owner Money Center">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="Owner Money Center">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Owner Money Center">
      <div className="rounded-2xl bg-destructive p-4 text-center text-sm font-bold text-destructive-foreground">
        WARNING: OWNER ONLY. This controls ALL app revenue.
      </div>
      <p className="mt-2 rounded-2xl border border-gold/50 bg-gold/10 p-4 text-xs font-semibold">
        This controls ALL app revenue. AdMob for ads. Paystack for Sponsored + Boosts. All money goes
        directly to you.
      </p>

      {/* SECTION A */}
      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          Ad Revenue from Posts, Reels, Status, Comments
        </h2>
        <p className="text-xs text-muted-foreground">
          You earn money when users watch reels, view posts, see status, or click ads. Google pays you
          directly.
        </p>
        <Field label="AdMob App ID" value={form.admob_app_id ?? ""} onChange={(v) => set("admob_app_id", v)} />
        <Field
          label="AdMob Banner Ad Unit ID"
          value={form.admob_banner_id ?? ""}
          onChange={(v) => set("admob_banner_id", v)}
        />
        <Field
          label="AdMob Interstitial Ad Unit ID"
          value={form.admob_interstitial_id ?? ""}
          onChange={(v) => set("admob_interstitial_id", v)}
        />
        <Field
          label="AdMob Rewarded Ad Unit ID"
          value={form.admob_rewarded_id ?? ""}
          onChange={(v) => set("admob_rewarded_id", v)}
        />
        <Field
          label="AdMob Rewarded Interstitial Ad Unit ID"
          value={form.admob_rewarded_interstitial_id ?? ""}
          onChange={(v) => set("admob_rewarded_interstitial_id", v)}
        />
        <Field
          label="AdMob Native Ad Unit ID"
          value={form.admob_native_id ?? ""}
          onChange={(v) => set("admob_native_id", v)}
        />
        <Field
          label="AdMob Payment Email"
          type="email"
          value={form.admob_payment_email ?? ""}
          onChange={(v) => set("admob_payment_email", v)}
        />
        <Toggle
          label="Banner Ads"
          checked={form.ads_banner_enabled}
          onChange={(v) => set("ads_banner_enabled", v)}
        />
        <Toggle
          label="Interstitial Ads"
          checked={form.ads_interstitial_enabled}
          onChange={(v) => set("ads_interstitial_enabled", v)}
        />
        <Toggle
          label="Rewarded Ads"
          checked={form.ads_rewarded_enabled}
          onChange={(v) => set("ads_rewarded_enabled", v)}
        />
        <Toggle
          label="AdMob Test Mode"
          checked={form.admob_test_mode}
          onChange={(v) => set("admob_test_mode", v)}
        />
        <button
          type="button"
          onClick={() =>
            save.mutate({
              admob_app_id: form.admob_app_id,
              admob_banner_id: form.admob_banner_id,
              admob_interstitial_id: form.admob_interstitial_id,
              admob_rewarded_id: form.admob_rewarded_id,
              admob_rewarded_interstitial_id: form.admob_rewarded_interstitial_id,
              admob_native_id: form.admob_native_id,
              admob_payment_email: form.admob_payment_email,
              ads_banner_enabled: form.ads_banner_enabled,
              ads_interstitial_enabled: form.ads_interstitial_enabled,
              ads_rewarded_enabled: form.ads_rewarded_enabled,
              admob_test_mode: form.admob_test_mode,
            })
          }
          disabled={save.isPending}
          className="btn-base btn-primary w-full disabled:opacity-60"
        >
          Save AdMob Settings
        </button>
      </section>

      {/* SECTION B */}
      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Sponsored Posts + Boost Payments</h2>
        <Field
          label="Paystack Public Key"
          value={form.paystack_public_key ?? ""}
          onChange={(v) => set("paystack_public_key", v)}
        />
        <p className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          Your Paystack <strong>Secret Key</strong> and <strong>Webhook Secret</strong> are no longer
          kept in the app database. They are stored as secure environment variables on the server, so
          nobody — not even a signed-in admin — can read them from the app.
        </p>

        <Field
          label="Paystack Webhook URL"
          value={form.paystack_webhook_url ?? ""}
          onChange={(v) => set("paystack_webhook_url", v)}
        />
        <Field
          label="Owner Payout Email"
          type="email"
          value={form.paystack_payout_email ?? ""}
          onChange={(v) => set("paystack_payout_email", v)}
        />
        <Toggle
          label="Paystack Test Mode"
          checked={form.paystack_test_mode}
          onChange={(v) => {
            set("paystack_test_mode", v);
            set("test_mode", v);
            set("live_mode", !v);
          }}
        />
        <button
          type="button"
          onClick={() =>
            save.mutate({
              paystack_public_key: form.paystack_public_key,
              
              paystack_webhook_url: form.paystack_webhook_url,
              paystack_payout_email: form.paystack_payout_email,
              paystack_test_mode: form.paystack_test_mode,
              test_mode: form.paystack_test_mode,
              live_mode: !form.paystack_test_mode,
            })
          }
          disabled={save.isPending}
          className="btn-base btn-primary w-full disabled:opacity-60"
        >
          Save Paystack Settings
        </button>
      </section>

      {/* SECTION C */}
      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Set Your Prices</h2>
        <MoneyField
          label="Price per 1000 Impressions"
          value={form.price_per_1000_impressions}
          onChange={(v) => set("price_per_1000_impressions", v)}
        />
        <MoneyField
          label="Price per 7 Days Sponsored"
          value={form.price_sponsored_7_days}
          onChange={(v) => set("price_sponsored_7_days", v)}
        />
        <MoneyField
          label="Price per 30 Days Sponsored"
          value={form.price_sponsored_30_days}
          onChange={(v) => set("price_sponsored_30_days", v)}
        />
        <MoneyField
          label="Boost 1 Post"
          value={form.price_boost_post}
          onChange={(v) => set("price_boost_post", v)}
        />
        <MoneyField
          label="Boost 7 Days"
          value={form.price_boost_7_days}
          onChange={(v) => set("price_boost_7_days", v)}
        />
        <button
          type="button"
          onClick={() =>
            save.mutate({
              price_per_1000_impressions: form.price_per_1000_impressions,
              price_sponsored_7_days: form.price_sponsored_7_days,
              price_sponsored_30_days: form.price_sponsored_30_days,
              price_boost_post: form.price_boost_post,
              price_boost_7_days: form.price_boost_7_days,
            })
          }
          disabled={save.isPending}
          className="btn-base btn-primary w-full disabled:opacity-60"
        >
          Save Pricing
        </button>
      </section>

      {/* Pending sponsored posts */}
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Pending Sponsored Posts</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(orders.data ?? []).map((order) => (
            <li key={order.id} className="rounded-xl bg-secondary/60 p-3">
              <p className="font-semibold">
                {order.brand_name} · R{Number(order.amount).toFixed(2)} · {order.days} days
              </p>
              <p className="text-xs text-muted-foreground">
                {order.brand_email}
                {order.phone ? ` · ${order.phone}` : ""} · {order.package} · {order.status}
              </p>
              {order.message ? <p className="mt-1 text-xs">{order.message}</p> : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => orderStatus.mutate({ id: order.id, status: "approved" })}
                  className="btn-base btn-primary px-3 py-1.5 text-xs"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => orderStatus.mutate({ id: order.id, status: "rejected" })}
                  className="btn-base bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {(orders.data ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No sponsored orders yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">How Money Flows</h2>
        <p>
          <strong>Ad money:</strong> a member watches a reel, status or post → a Meta Audience Network
          ad shows → the ad network collects the money → the ad network pays you directly into your own
          bank account. Google AdMob is no longer used anywhere in MzansiTalk.
        </p>
        <p>
          <strong>Sponsored / Boost money:</strong> a brand or member pays at Paystack checkout → money
          goes directly into your Paystack account → your bank in 1–2 days.
        </p>
        <p>
          Only the Owner ({OWNER_EMAIL}) can edit these keys. There are 2 payment systems: Meta
          Audience Network for ads and Paystack for Sponsored, Boosts and in-app purchases. MzansiTalk
          never stores your bank details — only the keys above.
        </p>

      </section>
    </Screen>
  );
}
