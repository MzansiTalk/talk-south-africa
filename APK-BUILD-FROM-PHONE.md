# Build the MzansiTalk APK from your phone (GitHub Actions)

You don't need a computer. GitHub builds the APK for you and you download it
from your phone's browser.

## 1. Put the project on GitHub

Either connect this Lovable project to GitHub (Plus menu → GitHub → Connect
project), or create a new repo and upload the ZIP contents.

## 2. (Optional but recommended) Add signing secrets

Without these, the workflow still runs and gives you an installable **debug**
APK. For a Play Store upload you need a signed **release** APK/AAB.

Create a keystore once (needs a computer or a terminal app like Termux):

```bash
keytool -genkey -v -keystore release.keystore -alias mzansitalk \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore > release.keystore.b64
```

Then in GitHub → Settings → Secrets and variables → Actions, add:

| Secret name                 | Value                              |
| --------------------------- | ---------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | contents of `release.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password              |
| `ANDROID_KEY_ALIAS`         | `mzansitalk`                       |
| `ANDROID_KEY_PASSWORD`      | the key password                   |

Keep `release.keystore` safe forever — Play Store updates require the same key.

## 3. Run the build

GitHub → **Actions** → **Build Android APK** → **Run workflow**.
It also runs automatically when you push a tag like `v1.0.0`.

Takes roughly 5–10 minutes.

## 4. Download the APK

Open the finished run → **Artifacts** → `mzansitalk-apk`. GitHub gives you a ZIP
containing the APK. Extract it on your phone (any file manager) and tap to
install — allow "install unknown apps" for your browser/file manager first.

## Notes

- The APK loads the published site (`https://talk-south-africa.lovable.app`), so
  web changes go live in the app as soon as you publish — no rebuild needed.
- AdMob ids come from Owner Money Center → Ad Settings, changeable without a rebuild.
- The `android/` folder isn't committed; the workflow regenerates it with
  `npx cap add android` on every run.
