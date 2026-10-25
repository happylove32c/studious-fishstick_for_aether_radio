import { useRef, useState, useEffect, useCallback } from "react";

/**
 * Hook to handle swipe-down gesture to dismiss bottom sheet modals.
 * @param {() => void} onClose Callback to invoke when dismissed
 */
export function useSheetDrag(onClose) {
  const sheetRef = useRef(null);
  const [hasEntered, setHasEntered] = useState(false);

  const isDraggingRef = useRef(false);
  const isTrackingRef = useRef(false);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const currentDyRef = useRef(0);

  // Remove animate-sheet-in on animationend so forwards doesn't block inline transform
  const onAnimationEnd = useCallback((e) => {
    if (e.target === sheetRef.current && (!e.animationName || e.animationName === "sheet-in")) {
      setHasEntered(true);
      sheetRef.current?.classList.remove("animate-sheet-in");
    }
  }, []);

  // When sheet unmounts, reset entered state
  useEffect(() => {
    return () => {
      setHasEntered(false);
    };
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const handlePointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;

      // Ignore drags that start inside the scroll body while its scrollTop > 0
      let el = e.target;
      let hasScrolledParent = false;
      while (el && el !== sheet) {
        if (el.scrollTop > 0) {
          hasScrolledParent = true;
          break;
        }
        el = el.parentElement;
      }
      if (hasScrolledParent) return;

      isTrackingRef.current = true;
      isDraggingRef.current = false;
      startYRef.current = e.clientY;
      lastYRef.current = e.clientY;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      currentDyRef.current = 0;
    };

    const handlePointerMove = (e) => {
      if (!isTrackingRef.current) return;

      const rawDy = e.clientY - startYRef.current;

      if (!isDraggingRef.current) {
        // Start dragging only when moving downwards
        if (rawDy > 6) {
          let el = e.target;
          let hasScrolledParent = false;
          while (el && el !== sheet) {
            if (el.scrollTop > 0) {
              hasScrolledParent = true;
              break;
            }
            el = el.parentElement;
          }
          if (hasScrolledParent) {
            isTrackingRef.current = false;
            return;
          }

          isDraggingRef.current = true;
          setHasEntered(true);
          sheet.classList.remove("animate-sheet-in");
          sheet.style.transition = "none";
          try {
            sheet.setPointerCapture(e.pointerId);
          } catch {
            // Ignore if pointer capture is unsupported or fails
          }
        } else if (rawDy < -10) {
          // Upward swipe/scroll, cancel tracking
          isTrackingRef.current = false;
          return;
        }
      }

      if (isDraggingRef.current) {
        const dy = Math.max(0, rawDy);
        currentDyRef.current = dy;
        sheet.style.transform = `translateY(${dy}px)`;
        sheet.style.setProperty("--drag-y", `${dy}px`);

        const now = performance.now();
        const dt = now - lastTimeRef.current;
        if (dt > 0) {
          velocityRef.current = (e.clientY - lastYRef.current) / dt;
        }
        lastYRef.current = e.clientY;
        lastTimeRef.current = now;
      }
    };

    const handlePointerUp = () => {
      if (!isTrackingRef.current) return;
      isTrackingRef.current = false;

      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      const now = performance.now();
      let velocity = velocityRef.current;
      if (now - lastTimeRef.current > 70) {
        velocity = 0;
      }

      const dy = currentDyRef.current;

      // Dismiss if dy > 120px or velocity > 0.6px/ms, otherwise snap back over 200ms ease-in-out
      if (dy > 120 || velocity > 0.6) {
        sheet.style.setProperty("--drag-y", `${dy}px`);
        sheet.style.transform = "";
        sheet.style.transition = "";
        onClose();
      } else {
        sheet.style.transition = "transform 200ms ease-in-out";
        sheet.style.transform = "translateY(0px)";
        sheet.style.setProperty("--drag-y", "0px");
        setTimeout(() => {
          if (sheet) {
            sheet.style.transition = "";
            sheet.style.transform = "";
          }
        }, 200);
      }
    };

    sheet.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      sheet.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [onClose]);

  return {
    sheetRef,
    hasEntered,
    onAnimationEnd,
  };
}

export default useSheetDrag;
