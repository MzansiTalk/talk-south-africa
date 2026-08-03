/**
 * Central Meta Audience Network ad configuration for MzansiTalk.
 *
 * Google AdMob is NOT used anywhere in this app. Every value below exists so
 * the placement rules Meta reviews for (one banner per screen, 120 second
 * interstitial cooldown, rewarded-only-on-complete, no ads during live) live in
 * exactly one place.
 *
 * Play Console Data Safety note: Meta Audience Network collects Device ID and
 * Advertising ID for ad selection, capping and measurement. Declare
 * "Device or other IDs — Advertising or marketing / Analytics" in Data Safety.
 */

export const AD_NETWORK = "meta" as const;

/** Placement ids fall back to the ones the Owner saves in the Money Center. */
export const AD_PLACEMENTS = {
  /** Test placement ids used for admin/owner test devices. */
  test: {
    banner: "IMG_16_9_APP_INSTALL#TEST_BANNER",
    interstitial: "VID_HD_9_16_39S_APP_INSTALL#TEST_INTERSTITIAL",
    rewarded: "VID_HD_16_9_46S_APP_INSTALL#TEST_REWARDED",
    native: "IMG_16_9_APP_INSTALL#TEST_NATIVE",
  },
} as const;

/** Meta policy: at most one interstitial every 2 minutes, per user. */
export const INTERSTITIAL_COOLDOWN_MS = 120_000;

/** Storage key holding the timestamp of the last interstitial shown. */
export const LAST_INTERSTITIAL_KEY = "lastInterstitialTime";

/** Legacy keys kept so an upgrade never accidentally unlocks the cooldown. */
export const LEGACY_INTERSTITIAL_KEYS = ["lastAdTime", "mzansitalk:last-interstitial"];

/** Only one banner may render per screen. */
export const MAX_BANNERS_PER_SCREEN = 1;

/** Minimum clear space between a banner and any tappable app control (px). */
export const BANNER_SAFE_PADDING_PX = 16;

/** Tailwind classes that enforce the 16px separation from Like / Buy buttons. */
export const BANNER_SAFE_AREA_CLASS = "my-4 p-4";

/** Rewarded ads pay out 5 coins, and only after the ad completes. */
export const REWARDED_COINS = 5;

/** Rewarded ad length in seconds; the reward fires at 100%. */
export const REWARDED_LENGTH_SECONDS = 5;

/** Interstitial after every N reels or long videos. */
export const INTERSTITIAL_EVERY_N_VIDEOS = 3;

/** Native / banner unit after every N posts in the Home feed. */
export const FEED_AD_EVERY_N_POSTS = 5;

/** Ads may only appear on these surfaces. Never during an active live stream. */
export const AD_ALLOWED_SURFACES = ["home", "reels", "status", "comments", "pre_live", "post_live"] as const;

export type AdSurface = (typeof AD_ALLOWED_SURFACES)[number];

/** Guard used by ad components: no banners or interstitials while live. */
export function adsAllowedOnSurface(surface: AdSurface, isLive: boolean) {
  if (isLive) return false;
  return AD_ALLOWED_SURFACES.includes(surface);
}
