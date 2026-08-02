/**
 * MzansiTalk Android shell.
 *
 * The APK bundles this welcome screen locally so the app always opens, then
 * hands over to the live MzansiTalk web app as soon as any internet
 * connection (mobile data on any carrier, or WiFi) is reachable.
 *
 * IMPORTANT: probes use mode:"no-cors". A normal cross-origin fetch from the
 * local app origin is blocked by the browser (no CORS headers on the site),
 * which used to surface as a bogus "Failed to fetch" even when the server was
 * perfectly reachable. WebView navigation itself is NOT subject to CORS, so we
 * navigate whenever the device reports a connection.
 */
const APP_URL = "https://talk-south-africa.lovable.app/";
const PROBE_URLS = [APP_URL, "https://clients3.google.com/generate_204"];
const ATTEMPTS = 3;

const welcome = document.querySelector("#welcome");
const chat = document.querySelector("#chat");
const stateTitle = document.querySelector("#state-title");
const stateText = document.querySelector("#state-text");
const stateError = document.querySelector("#state-error");
const chatSub = document.querySelector("#chat-sub");
const retryBtn = document.querySelector("#retry");
const hint = document.querySelector("#welcome-hint");

function show(screen) {
  welcome.classList.toggle("active", screen === "welcome");
  chat.classList.toggle("active", screen === "chat");
}

function log(...args) {
  // Visible in `adb logcat -s MzansiTalk` via the Capacitor console bridge.
  console.log("[MzansiTalk]", ...args);
}

function setState(title, text, error) {
  stateTitle.textContent = title;
  stateText.textContent = text;
  stateError.textContent = error || "";
}

/** Opaque no-cors fetch with an explicit timeout so slow 3G never hangs forever. */
async function probe(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    // no-cors: an opaque response still proves the request left the device.
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    return true;
  } finally {
    clearTimeout(timer);
  }
}

/** True as soon as any probe URL answers. Never assumes WiFi-only. */
async function reachable() {
  let lastError = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const timeout = 6000 + attempt * 4000; // 10s → 18s for slow mobile data
    for (const url of PROBE_URLS) {
      try {
        await probe(url, timeout);
        log("probe ok", url, "attempt", attempt);
        return { ok: true };
      } catch (error) {
        lastError = error;
        log("probe failed", url, String(error));
      }
    }
    setState(
      "Still connecting…",
      `Retrying on your current network (attempt ${attempt} of ${ATTEMPTS}).`,
      "",
    );
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
  return { ok: false, error: lastError };
}

function openLiveApp() {
  setState("Connected", "Loading MzansiTalk…", "");
  log("navigating to", APP_URL);
  window.location.replace(APP_URL);
}

async function openApp() {
  show("chat");
  chatSub.textContent = "Messages";
  setState("Connecting to MzansiTalk…", "Checking your mobile data or WiFi connection.", "");
  retryBtn.disabled = true;

  const result = await reachable();
  retryBtn.disabled = false;

  if (result.ok) {
    openLiveApp();
    return;
  }

  // Probes can fail for reasons that do not stop real navigation (captive
  // portals, blocked HEAD/GET, proxy quirks). If the device says it is online,
  // let the WebView try the real thing instead of dead-ending the user.
  if (navigator.onLine) {
    log("probes failed but navigator.onLine is true — navigating anyway");
    openLiveApp();
    return;
  }

  const detail = result.error ? String(result.error.message || result.error) : "No network connection";
  setState(
    "Can't reach MzansiTalk",
    "Turn on mobile data or WiFi, then tap Try again.",
    `Network error: ${detail}`,
  );
  log("giving up:", detail);
}

document.querySelector("#start-chat").addEventListener("click", () => {
  void openApp();
});
retryBtn.addEventListener("click", () => {
  void openApp();
});
document.querySelector("#back").addEventListener("click", () => {
  show("welcome");
  hint.textContent = "Tap Start Chat to sign up or log in.";
});

// Auto-continue straight into the app on launch when the network is up.
window.addEventListener("load", () => {
  hint.textContent = navigator.onLine ? "" : "Turn on mobile data or WiFi to sign in.";
  void openApp();
});
window.addEventListener("online", () => {
  log("network came back online");
  if (chat.classList.contains("active")) void openApp();
});
