/**
 * MzansiTalk Android shell.
 *
 * The APK bundles this welcome screen locally so the app always opens, then
 * hands over to the live MzansiTalk web app as soon as any internet
 * connection (mobile data on any carrier, or WiFi) is reachable.
 */
const APP_URL = "https://talk-south-africa.lovable.app/";
// Probed with a plain GET; any HTTP response proves internet works.
const PROBE_URLS = [APP_URL, "https://clients3.google.com/generate_204"];
const ATTEMPTS = 4;

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

/** Fetch with an explicit timeout so slow 3G never hangs forever. */
async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** True as soon as any probe URL answers. Never assumes WiFi-only. */
async function reachable() {
  let lastError = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const timeout = 6000 + attempt * 4000; // 10s → 22s for slow mobile data
    for (const url of PROBE_URLS) {
      try {
        const response = await fetch2(url, timeout);
        log("probe ok", url, response.status, "attempt", attempt);
        return { ok: true };
      } catch (error) {
        lastError = error;
        log("probe failed", url, String(error));
      }
    }
    setState(
      "Still connecting…",
      `Retrying on your current network (attempt ${attempt} of ${ATTEMPTS}).`,
      lastError ? String(lastError.message || lastError) : "",
    );
    await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
  }
  return { ok: false, error: lastError };
}

function fetch2(url, timeout) {
  return fetchWithTimeout(url, timeout);
}

async function openApp() {
  show("chat");
  chatSub.textContent = "Messages";
  setState("Connecting to MzansiTalk…", "Checking your mobile data or WiFi connection.", "");
  retryBtn.disabled = true;

  const result = await reachable();
  retryBtn.disabled = false;

  if (result.ok) {
    setState("Connected", "Loading MzansiTalk…", "");
    log("navigating to", APP_URL);
    window.location.replace(APP_URL);
    return;
  }

  const detail = result.error ? String(result.error.message || result.error) : "Unknown network error";
  setState(
    "Can't reach MzansiTalk",
    "Your data or WiFi seems to be on, but the server did not answer. Check your signal and tap Try again.",
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
