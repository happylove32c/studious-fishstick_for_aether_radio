import { useState, useEffect } from "react";

/**
 * Custom hook to control modal presence and exit transitions.
 * @param {boolean} isOpen - Whether the modal is requested to be open.
 * @param {number} ms - Duration of the exit transition in milliseconds.
 * @returns {{ mounted: boolean, closing: boolean }}
 */
export function useModalPresence(isOpen, ms = 300) {
  const [mounted, setMounted] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  if (isOpen) {
    if (!mounted || closing) {
      setMounted(true);
      setClosing(false);
    }
  } else if (mounted && !closing) {
    setClosing(true);
  }

  useEffect(() => {
    if (closing) {
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, ms);
      return () => clearTimeout(timer);
    }
  }, [closing, ms]);

  return { mounted, closing };
}

export default useModalPresence;
