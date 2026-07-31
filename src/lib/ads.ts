import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId, getMyEmail, OWNER_EMAIL } from "@/lib/api";

export type AdNetwork = "admob" | "meta";

export type AdPlacementSlot =
  | "home_native"
  | "home_banner"
  | "profile_banner"
  | "search_banner"
  | "reel_video"
  | "reel_banner"
  | "reel_interstitial"
  | "rewarded_boost"
  | "status_ad";

export type AdConfig = {
  admob_app_id: string | null;
  admob_banner_id: string | null;
  admob_interstitial_id: string | null;
  admob_rewarded_id: string | null;
  admob_native_id: string | null;
  admob_status_id: string | null;
  meta_app_id: string | null;
  meta_banner_placement_id: string | null;
  meta_interstitial_placement_id: string | null;
  meta_rewarded_placement_id: string | null;
  ads_banner_enabled: boolean;
  ads_interstitial_enabled: boolean;
  ads_rewarded_enabled: boolean;
  ads_native_enabled: boolean;
  test_mode: boolean;
  live_mode: boolean;
};

const DEFAULT_CONFIG: AdConfig = {
  admob_app_id: null,
  admob_banner_id: null,
  admob_interstitial_id: null,
  admob_rewarded_id: null,
  admob_native_id: null,
  admob_status_id: null,
  meta_app_id: null,
  meta_banner_placement_id: null,
  meta_interstitial_placement_id: null,
  meta_rewarded_placement_id: null,
  ads_banner_enabled: true,
  ads_interstitial_enabled: true,
  ads_rewarded_enabled: true,
  ads_native_enabled: true,
  test_mode: true,
  live_mode: false,
};

/** Non-secret ad unit ids and ON/OFF switches, safe for every signed-in member. */
export async function fetchAdConfig(): Promise<AdConfig> {
  const { data, error } = await supabase.rpc("ad_config");
  if (error || !data) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...(data as Partial<AdConfig>) };
}

/** Ads are never shown to the Owner account or to banned members. */
export async function fetchAdEligibility(): Promise<boolean> {
  const email = (await getMyEmail())?.toLowerCase() ?? "";
  if (email === OWNER_EMAIL) return false;
  const userId = await getCurrentUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", userId)
    .maybeSingle();
  return !data?.is_banned;
}

type AdType = "banner" | "interstitial" | "rewarded" | "native";

/** Central switchboard for every ad slot in the app. */
export function useAds() {
  const config = useQuery({ queryKey: ["ad-config"], queryFn: fetchAdConfig, staleTime: 300_000 });
  const eligible = useQuery({
    queryKey: ["ad-eligible"],
    queryFn: fetchAdEligibility,
    staleTime: 300_000,
  });

  const cfg = config.data ?? DEFAULT_CONFIG;
  const allowed = eligible.data === true;

  const canShow = (type: AdType) => {
    if (!allowed) return false;
    if (type === "banner") return cfg.ads_banner_enabled;
    if (type === "interstitial") return cfg.ads_interstitial_enabled;
    if (type === "rewarded") return cfg.ads_rewarded_enabled;
    return cfg.ads_native_enabled;
  };

  return { config: cfg, allowed, canShow, isLoading: config.isLoading || eligible.isLoading };
}

// ==================== IMPRESSIONS, CLICKS, FREQUENCY CAP ====================

export async function logAdImpression(placement: AdPlacementSlot, network: AdNetwork = "admob") {
  const userId = await getCurrentUserId();
  const { data } = await supabase
    .from("ad_impressions")
    .insert({ user_id: userId, placement, network })
    .select("id")
    .maybeSingle();
  return data?.id ?? null;
}

export async function logAdClick(impressionId: string) {
  await supabase.from("ad_impressions").update({ clicked: true }).eq("id", impressionId);
}

const CAP_KEY = "mzansitalk:last-interstitial";
export const INTERSTITIAL_COOLDOWN_MS = 2 * 60 * 1000;

/** Frequency cap: at most one interstitial every 2 minutes per user. */
export function canShowInterstitial(): boolean {
  if (typeof window === "undefined") return false;
  const last = Number(window.localStorage.getItem(CAP_KEY) ?? 0);
  return Date.now() - last >= INTERSTITIAL_COOLDOWN_MS;
}

export function markInterstitialShown() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CAP_KEY, String(Date.now()));
}

// ==================== OWNER AD EARNINGS ====================

export type AdEarnings = {
  revenue: number;
  impressions: number;
  clicks: number;
  ecpm: number;
  ctr: number;
  byNetwork: { network: string; impressions: number; revenue: number }[];
  byPlacement: { placement: string; impressions: number; revenue: number }[];
};

export async function fetchAdEarnings(): Promise<AdEarnings> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("ad_impressions")
    .select("placement, revenue, network, clicked")
    .gte("created_at", monthStart.toISOString());

  const rows = (data ?? []) as {
    placement: string;
    revenue: number | null;
    network: string | null;
    clicked: boolean | null;
  }[];

  const revenue = rows.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const impressions = rows.length;
  const clicks = rows.filter((row) => row.clicked).length;

  const group = (key: "network" | "placement") => {
    const map = new Map<string, { impressions: number; revenue: number }>();
    for (const row of rows) {
      const name = String(row[key] ?? "unknown");
      const current = map.get(name) ?? { impressions: 0, revenue: 0 };
      map.set(name, {
        impressions: current.impressions + 1,
        revenue: current.revenue + Number(row.revenue ?? 0),
      });
    }
    return [...map.entries()].sort((a, b) => b[1].impressions - a[1].impressions);
  };

  return {
    revenue,
    impressions,
    clicks,
    ecpm: impressions > 0 ? (revenue / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    byNetwork: group("network").map(([network, value]) => ({ network, ...value })),
    byPlacement: group("placement").map(([placement, value]) => ({ placement, ...value })),
  };
}
