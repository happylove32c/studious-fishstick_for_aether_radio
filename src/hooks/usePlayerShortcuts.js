// src/hooks/usePlayerShortcuts.js
import { useEffect } from "react";
import { usePlayer } from "../context/usePlayer";
import { usePresetShortcuts } from "./usePresetShortcuts";

const TEXT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const isButtonOrA = (t) =>
  Boolean(t && (t.tagName === "BUTTON" || t.tagName === "A" || t.closest?.("button, a")));

export function usePlayerShortcuts() {
  const { current, toggle, next, prev, playlist } = usePlayer();

  // Install preset 1–6 shortcuts (desktop only, no-op otherwise)
  usePresetShortcuts();

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
        if (isButtonOrA(e.target)) return;
        e.preventDefault();
        if (!e.repeat) toggle();
      }
    };

    const onKeyUp = (e) => {
      if (ignore(e)) return;

      if (e.code === "Space") {
        if (isButtonOrA(e.target)) return;
        e.preventDefault();
        return;
      }

      if ((e.code === "KeyP" || e.code === "KeyN") && e.shiftKey) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [current, toggle, next, prev, playlist.length]);
}