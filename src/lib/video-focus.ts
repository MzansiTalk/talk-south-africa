/**
 * Keeps at most one feed video playing at a time.
 * The focused element keeps its sound; every other video is paused and muted.
 */
let current: HTMLVideoElement | null = null;

export function pauseOtherVideos(keep: HTMLVideoElement | null) {
  if (typeof document === "undefined") return;
  for (const video of Array.from(document.querySelectorAll("video"))) {
    if (video === keep) continue;
    video.muted = true;
    if (!video.paused) video.pause();
  }
  current = keep;
}

export function pauseAllVideos() {
  pauseOtherVideos(null);
}

export function isFocusedVideo(video: HTMLVideoElement) {
  return current === video;
}
