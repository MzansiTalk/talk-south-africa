import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId, getMyEmail, OWNER_EMAIL } from "@/lib/api";

/** ExoClick is the only ad network in MzansiTalk. */
export type AdNetwork = "exoclick";

/** ExoClick pre-roll is the only ad slot in the app. */
export type AdPlacementSlot = "preroll_video";

/** Which piece of content the ad was shown on, so 20% of the revenue is attributed to its creator. */
export type AdTarget = {
  postId?: string | null;
  contentKind?: string | null;
  ownerId?: string | null;
};

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

/** Small hook so pre-roll surfaces know whether this member may see ads at all. */
export function useAdEligibility() {
  const eligible = useQuery({
    queryKey: ["ad-eligible"],
    queryFn: fetchAdEligibility,
    staleTime: 300_000,
  });
  return eligible.data === true;
}

// ==================== LIVE STREAM AD PAUSE ====================

let liveActiveCount = 0;
const liveListeners = new Set<() => void>();

function emitLive() {
  for (const listener of liveListeners) listener();
}

/**
 * No ad may be served on top of an already running live stream. Live screens
 * call this on mount/unmount so every ad surface goes quiet.
 */
export function useAdsPausedForLive(isLive: boolean) {
  useEffect(() => {
    if (!isLive) return;
    liveActiveCount += 1;
    emitLive();
    return () => {
      liveActiveCount = Math.max(0, liveActiveCount - 1);
      emitLive();
    };
  }, [isLive]);
}

export function useIsLiveActive() {
  return useSyncExternalStore(
    (listener) => {
      liveListeners.add(listener);
      return () => liveListeners.delete(listener);
    },
    () => liveActiveCount > 0,
    () => false,
  );
}

// ==================== IMPRESSIONS AND CLICKS ====================

export async function logAdImpression(
  placement: AdPlacementSlot,
  network: AdNetwork = "exoclick",
  target: AdTarget = {},
) {
  const args: {
    _placement: string;
    _network: string;
    _post_id?: string;
    _content_kind?: string;
    _content_owner_id?: string;
  } = { _placement: placement, _network: network };
  if (target.postId) args._post_id = target.postId;
  if (target.contentKind) args._content_kind = target.contentKind;
  if (target.ownerId) args._content_owner_id = target.ownerId;
  const { data } = await supabase.rpc("log_ad_impression", args);
  return (data as string | null) ?? null;
}

export async function logAdClick(impressionId: string) {
  await supabase.rpc("log_ad_click", { _impression_id: impressionId });
}

// ==================== CREATOR AD EARNINGS (20% CREATOR / 80% MZANSITALK) ====================

export type CreatorAdRow = {
  kind: string;
  views: number;
  impressions: number;
  clicks: number;
  revenue: number;
  creator_earnings: number;
};

export type CreatorAdStats = {
  totals: CreatorAdRow;
  breakdown: CreatorAdRow[];
};

const EMPTY_ROW: CreatorAdRow = {
  kind: "all",
  views: 0,
  impressions: 0,
  clicks: 0,
  revenue: 0,
  creator_earnings: 0,
};

export async function fetchCreatorAdStats(): Promise<CreatorAdStats> {
  const { data, error } = await supabase.rpc("creator_ad_stats");
  if (error || !data) return { totals: EMPTY_ROW, breakdown: [] };
  const parsed = data as { totals?: Partial<CreatorAdRow>; breakdown?: CreatorAdRow[] };
  return {
    totals: { ...EMPTY_ROW, ...(parsed.totals ?? {}) },
    breakdown: parsed.breakdown ?? [],
  };
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
