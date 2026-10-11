import { useState, useRef, useCallback, useEffect } from "react";

const DEBOUNCE_MS = 60 * 1000; // 60 seconds

export function useSpeedTest() {
  const [status, setStatus] = useState("idle"); // "idle" | "running" | "done" | "error"
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const controllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastCompletedRef = useRef(0);
  const statusRef = useRef("idle");
  const resultRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    if (isMountedRef.current) {
      statusRef.current = resultRef.current ? "done" : "idle";
      setStatus(statusRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    lastCompletedRef.current = 0;
    resultRef.current = null;
    if (isMountedRef.current) {
      setResult(null);
      setError(null);
      statusRef.current = "idle";
      setStatus("idle");
    }
  }, []);

  const run = useCallback(async () => {
    // No-op if already running
    if (statusRef.current === "running") return;

    // Debounce: if test completed within the last 60 seconds, return immediately
    const now = Date.now();
    if (now - lastCompletedRef.current < DEBOUNCE_MS) {
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    statusRef.current = "running";
    setStatus("running");
    setError(null);

    const url = `https://speed.cloudflare.com/__down?bytes=200000&_t=${now}`;
    const start = performance.now();

    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const end = performance.now();
      const durationMs = Math.max(1, end - start);
      const mbps =
        Math.round(((blob.size * 8) / (durationMs / 1000) / 1_000_000) * 10) /
        10;

      if (!isMountedRef.current) return;

      lastCompletedRef.current = Date.now();
      const newResult = {
        mbps,
        bytes: blob.size,
        durationMs: Math.round(durationMs),
        timestamp: lastCompletedRef.current,
      };

      resultRef.current = newResult;
      setResult(newResult);
      statusRef.current = "done";
      setStatus("done");
    } catch (err) {
      if (!isMountedRef.current) return;

      if (err?.name === "AbortError") {
        // Silent abort: clear running state
        statusRef.current = resultRef.current ? "done" : "idle";
        setStatus(statusRef.current);
        return;
      }

      setError(err?.message || "Speed test failed");
      statusRef.current = "error";
      setStatus("error");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, []);

  return {
    run,
    result,
    status,
    error,
    reset,
    abort,
  };
}
