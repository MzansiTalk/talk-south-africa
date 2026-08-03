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
  server: {
    androidScheme: "https",
    // The bundled shell hands over to the live app once any network is up.
    allowNavigation: ["talk-south-africa.lovable.app", "*.lovable.app", "*.supabase.co"],
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#8E24AA",
      showSpinner: false,
      launchAutoHide: true,
    },
};

export default config;
