import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Wifi, WifiOff, X } from "lucide-react";
import { useSpeedTest } from "../hooks/useSpeedTest";

const STATUS_GREEN = "#00ff41";
const STATUS_YELLOW = "#facc15";
const STATUS_RED = "#ef4444";
const STATUS_GRAY = "#666666";

function getSpeedColor(mbps) {
  if (mbps === null || mbps === undefined) return STATUS_GRAY;
  if (mbps >= 20) return STATUS_GREEN;
  if (mbps >= 5) return STATUS_YELLOW;
  return STATUS_RED;
}

function getNetworkInfo() {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const connection =
    typeof navigator !== "undefined"
      ? navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection
      : null;

  if (!isOnline) {
    return {
      level: 1,
      color: STATUS_GRAY,
      speedText: "Offline",
      subText: "No Connection",
      downlink: 0,
      effectiveType: "offline",
      online: false,
    };
  }

  if (!connection || connection.downlink === undefined) {
    return {
      level: 4,
      color: STATUS_GREEN,
      speedText: "Online",
      subText: "Active Network",
      downlink: null,
      effectiveType: null,
      online: true,
    };
  }

  const downlink = connection.downlink;
  const effectiveType = connection.effectiveType
    ? connection.effectiveType.toUpperCase()
    : "NETWORK";

  let level;
  let color;

  if (downlink >= 20) {
    level = 4;
    color = STATUS_GREEN;
  } else if (downlink >= 5) {
    level = 3;
    color = STATUS_YELLOW;
  } else {
    level = 2;
    color = STATUS_RED;
  }

  return {
    level,
    color,
    speedText: `${downlink.toFixed(1)} Mbps`,
    subText: effectiveType,
    downlink,
    effectiveType,
    online: true,
  };
}

export default function NetworkIndicator() {
  const [network, setNetwork] = useState(getNetworkInfo);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [showModal, setShowModal] = useState(false);

  const {
    run: runSpeedTest,
    result: testResult,
    status: testStatus,
    error: testError,
    abort: abortSpeedTest,
  } = useSpeedTest();

  const updateNetwork = useCallback(() => {
    setNetwork(getNetworkInfo());
    const timestamp = Date.now();
    setLastUpdated(timestamp);
    setNow(timestamp);
  }, []);

  // 2-second passive timer
  useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      if (!intervalId) {
        updateNetwork();
        intervalId = setInterval(() => {
          setNetwork(getNetworkInfo());
          setNow(Date.now());
        }, 2000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
        abortSpeedTest();
      } else {
        startPolling();
      }
    };

    if (document.visibilityState !== "hidden") {
      startPolling();
    }

    const connection =
      typeof navigator !== "undefined"
        ? navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection
        : null;

    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (connection && typeof connection.addEventListener === "function") {
      connection.addEventListener("change", updateNetwork);
    }

    return () => {
      stopPolling();
      abortSpeedTest();
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (connection && typeof connection.removeEventListener === "function") {
        connection.removeEventListener("change", updateNetwork);
      }
    };
  }, [updateNetwork, abortSpeedTest]);

  const handleOpenModal = () => {
    setShowModal(true);
    runSpeedTest();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    abortSpeedTest();
  };

  const handleMouseEnter = () => {
    runSpeedTest();
  };

  const diffSeconds = Math.max(0, Math.floor((now - lastUpdated) / 1000));
  const timeAgoText =
    diffSeconds === 0 ? "Updated just now" : `Updated ${diffSeconds}s ago`;

  const { level, color, speedText, subText, online } = network;

  // Render measured value
  const renderMeasuredText = () => {
    if (testStatus === "running") {
      return <span className="text-[#facc15] font-bold">Testing…</span>;
    }
    if (testStatus === "done" && testResult) {
      return (
        <span
          className="font-bold"
          style={{ color: getSpeedColor(testResult.mbps) }}
        >
          {testResult.mbps.toFixed(1)} Mbps
        </span>
      );
    }
    if (testStatus === "error") {
      return <span className="text-red-400 font-bold">Test failed</span>;
    }
    return <span className="text-white/40">—</span>;
  };

  const modalContent = showModal ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:hidden"
      onClick={handleCloseModal}
    >
      <div
        className="w-full max-w-xs border border-white/20 bg-[#111] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            {online ? (
              <Wifi className="h-4 w-4" style={{ color }} />
            ) : (
              <WifiOff className="h-4 w-4" style={{ color }} />
            )}
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              Network Link
            </span>
          </div>
          <button
            onClick={handleCloseModal}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 py-2 text-center">
          <div className="flex justify-center items-end gap-1 h-6">
            <span
              className="w-1.5 h-2"
              style={{
                backgroundColor:
                  level >= 1 ? color : "rgba(255,255,255,0.15)",
              }}
            />
            <span
              className="w-1.5 h-3"
              style={{
                backgroundColor:
                  level >= 2 ? color : "rgba(255,255,255,0.15)",
              }}
            />
            <span
              className="w-1.5 h-[18px]"
              style={{
                backgroundColor:
                  level >= 3 ? color : "rgba(255,255,255,0.15)",
              }}
            />
            <span
              className="w-1.5 h-6"
              style={{
                backgroundColor:
                  level >= 4 ? color : "rgba(255,255,255,0.15)",
              }}
            />
          </div>

          <div className="space-y-2 py-1 text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                Reported:
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ color }}
              >
                {speedText} · {subText}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                Measured:
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em]">
                {renderMeasuredText()}
              </span>
            </div>
          </div>

          {testStatus === "error" && testError && (
            <p className="text-[8px] uppercase tracking-[0.15em] text-red-400">
              {testError}
            </p>
          )}

          <div className="border-t border-white/10 pt-2">
            <p className="text-[8px] uppercase tracking-[0.2em] text-white/40">
              {timeAgoText}
            </p>
          </div>
        </div>

        <button
          onClick={handleCloseModal}
          className="mt-4 w-full border border-white/20 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Indicator button with tooltip on desktop */}
      <div
        className="relative group flex items-center"
        onMouseEnter={handleMouseEnter}
      >
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 border border-white/15 bg-white/[0.04] px-2 py-1 transition-colors hover:border-white/40 hover:bg-white/[0.08]"
          title={`${speedText} · ${subText}`}
          aria-label="Network status"
        >
          {online ? (
            <Wifi className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          ) : (
            <WifiOff className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          )}

          {/* 4-bar visual signal stack */}
          <div className="flex items-end gap-[2px] h-3.5 pb-0.5">
            <span
              className="w-[2px] h-1.5 transition-colors"
              style={{
                backgroundColor: level >= 1 ? color : "rgba(255,255,255,0.15)",
              }}
            />
            <span
              className="w-[2px] h-2 transition-colors"
              style={{
                backgroundColor: level >= 2 ? color : "rgba(255,255,255,0.15)",
              }}
            />
            <span
              className="w-[2px] h-2.5 transition-colors"
              style={{
                backgroundColor: level >= 3 ? color : "rgba(255,255,255,0.15)",
              }}
            />
            <span
              className="w-[2px] h-3.5 transition-colors"
              style={{
                backgroundColor: level >= 4 ? color : "rgba(255,255,255,0.15)",
              }}
            />
          </div>
        </button>

        {/* Desktop Tooltip (sm and up) */}
        <div className="pointer-events-none absolute right-0 top-full mt-2 hidden z-50 min-w-[190px] border border-white/20 bg-[#111] p-3 shadow-xl sm:group-hover:block">
          <div className="space-y-1.5 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] uppercase tracking-[0.2em] text-white/40">
                Reported
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ color }}
              >
                {speedText} · {subText}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[8px] uppercase tracking-[0.2em] text-white/40">
                Measured
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em]">
                {renderMeasuredText()}
              </span>
            </div>
          </div>

          <p className="mt-1.5 text-[8px] uppercase tracking-[0.2em] text-white/30 text-right">
            {timeAgoText}
          </p>
        </div>
      </div>

      {/* Mobile Modal (rendered in document.body via Portal) */}
      {modalContent && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
