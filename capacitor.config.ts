import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native Android shell for MzansiTalk.
 *
 * MzansiTalk is a server-rendered app, so the APK loads the published site
 * instead of a static copy of the bundle. That keeps the native build in sync
 * with every deploy — publish the web app and the APK updates itself.
 */
const config: CapacitorConfig = {
  appId: "com.mzansitalk.app",
  appName: "MzansiTalk",
  webDir: "public",
  server: {
    // Welcome screen is the app's first (launcher) screen.
    url: "https://talk-south-africa.lovable.app/welcome",
    cleartext: false,
    androidScheme: "https",
  },
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
