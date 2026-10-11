// src/hooks/usePlayerShortcuts.js
import { useEffect } from "react";
import { usePlayer } from "../context/usePlayer";

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function usePlayerShortcuts() {
  const { current, toggle, next, prev, playlist } = usePlayer();

  useEffect(() => {
    if (!current) return; // nothing loaded: let keys scroll/type normally

    const ignore = (e) => {
      const t = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey) return true;
      if (!t) return false;
      if (t.isContentEditable) return true;
      return TEXT_TAGS.has(t.tagName) && t.type !== "range";
    };

    const onKeyDown = (e) => {
      if (ignore(e)) return;

      // Shift+P → previous
      if (e.shiftKey && e.code === "KeyP") {
        e.preventDefault();
        if (!e.repeat && playlist.length > 1) prev();
        return;
      }

      // Shift+N → next
      if (e.shiftKey && e.code === "KeyN") {
        e.preventDefault();
        if (!e.repeat && playlist.length > 1) next();
        return;
      }

      // Space → play/pause
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) toggle();
      }
    };

    const onKeyUp = (e) => {
      // Stops a focused button from also firing its click on keyup
      const isOurKey =
        e.code === "Space" ||
        ((e.code === "KeyP" || e.code === "KeyN") && e.shiftKey);
      if (isOurKey && !ignore(e)) e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [current, toggle, next, prev, playlist.length]);
}