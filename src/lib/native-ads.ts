/**
 * Native AdMob bridge.
 *
 * The ad components in `src/components/Ads.tsx` call `globalThis.admob.showAd()`.
 * On the web that call is a no-op (the in-app ad surface renders instead). Inside
 * the Capacitor Android build this module wires that same call to the real
 * Google AdMob SDK, so the APK serves live ads with no extra component changes.
 *
 * Everything is dynamically imported so the web bundle never loads native code.
 */

type ShowAdOptions = { adUnitId: string; format: string; testMode: boolean };

let installed = false;

/** True only inside the Capacitor native shell (the Android APK). */
async function isNativeAndroid() {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Installs `globalThis.admob` on top of the native AdMob SDK. */
export async function installNativeAdMob() {
  if (installed) return;
  if (!(await isNativeAndroid())) return;
  installed = true;

  const admobModule = await import("@capacitor-community/admob");
  const { AdMob, BannerAdSize, BannerAdPosition } = admobModule;

  await AdMob.initialize({ initializeForTesting: false });

  const showAd = async ({ adUnitId, format, testMode }: ShowAdOptions) => {
    try {
      if (format === "banner" || format === "native" || format === "status") {
        await AdMob.showBanner({
          adId: adUnitId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: testMode,
        });
        return;
      }

      if (format === "rewarded") {
        await AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: testMode });
        await AdMob.showRewardVideoAd();
        return;
      }

      // interstitial + inline video ads
      await AdMob.prepareInterstitial({ adId: adUnitId, isTesting: testMode });
      await AdMob.showInterstitial();
    } catch (error) {
      // A failed fill must never break the feed — the in-app surface stays visible.
      console.warn("AdMob request failed", error);
    }
  };

  (globalThis as { admob?: { showAd: (options: ShowAdOptions) => unknown } }).admob = {
    showAd: (options) => {
      void showAd(options);
    },
  };
}
