import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Wifi, WifiOff, X } from "lucide-react";
import { useSpeedTest } from "../hooks/useSpeedTest";

// -----------------------------------------------------------------------------
// Network Quality Thresholds & Status Colors (Tuned for Audio Streaming)
//
// Radio streams require 64 kbps - 320 kbps (0.064 - 0.32 Mbps) sustained bandwidth.
// - RED (< 0.5 Mbps): Too slow or erratic for smooth 128k+ streams (buffer underruns).
// - AMBER (0.5 - 2.0 Mbps): Adequate for standard audio, with minimal headroom.
// - GREEN (> 2.0 Mbps): Plentiful headroom for uninterrupted 320k audio & prefetching.
// -----------------------------------------------------------------------------
const STREAMING_THRESHOLDS = {
  MIN_PLAYABLE_MBPS: 0.5,
  OPTIMAL_MBPS: 2.0,
  TIMEOUT_MS: 15_000,
  MOUNT_DELAY_MS: 2_000,
};

const STATUS_COLORS = {
  GREEN: "#166534",   // WCAG AA green text/fill (6.61:1 on cream)
  AMBER: "#B45309",   // WCAG AA amber text/fill (4.66:1 on cream)
  RED: "#B91C1C",     // WCAG AA red text/fill (6.00:1 on cream)
  NEUTRAL: "#57534E", // WCAG AA grey/ink-muted (7.08:1 on cream)
};

// -----------------------------------------------------------------------------
// Unified Network State Resolver
//
// Single source of truth: header badge, tooltip, and modal all read from here.
// Precedence: Offline > Timeout > Testing > Measured Mbps > Reported Downlink > Unknown
// -----------------------------------------------------------------------------
function resolveNetworkState({
  online,
  isTesting,
  isTimedOut,
  measuredMbps,
  reportedDownlink,
  effectiveType,
}) {
  // 1. Offline (Rule 7)
  if (!online) {
    return {
      status: "offline",
      color: STATUS_COLORS.NEUTRAL,
      bars: 0,
      icon: "offline",
      summaryText: "Offline · No connection",
      reportedText: "Offline",
      measuredText: "Offline",
      hasMeasured: false,
      hasReported: false,
    };
  }

  // 2. 15s Test Timeout (Rule 6)
  if (isTimedOut) {
    return {
      status: "timeout",
      color: STATUS_COLORS.RED,
      bars: 1,
      icon: "online",
      summaryText: "Too slow to measure",
      reportedText:
        reportedDownlink !== null || effectiveType
          ? "Online"
          : "Speed unknown",
      effectiveType: effectiveType || null,
      measuredText: "Too slow to measure",
      hasMeasured: true,
      hasReported: reportedDownlink !== null,
    };
  }

  // 3. Speed test currently executing (Rule 3: amber, static, no animation)
  if (isTesting) {
    return {
      status: "testing",
      color: STATUS_COLORS.AMBER,
      bars: 2,
      icon: "online",
      summaryText: "Testing network…",
      reportedText:
        reportedDownlink !== null || effectiveType
          ? "Online"
          : "Speed unknown",
      effectiveType: effectiveType || null,
      measuredText: "Testing…",
      hasMeasured: false,
      hasReported: reportedDownlink !== null,
    };
  }

  // 4. Precedence: Measured beats reported (Rule 2)
  const hasMeasured = measuredMbps !== null && measuredMbps !== undefined;
  const hasReported = reportedDownlink !== null && reportedDownlink !== undefined;
  const activeMbps = hasMeasured ? measuredMbps : (hasReported ? reportedDownlink : null);

  const formattedMeasured = hasMeasured
    ? (measuredMbps >= 1
        ? `${measuredMbps.toFixed(1)} Mbps`
        : `${Math.round(measuredMbps * 1000)} Kbps`)
    : "Not measured";

  // 5. Unknown / neutral state (Rule 1: neutral grey, 1 lit bar, "Online · speed unknown", never green)
  if (activeMbps === null) {
    return {
      status: "unknown",
      color: STATUS_COLORS.NEUTRAL,
      bars: 1,
      icon: "online",
      summaryText: "Online · speed unknown",
      reportedText: "Speed unknown",
      effectiveType: null,
      measuredText: formattedMeasured,
      hasMeasured,
      hasReported,
    };
  }

  // Connected reported text + badge
  const reportedText = "Online";
  const badgeEffectiveType = effectiveType || null;

  // 6. Threshold evaluation for Audio Streaming (Rule 4)
  if (activeMbps < STREAMING_THRESHOLDS.MIN_PLAYABLE_MBPS) {
    return {
      status: "poor",
      color: STATUS_COLORS.RED,
      bars: 1,
      icon: "online",
      summaryText: `${activeMbps.toFixed(1)} Mbps · Poor for audio`,
      reportedText,
      effectiveType: badgeEffectiveType,
      measuredText: formattedMeasured,
      hasMeasured,
      hasReported,
    };
  }

  if (activeMbps <= STREAMING_THRESHOLDS.OPTIMAL_MBPS) {
    return {
      status: "fair",
      color: STATUS_COLORS.AMBER,
      bars: 2,
      icon: "online",
      summaryText: `${activeMbps.toFixed(1)} Mbps · Fair for audio`,
      reportedText,
      effectiveType: badgeEffectiveType,
      measuredText: formattedMeasured,
      hasMeasured,
      hasReported,
    };
  }

  // Above 2.0 Mbps -> Green (3 bars for 2-5 Mbps, 4 bars for 5+ Mbps)
  const bars = activeMbps >= 5.0 ? 4 : 3;
  return {
    status: "good",
    color: STATUS_COLORS.GREEN,
    bars,
    icon: "online",
    summaryText: `${activeMbps.toFixed(1)} Mbps · Good for audio`,
    reportedText,
    effectiveType: badgeEffectiveType,
    measuredText: formattedMeasured,
    hasMeasured,
    hasReported,
  };
}

// -----------------------------------------------------------------------------
// Signal Bars Helper Component
// -----------------------------------------------------------------------------
function SignalBars({ bars, color, size = "sm" }) {
  const isSm = size === "sm";
  const heights = isSm
    ? ["h-1.5", "h-2", "h-2.5", "h-3.5"]
    : ["h-2.5", "h-4", "h-6", "h-8"];
  const width = isSm ? "w-1" : "w-2";
  const gap = isSm ? "gap-1" : "gap-1.5";
  const containerHeight = isSm ? "h-3.5 pb-0.5" : "h-8";

  return (
    <div className={`flex items-end ${gap} ${containerHeight}`}>
      {[1, 2, 3, 4].map((barNum, idx) => {
        const isLit = bars >= barNum;
        return (
          <span
            key={barNum}
            className={`${width} ${heights[idx]} rounded-sm border border-ink/40 transition-colors`}
            style={{
              backgroundColor: isLit ? color : "#E2E8F0",
            }}
          />
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Raw Browser Connection Reader
// -----------------------------------------------------------------------------
function readBrowserConnection() {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const connection =
    typeof navigator !== "undefined"
      ? navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection
      : null;

  if (!isOnline) {
    return {
      online: false,
      downlink: null,
      effectiveType: null,
    };
  }

  if (!connection || connection.downlink === undefined) {
    return {
      online: true,
      downlink: null,
      effectiveType: connection?.effectiveType
        ? connection.effectiveType.toUpperCase()
        : null,
    };
  }

  return {
    online: true,
    downlink: typeof connection.downlink === "number" ? connection.downlink : null,
    effectiveType: connection.effectiveType
      ? connection.effectiveType.toUpperCase()
      : null,
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function NetworkIndicator() {
  const [browserNetwork, setBrowserNetwork] = useState(readBrowserConnection);
  const [showModal, setShowModal] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const timeoutRef = useRef(null);

  const {
    run: runSpeedTest,
    result: testResult,
    status: testStatus,
    error: testError,
    abort: abortSpeedTest,
  } = useSpeedTest();

  const isTesting = testStatus === "running";

  // 15s Timeout watchdog (Rule 6)
  useEffect(() => {
    if (isTesting) {
      timeoutRef.current = setTimeout(() => {
        abortSpeedTest();
        setIsTimedOut(true);
      }, STREAMING_THRESHOLDS.TIMEOUT_MS);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isTesting, abortSpeedTest]);

  // Safe manual trigger
  const handleTriggerTest = useCallback(() => {
    setIsTimedOut(false);
    runSpeedTest();
  }, [runSpeedTest]);

  // Auto-run once after 2s idle on mount (Rule 3)
  useEffect(() => {
    const mountTimer = setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        handleTriggerTest();
      }
    }, STREAMING_THRESHOLDS.MOUNT_DELAY_MS);

    return () => {
      clearTimeout(mountTimer);
    };
  }, [handleTriggerTest]);

  // Connection change & online/offline listeners (Rule 3)
  const updateNetwork = useCallback(() => {
    const next = readBrowserConnection();
    setBrowserNetwork((prev) => {
      if (
        prev.online === next.online &&
        prev.downlink === next.downlink &&
        prev.effectiveType === next.effectiveType
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      updateNetwork();
      setIsTimedOut(false);
      runSpeedTest();
    };

    const handleOffline = () => {
      abortSpeedTest();
      updateNetwork();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        abortSpeedTest();
      } else {
        updateNetwork();
      }
    };

    const connection =
      typeof navigator !== "undefined"
        ? navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection
        : null;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (connection && typeof connection.addEventListener === "function") {
      connection.addEventListener("change", updateNetwork);
    }

    return () => {
      abortSpeedTest();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (connection && typeof connection.removeEventListener === "function") {
        connection.removeEventListener("change", updateNetwork);
      }
    };
  }, [updateNetwork, abortSpeedTest, runSpeedTest]);

  const handleOpenModal = () => {
    setShowModal(true);
    if (!testResult && !isTesting) {
      handleTriggerTest();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Derive the unified network state
  const state = resolveNetworkState({
    online: browserNetwork.online,
    isTesting,
    isTimedOut,
    measuredMbps: testResult?.mbps ?? null,
    reportedDownlink: browserNetwork.downlink,
    effectiveType: browserNetwork.effectiveType,
  });

  // Modal Sheet Portal (Mobile)
  const modalContent = showModal ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 sm:hidden"
      onClick={handleCloseModal}
    >
      <div
        className="w-full max-w-xs rounded-panel border-3 border-ink bg-panel p-5 sm:p-6 shadow-hard-lg font-jetbrains text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-panel-inset pb-3 mb-4">
          <div className="flex items-center gap-2">
            {state.icon === "online" ? (
              <Wifi
                className="h-5 w-5 shrink-0"
                style={{ color: state.color }}
                strokeWidth={2.5}
              />
            ) : (
              <WifiOff
                className="h-5 w-5 shrink-0"
                style={{ color: state.color }}
                strokeWidth={2.5}
              />
            )}
            <span className="font-fredoka text-base font-bold uppercase tracking-wide text-ink">
              Network Link
            </span>
          </div>
          <button
            onClick={handleCloseModal}
            className="flex h-8 w-8 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform hover:scale-105 active:scale-95"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-4 py-2 text-center">
          {/* Synchronized Large Signal Stack */}
          <div className="flex justify-center">
            <SignalBars bars={state.bars} color={state.color} size="lg" />
          </div>

          <div className="space-y-2.5 py-1 text-left">
            <div className="flex items-center justify-between gap-3 border-b-2 border-panel-inset pb-2">
              <span className="label shrink-0 font-bold text-ink-muted">Reported</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-wider text-ink">
                <span>{state.reportedText}</span>
                {state.effectiveType && (
                  <span className="rounded-pill border border-ink/40 bg-panel-inset px-1.5 py-0.5 text-[9px] font-mono font-bold leading-none text-ink">
                    {state.effectiveType}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="label shrink-0 font-bold text-ink-muted">Measured</span>
              <span
                className="shrink-0 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-wider"
                style={{ color: state.color }}
              >
                {state.measuredText}
              </span>
            </div>
          </div>

          {testStatus === "error" && testError && !isTimedOut && (
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-status-red-text">
              {testError}
            </p>
          )}

          {/* Optional manual re-test button */}
          <button
            onClick={handleTriggerTest}
            disabled={isTesting || !browserNetwork.online}
            className="w-full rounded-pill border-2 border-ink bg-cream py-2 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isTesting ? "Testing speed…" : "Test Speed Again"}
          </button>
        </div>

        <button
          onClick={handleCloseModal}
          className="mt-4 w-full rounded-pill border-3 border-ink bg-[#FFD166] py-2.5 font-fredoka text-sm font-bold uppercase tracking-wider text-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm"
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Header Indicator Button with Desktop Tooltip */}
      <div className="relative group flex items-center">
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-2 rounded-pill border-2 border-ink bg-panel px-3 py-1 shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          title={state.summaryText}
          aria-label={`Network status: ${state.summaryText}`}
        >
          {state.icon === "online" ? (
            <Wifi
              className="h-4 w-4 shrink-0"
              style={{ color: state.color }}
              strokeWidth={2.5}
            />
          ) : (
            <WifiOff
              className="h-4 w-4 shrink-0"
              style={{ color: state.color }}
              strokeWidth={2.5}
            />
          )}

          {/* Synchronized Header Signal Bars */}
          <SignalBars bars={state.bars} color={state.color} size="sm" />
        </button>

        {/* Desktop Tooltip (sm and up) */}
        <div className="pointer-events-none absolute right-0 top-full mt-2 hidden z-50 w-max min-w-[190px] rounded-chunky border-2 border-ink bg-panel p-3.5 shadow-hard sm:group-hover:block select-none font-jetbrains text-ink">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="label shrink-0 font-bold text-ink-muted">Reported</span>
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-wider text-ink">
                <span>{state.reportedText}</span>
                {state.effectiveType && (
                  <span className="rounded-pill border border-ink/40 bg-panel-inset px-1.5 py-0.5 text-[9px] font-mono font-bold leading-none text-ink">
                    {state.effectiveType}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t-2 border-panel-inset pt-1.5">
              <span className="label shrink-0 font-bold text-ink-muted">Measured</span>
              <span
                className="shrink-0 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-wider"
                style={{ color: state.color }}
              >
                {state.measuredText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Modal Portal */}
      {modalContent && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
