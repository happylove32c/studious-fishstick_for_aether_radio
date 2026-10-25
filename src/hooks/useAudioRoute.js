import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { getAudioRoute, subscribeAudioRoute } from "../utils/audioRoute";

export function useAudioRoute() {
  const isNative = Capacitor.isNativePlatform();
  const [route, setRoute] = useState("speaker");

  useEffect(() => {
    if (!isNative) return;

    let mounted = true;

    getAudioRoute().then((initialRoute) => {
      if (mounted && initialRoute) {
        setRoute(initialRoute);
      }
    });

    const unsubscribe = subscribeAudioRoute((newRoute) => {
      if (mounted && newRoute) {
        setRoute(newRoute);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isNative]);

  return { route, isNative };
}

export default useAudioRoute;
