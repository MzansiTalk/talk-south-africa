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

export const Route = createFileRoute("/_authenticated/admin/ad-settings")({
  head: () => ({
    meta: [
      { title: "Ad Settings — MzansiTalk Admin" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk ad settings for Meta Audience Network placement ids and ad type switches.",
      },
      { property: "og:title", content: "Ad Settings — MzansiTalk Admin" },
      { property: "og:description", content: "Owner-only ad network settings for MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdSettingsPage,
});

type AdForm = {
  meta_app_id: string;
  meta_banner_placement_id: string;
  meta_interstitial_placement_id: string;
  meta_rewarded_placement_id: string;
  ads_banner_enabled: boolean;
  ads_interstitial_enabled: boolean;
  ads_rewarded_enabled: boolean;
  ads_native_enabled: boolean;
};

const EMPTY: AdForm = {
  meta_app_id: "",
  meta_banner_placement_id: "",
  meta_interstitial_placement_id: "",
  meta_rewarded_placement_id: "",
  ads_banner_enabled: true,
  ads_interstitial_enabled: true,
  ads_rewarded_enabled: true,
  ads_native_enabled: true,
};


function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        className="field field-focus mt-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="mt-1 block text-[0.68rem] text-muted-foreground">{hint}</span> : null}
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

function AdSettingsPage() {
  const queryClient = useQueryClient();
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;

  const settings = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    enabled: isOwner,
  });
  const [form, setForm] = useState<AdForm>(EMPTY);

  useEffect(() => {
    if (!settings.data) return;
    const data = settings.data as Partial<AppSettings>;
    setForm((current) => {
      const next: AdForm = { ...current };
      for (const key of Object.keys(EMPTY) as (keyof AdForm)[]) {
        const value = data[key];
        if (value === null || value === undefined) continue;
        (next as Record<string, unknown>)[key] = value;
      }
      return next;
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => saveAppSettings(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["ad-config"] });
      toast.success("Ad Settings Saved. Ads will now serve with your own ad accounts.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = <K extends keyof AdForm>(key: K, value: AdForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  if (email.isLoading) {
    return (
      <Screen title="Ad Settings">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="Ad Settings">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Ad Settings">
      <div className="rounded-2xl bg-destructive p-4 text-center text-sm font-bold text-destructive-foreground">
        WARNING: OWNER ONLY. These settings control every ad in MzansiTalk.
      </div>

      <section className="mt-4 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Meta Audience Network</h2>
        <Field
          label="Meta App ID"
          value={form.meta_app_id}
          onChange={(value) => set("meta_app_id", value)}
        />
        <Field
          label="Meta Banner Placement ID"
          value={form.meta_banner_placement_id}
          onChange={(value) => set("meta_banner_placement_id", value)}
        />
        <Field
          label="Meta Interstitial Placement ID"
          value={form.meta_interstitial_placement_id}
          onChange={(value) => set("meta_interstitial_placement_id", value)}
        />
        <Field
          label="Meta Rewarded Placement ID"
          value={form.meta_rewarded_placement_id}
          onChange={(value) => set("meta_rewarded_placement_id", value)}
        />
      </section>

      <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">Ad Types</h2>
        <Toggle
          label="Banner Ads"
          checked={form.ads_banner_enabled}
          onChange={(value) => set("ads_banner_enabled", value)}
        />
        <Toggle
          label="Interstitial Ads"
          checked={form.ads_interstitial_enabled}
          onChange={(value) => set("ads_interstitial_enabled", value)}
        />
        <Toggle
          label="Rewarded Ads"
          checked={form.ads_rewarded_enabled}
          onChange={(value) => set("ads_rewarded_enabled", value)}
        />
        <Toggle
          label="Native / Status Ads"
          checked={form.ads_native_enabled}
          onChange={(value) => set("ads_native_enabled", value)}
        />
      </section>

      <p className="mt-4 rounded-2xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
        Ads are never shown to the Owner account, to banned members, or beside content flagged by
        Auto-Mod. Interstitials are capped at one every 2 minutes per member.
      </p>

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="btn-base btn-primary mt-4 w-full disabled:opacity-60"
      >
        {save.isPending ? "Saving…" : "Save Ad Settings"}
      </button>
    </Screen>
  );
}
