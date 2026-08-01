# Building the MzansiTalk Android APK

The web app stays exactly as it is. Capacitor wraps it in a native Android shell
so the real Google AdMob SDK can serve ads (banners, interstitials, rewarded).

The APK loads the published site (`https://talk-south-africa.lovable.app`, set in
`capacitor.config.ts`). Publish the web app and the APK picks up the change — no
rebuild needed for content updates.

## One-time setup on your computer

Requirements: Node.js 20+, Android Studio (with the Android SDK), and a JDK 21.

```bash
git clone <your project repo>
cd <project>
npm install
npx cap add android
npx cap sync android
```

## Open and build

```bash
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The file lands in `android/app/build/outputs/apk/debug/app-debug.apk`.

For a Play Store upload use **Build → Generate Signed Bundle / APK**, create a
keystore, and pick **Android App Bundle (.aab)**.

## AdMob

`capacitor.config.ts` already carries your production AdMob app id
(`ca-app-pub-1349489304852677~8992145141`). `npx cap sync android` injects it
into `AndroidManifest.xml`.

The individual ad unit ids come from **Owner Money Center → Ad Settings** in the
app, so you can change them any time without rebuilding.

`src/lib/native-ads.ts` connects the app's ad slots to the native SDK:

| App slot                    | AdMob format             |
| --------------------------- | ------------------------ |
| Feed native / status ads    | Adaptive banner          |
| Banner slots                | Adaptive banner          |
| Reel / video interstitials  | Interstitial             |
| Boost discount reward       | Rewarded video           |

## Updating the shell

After changing `capacitor.config.ts` or adding plugins:

```bash
npx cap sync android
```

## Notes

- Google requires a privacy policy URL and an app-ads.txt entry before AdMob
  serves live ads at volume.
- Test on a real device: emulators often report no ad fill.
- Ads never show to the Owner account or banned members — that rule lives in the
  app, so it applies in the APK too.
