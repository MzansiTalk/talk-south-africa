/**
 * Central ad configuration for MzansiTalk.
 *
 * ExoClick VAST 3.0 in-stream video is the ONLY ad network used by this app.
 * There is no Meta Audience Network code, no Google AdMob code, no banners,
 * no interstitials, no native units and no rewarded units anywhere.
 */

export const AD_NETWORK = "exoclick" as const;

/** Rewarded-style free coins are no longer granted by ads. */
export const REWARDED_COINS = 5;

/** Ads may only appear as a pre-roll before this content. Never during a live stream. */
export const AD_ALLOWED_SURFACES = ["reels", "video", "status", "pre_live"] as const;

export type AdSurface = (typeof AD_ALLOWED_SURFACES)[number];

/** Guard used by ad components: no pre-roll once a live stream is already running. */
export function adsAllowedOnSurface(surface: AdSurface, isLive: boolean) {
  if (isLive) return false;
  return AD_ALLOWED_SURFACES.includes(surface);
}
