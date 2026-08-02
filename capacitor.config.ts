import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native Android shell for MzansiTalk.
 *
 * The Android release bundles its launcher and app shell in the APK. No remote
 * server URL is configured, so Capacitor always starts from local assets.
 */
const config: CapacitorConfig = {
  appId: "com.mzansitalk.app",
  appName: "MzansiTalk",
  webDir: "android-web",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#8E24AA",
      showSpinner: false,
      launchAutoHide: true,
    },
    AdMob: {
      // Production AdMob app id for MzansiTalk.
      appId: "ca-app-pub-1349489304852677~8992145141",
      initializeForTesting: false,
    },
  },
};

export default config;
