import { useEffect, useState } from "react";
import * as sleepTimer from "../utils/sleepTimer";

export function useSleepTimer() {
  const [state, setState] = useState(() => sleepTimer.getState());

  useEffect(() => {
    const unsub = sleepTimer.subscribe((next) => setState({ ...next }));
    return unsub;
  }, []);

  return {
    active: state.active,
    remainingMs: state.remainingMs,
    start: (minutes) => sleepTimer.start(minutes),
    cancel: () => sleepTimer.cancel(),
  };
}

export default useSleepTimer;