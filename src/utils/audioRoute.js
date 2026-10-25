import { Capacitor, registerPlugin } from "@capacitor/core";

const AudioRoute = registerPlugin("AudioRoute");

/**
 * Returns the current audio output route ("bluetooth" | "wired" | "speaker" | "earpiece").
 * Resolves to "speaker" on web or if an error occurs.
 */
export async function getAudioRoute() {
  if (!Capacitor.isNativePlatform()) {
    return "speaker";
  }

  try {
    const result = await AudioRoute.getRoute();
    return result?.route || "speaker";
  } catch {
    return "speaker";
  }
}

/**
 * Subscribes to native audio device route changes.
 * Returns an unsubscribe function.
 * No-ops when !Capacitor.isNativePlatform().
 */
export function subscribeAudioRoute(cb) {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let listenerHandle = null;
  let isSubscribed = true;

  AudioRoute.addListener("routeChanged", (data) => {
    if (data && data.route && cb) {
      cb(data.route);
    }
  })
    .then((handle) => {
      if (!isSubscribed) {
        if (handle && typeof handle.remove === "function") {
          handle.remove();
        }
      } else {
        listenerHandle = handle;
      }
    })
    .catch(() => {});

  return () => {
    isSubscribed = false;
    if (listenerHandle && typeof listenerHandle.remove === "function") {
      listenerHandle.remove();
    }
  };
}
