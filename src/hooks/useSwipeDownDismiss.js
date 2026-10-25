import { useRef, useEffect, useCallback, useMemo } from "react";

/**
 * Check if all scroll containers (from target up to window) are at scrollTop === 0.
 */
function isScrollAtTop(target, root) {
  let cur = target;
  while (cur && cur !== root) {
    if (cur.scrollTop > 0) return false;
    cur = cur.parentElement;
  }
  if (root && root.scrollTop > 0) return false;

  let parent = root?.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    if (parent.scrollTop > 0) return false;
    parent = parent.parentElement;
  }

  const windowScroll =
    window.scrollY ||
    document.documentElement?.scrollTop ||
    document.body?.scrollTop ||
    0;
  if (windowScroll > 0) return false;

  return true;
}

/**
 * Check if touch began on an interactive or ignored element.
 */
function isIgnoredTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  if (target.closest('input[type="range"]')) return true;
  if (target.closest("canvas")) return true;
  if (target.closest("[data-no-swipe]")) return true;
  return false;
}

/**
 * Hook to dismiss a page via swipe-down gesture using touch events.
 * touchmove is registered with { passive: false } and calls preventDefault()
 * once the downward drag engages, preventing mobile browser scroll cancellation.
 *
 * @param {() => void} onDismiss Callback invoked when swipe down threshold is met
 * @param {{ enabled?: boolean }} [options] Additional configuration options
 * @returns {{ ref: import("react").RefObject, handlers: object }}
 */
export function useSwipeDownDismiss(onDismiss, options = {}) {
  const ref = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const optionsRef = useRef(options);

  useEffect(() => {
    onDismissRef.current = onDismiss;
    optionsRef.current = options;
  });

  const isTrackingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const currentDyRef = useRef(0);
  const touchIdRef = useRef(null);

  // Set overscroll-behavior-y: contain on html and body
  useEffect(() => {
    document.documentElement.style.overscrollBehaviorY = "contain";
    document.body.style.overscrollBehaviorY = "contain";
    return () => {
      document.documentElement.style.overscrollBehaviorY = "";
      document.body.style.overscrollBehaviorY = "";
    };
  }, []);

  const cleanupStyles = useCallback(() => {
    const root = ref.current;
    if (root) {
      root.style.transform = "";
      root.style.opacity = "";
      root.style.transition = "";
      root.style.removeProperty("--drag-y");
    }
    document.documentElement.style.removeProperty("--drag-y");
  }, []);

  // ---------------------------------------------------------------------------
  // Touch event handlers (Phones)
  // ---------------------------------------------------------------------------

  const handleTouchStart = useCallback((e) => {
    if (optionsRef.current?.enabled === false) return;
    // Do not initiate drag while any modal dialog is open (e.g. Queue modal)
    if (document.querySelector('[role="dialog"]')) return;

    const touch = e.touches[0];
    if (!touch) return;

    const root = ref.current;
    if (!isScrollAtTop(e.target, root)) return;
    if (isIgnoredTarget(e.target)) return;

    isTrackingRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    lastYRef.current = touch.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    currentDyRef.current = 0;
    touchIdRef.current = touch.identifier;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isTrackingRef.current) return;

    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchIdRef.current) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;

    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    if (!isDraggingRef.current) {
      // Ignore upward gestures
      if (dy < -10) {
        isTrackingRef.current = false;
        return;
      }
      // Ignore horizontal gestures
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        isTrackingRef.current = false;
        return;
      }
      // Engage vertical drag once downward intent is established
      if (dy > 10 && Math.abs(dy) > Math.abs(dx)) {
        const root = ref.current;
        if (!isScrollAtTop(e.target, root)) {
          isTrackingRef.current = false;
          return;
        }

        isDraggingRef.current = true;
        if (root) {
          root.style.transition = "none";
        }
      }
    }

    if (isDraggingRef.current) {
      // Call preventDefault once vertical drag engages to stop browser navigation/scroll
      if (e.cancelable) {
        e.preventDefault();
      }
      const clampedDy = Math.max(0, dy);
      currentDyRef.current = clampedDy;

      // Slight opacity fade (1 - dy/600, min 0.6)
      const opacity = Math.max(0.6, 1 - clampedDy / 600);

      const root = ref.current;
      if (root) {
        root.style.transition = "none";
        root.style.transform = `translateY(${clampedDy}px)`;
        root.style.opacity = `${opacity}`;
        root.style.setProperty("--drag-y", `${clampedDy}px`);
      }
      document.documentElement.style.setProperty("--drag-y", `${clampedDy}px`);

      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        velocityRef.current = (touch.clientY - lastYRef.current) / dt;
      }
      lastYRef.current = touch.clientY;
      lastTimeRef.current = now;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isTrackingRef.current) return;
    isTrackingRef.current = false;

    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const root = ref.current;
    const now = performance.now();
    let velocity = velocityRef.current;
    if (now - lastTimeRef.current > 70) {
      velocity = 0;
    }

    const dy = currentDyRef.current;

    // Release: dismiss if dy > 120px or velocity > 0.6px/ms, calling onDismiss()
    if (dy > 120 || velocity > 0.6) {
      if (root) {
        root.style.setProperty("--drag-y", `${dy}px`);
        root.style.transform = "";
        root.style.opacity = "";
        root.style.transition = "";
      }
      document.documentElement.style.setProperty("--drag-y", `${dy}px`);

      // Clean up global CSS variable after AnimatedRoutes vertical-exit transition (300ms)
      setTimeout(() => {
        document.documentElement.style.removeProperty("--drag-y");
        if (root) {
          root.style.removeProperty("--drag-y");
        }
      }, 400);

      onDismissRef.current?.();
    } else {
      // Otherwise snap back over 200ms ease-in-out
      if (root) {
        root.style.transition = "transform 200ms ease-in-out, opacity 200ms ease-in-out";
        root.style.transform = "translateY(0px)";
        root.style.opacity = "1";
        root.style.setProperty("--drag-y", "0px");
      }
      document.documentElement.style.setProperty("--drag-y", "0px");

      setTimeout(() => {
        if (root) {
          root.style.transition = "";
          root.style.transform = "";
          root.style.opacity = "";
          root.style.removeProperty("--drag-y");
        }
        document.documentElement.style.removeProperty("--drag-y");
      }, 200);
    }
  }, []);

  const handleTouchCancel = useCallback(() => {
    if (!isTrackingRef.current && !isDraggingRef.current) return;
    isTrackingRef.current = false;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const root = ref.current;
      if (root) {
        root.style.transition = "transform 200ms ease-in-out, opacity 200ms ease-in-out";
        root.style.transform = "translateY(0px)";
        root.style.opacity = "1";
        root.style.setProperty("--drag-y", "0px");
      }
      document.documentElement.style.setProperty("--drag-y", "0px");

      setTimeout(() => {
        if (root) {
          root.style.transition = "";
          root.style.transform = "";
          root.style.opacity = "";
          root.style.removeProperty("--drag-y");
        }
        document.documentElement.style.removeProperty("--drag-y");
      }, 200);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Mouse event handlers fallback (Desktop)
  // ---------------------------------------------------------------------------

  const handleMouseDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (optionsRef.current?.enabled === false) return;
    if (document.querySelector('[role="dialog"]')) return;

    const root = ref.current;
    if (!isScrollAtTop(e.target, root)) return;
    if (isIgnoredTarget(e.target)) return;

    isTrackingRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    currentDyRef.current = 0;
    touchIdRef.current = null;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isTrackingRef.current || touchIdRef.current !== null) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!isDraggingRef.current) {
      if (dy < -10 || (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10)) {
        isTrackingRef.current = false;
        return;
      }
      if (dy > 10 && Math.abs(dy) > Math.abs(dx)) {
        const root = ref.current;
        if (!isScrollAtTop(e.target, root)) {
          isTrackingRef.current = false;
          return;
        }
        isDraggingRef.current = true;
        if (root) {
          root.style.transition = "none";
        }
      }
    }

    if (isDraggingRef.current) {
      if (e.cancelable) e.preventDefault();
      const clampedDy = Math.max(0, dy);
      currentDyRef.current = clampedDy;
      const opacity = Math.max(0.6, 1 - clampedDy / 600);

      const root = ref.current;
      if (root) {
        root.style.transition = "none";
        root.style.transform = `translateY(${clampedDy}px)`;
        root.style.opacity = `${opacity}`;
        root.style.setProperty("--drag-y", `${clampedDy}px`);
      }
      document.documentElement.style.setProperty("--drag-y", `${clampedDy}px`);

      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        velocityRef.current = (e.clientY - lastYRef.current) / dt;
      }
      lastYRef.current = e.clientY;
      lastTimeRef.current = now;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (touchIdRef.current !== null) return;
    handleTouchEnd();
  }, [handleTouchEnd]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Attach touch listeners to root with touchmove non-passive
    root.addEventListener("touchstart", handleTouchStart, { passive: true });
    root.addEventListener("touchmove", handleTouchMove, { passive: false });
    root.addEventListener("touchend", handleTouchEnd, { passive: true });
    root.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    root.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove, { passive: false });
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      root.removeEventListener("touchstart", handleTouchStart);
      root.removeEventListener("touchmove", handleTouchMove);
      root.removeEventListener("touchend", handleTouchEnd);
      root.removeEventListener("touchcancel", handleTouchCancel);

      root.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      cleanupStyles();
    };
  }, [
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cleanupStyles,
  ]);

  const handlers = useMemo(
    () => ({
      onTouchStart: handleTouchStart,
      onMouseDown: handleMouseDown,
    }),
    [handleTouchStart, handleMouseDown]
  );

  return { ref, handlers };
}

export default useSwipeDownDismiss;
