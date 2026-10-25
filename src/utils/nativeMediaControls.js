import { Capacitor, registerPlugin } from "@capacitor/core";

const MediaControls = registerPlugin("MediaControls");

export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Request notification permissions on Android 13+ (API 33+).
 * Safe to call on any platform / OS version.
 */
export async function requestNotificationPermission() {
  if (!isNativePlatform()) return;
  try {
    if (MediaControls.checkPermissions) {
      const status = await MediaControls.checkPermissions();
      if (status.notifications !== "granted" && MediaControls.requestPermissions) {
        await MediaControls.requestPermissions();
      }
    }
  } catch (err) {
    console.warn("Could not request notification permission:", err);
  }
}

/**
 * Updates the native Android / mobile media session metadata & notification.
 */
export function updateNativeMetadata({ title, artist }) {
  if (!isNativePlatform()) return;
  try {
    MediaControls.updateMetadata({ title, artist }).catch(() => {});
  } catch {
    // Ignore in browser or when plugin is inactive
  }
}

/**
 * Syncs the playback state with the native foreground service & notification.
 */
export function updateNativePlaybackState({ isPlaying }) {
  if (!isNativePlatform()) return;
  try {
    MediaControls.updatePlaybackState({ isPlaying }).catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Syncs recording status with the native foreground service & notification.
 */
export function updateNativeRecording({ recording, elapsed }) {
  if (!isNativePlatform()) return;
  try {
    MediaControls.updateRecording({ recording, elapsed }).catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Syncs offline recording playback state with the native foreground service & notification.
 */
export function updateNativeOfflinePlayback({
  title,
  durationMs,
  positionMs,
  isPlaying,
  offline = true,
  speed = 1.0,
}) {
  if (!isNativePlatform()) return;
  try {
    MediaControls.updateOfflinePlayback({
      title: title || "Recording",
      durationMs: Math.round(durationMs || 0),
      positionMs: Math.round(positionMs || 0),
      isPlaying: Boolean(isPlaying),
      offline: Boolean(offline),
      speed: Number(speed) || 1.0,
    }).catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Removes the notification and stops the background playback service.
 */
export function stopNativeMedia() {
  if (!isNativePlatform()) return;
  try {
    MediaControls.stop().catch(() => {});
  } catch {
    // Ignore
  }
}

/**
 * Subscribes to actions triggered from the notification panel or lock screen (play, pause, next, prev, stop, seek, rewind, forward).
 * Returns an unbind cleanup function.
 */
export function setupNativeMediaListener(onAction) {
  if (!isNativePlatform()) return () => {};

  let listenerHandle = null;

  MediaControls.addListener("mediaAction", (data) => {
    if (data && data.action && onAction) {
      onAction(data.action, data);
    }
  })
    .then((handle) => {
      listenerHandle = handle;
    })
    .catch(() => {});

  return () => {
    if (listenerHandle && typeof listenerHandle.remove === "function") {
      listenerHandle.remove();
    }
  };
}
