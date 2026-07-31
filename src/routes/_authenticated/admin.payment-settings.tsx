import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import {
  type AppSettings,
  fetchAppSettings,
  getMyEmail,
  OWNER_EMAIL,
  saveAppSettings,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/payment-settings")({
  head: () => ({
    meta: [
      { title: "Payment Settings — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk payment settings for AdMob ad units and Paystack boost payouts.",
      },
      { property: "og:title", content: "Payment Settings — MzansiTalk Admin" },
      { property: "og:description", content: "Owner-only money settings for MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentSettings,
});

const EMPTY: AppSettings = {
  admob_app_id: "",
  admob_banner_id: "",
  admob_interstitial_id: "",
  admob_rewarded_id: "",
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
  paystack_secret_key: "",
  paystack_webhook_secret: "",
  paystack_payout_email: OWNER_EMAIL,
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

function PaymentSettings() {
  const queryClient = useQueryClient();
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;

  const settings = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    enabled: isOwner,
  });
  const [form, setForm] = useState<AppSettings>(EMPTY);

  useEffect(() => {
    if (settings.data) {
      setForm({ ...EMPTY, ...(settings.data as Partial<AppSettings>) });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => saveAppSettings(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["payments-ready"] });
      toast.success("Settings Saved. All ad and boost money will go directly to your accounts.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (email.isLoading) {
    return (
      <Screen title="Payment Settings">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="Payment Settings">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Payment Settings">
      <div className="rounded-2xl bg-destructive p-4 text-center text-sm font-bold text-destructive-foreground">
        WARNING: OWNER ONLY. These settings control all app money.
      </div>

      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Ad Earnings</h2>
        <Field
          label="AdMob App ID"
          value={form.admob_app_id ?? ""}
          onChange={(value) => set("admob_app_id", value)}
        />
        <Field
          label="AdMob Banner Ad Unit ID"
          value={form.admob_banner_id ?? ""}
          onChange={(value) => set("admob_banner_id", value)}
        />
        <Field
          label="AdMob Interstitial Ad Unit ID"
          value={form.admob_interstitial_id ?? ""}
          onChange={(value) => set("admob_interstitial_id", value)}
        />
        <Field
          label="AdMob Native Ad Unit ID"
          value={form.admob_native_id ?? ""}
          onChange={(value) => set("admob_native_id", value)}
        />
        <Field
          label="AdMob Status Ad Unit ID"
          value={form.admob_status_id ?? ""}
          onChange={(value) => set("admob_status_id", value)}
        />
        <Field
          label="AdMob Payment Email"
          type="email"
          value={form.admob_payment_email ?? ""}
          onChange={(value) => set("admob_payment_email", value)}
        />
      </section>

      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Boost Earnings</h2>
        <Field
          label="Paystack Public Key"
          value={form.paystack_public_key ?? ""}
          onChange={(value) => set("paystack_public_key", value)}
        />
        <Field
          label="Paystack Secret Key"
          type="password"
          value={form.paystack_secret_key ?? ""}
          onChange={(value) => set("paystack_secret_key", value)}
        />
        <Field
          label="Paystack Webhook Secret"
          value={form.paystack_webhook_secret ?? ""}
          onChange={(value) => set("paystack_webhook_secret", value)}
        />
        <Field
          label="Paystack Payout Email"
          type="email"
          value={form.paystack_payout_email ?? ""}
          onChange={(value) => set("paystack_payout_email", value)}
        />
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Settings</h2>
        <Toggle
          label="Test Mode"
          checked={form.test_mode}
          onChange={(value) => {
            set("test_mode", value);
            if (value) set("live_mode", false);
          }}
        />
        <Toggle
          label="Live Mode"
          checked={form.live_mode}
          onChange={(value) => {
            set("live_mode", value);
            if (value) set("test_mode", false);
          }}
        />
      </section>

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="btn-base btn-primary mt-4 w-full disabled:opacity-60"
      >
        {save.isPending ? "Saving…" : "Save Settings"}
      </button>
    </Screen>
  );
}
