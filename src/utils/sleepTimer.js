const listeners = new Set();

let endsAt = null;
let timeoutId = null;
let fadeId = null;
let tickId = null;
let active = false;
let originalVolume = null;

let bound = { pause: null, setVolume: null, getVolume: null };

export function bind(callbacks) {
  bound = { ...bound, ...callbacks };
}

function notify() {
  const state = getState();
  listeners.forEach((cb) => {
    try {
      cb(state);
    } catch (err) {
      console.warn("Sleep timer subscriber error:", err);
    }
  });
}

export function getState() {
  return {
    active,
    endsAt,
    remainingMs: endsAt ? Math.max(0, endsAt - Date.now()) : 0,
  };
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function start(minutes) {
  cancel({ silent: true });

  const ms = Math.max(1, minutes) * 60 * 1000;
  endsAt = Date.now() + ms;
  active = true;
  originalVolume = bound.getVolume ? bound.getVolume() : null;

  // Fire notify every second so any mounted consumer re-renders
  tickId = setInterval(notify, 1000);

  const fadeMs = Math.min(30000, ms);
  const fadeStartIn = Math.max(0, ms - fadeMs);

  const fadeTimeout = setTimeout(() => {
    if (!active) return;
    const steps = 30;
    const stepMs = fadeMs / steps;
    const startVol = originalVolume ?? 1;
    let step = 0;

    fadeId = setInterval(() => {
      step += 1;
      const t = step / steps;
      try {
        bound.setVolume?.(Math.max(0, startVol * (1 - t)));
      } catch {
        /* ignore */
      }
      if (step >= steps) {
        clearInterval(fadeId);
        fadeId = null;
      }
    }, stepMs);
  }, fadeStartIn);

  timeoutId = setTimeout(() => {
    if (!active) return;
    try {
      bound.pause?.();
    } catch {
      /* ignore */
    }
    if (originalVolume != null) {
      try {
        bound.setVolume?.(originalVolume);
      } catch {
        /* ignore */
      }
    }
    clear();
    notify();
  }, ms);

  timeoutId._fadeHandle = fadeTimeout;

  notify();
  return getState();
}

export function cancel({ silent = false } = {}) {
  if (timeoutId) {
    clearTimeout(timeoutId);
    if (timeoutId._fadeHandle) clearTimeout(timeoutId._fadeHandle);
    timeoutId = null;
  }
  if (fadeId) {
    clearInterval(fadeId);
    fadeId = null;
  }
  if (tickId) {
    clearInterval(tickId);
    tickId = null;
  }
  if (active && originalVolume != null) {
    try {
      bound.setVolume?.(originalVolume);
    } catch {
      /* ignore */
    }
  }
  clear();
  if (!silent) notify();
}

function clear() {
  endsAt = null;
  active = false;
  originalVolume = null;
  if (tickId) {
    clearInterval(tickId);
    tickId = null;
  }
}

export const PRESETS = [5, 10, 15, 30, 45, 60, 90];