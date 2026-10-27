import { Circle } from "lucide-react";

export default function RecordingButton({
  recording,
  canRecord,
  live,
  recordStream,
  recordElapsed,
  startRecording,
  stopRecording,
}) {
  const formattedElapsed = `${String(Math.floor((recordElapsed || 0) / 60)).padStart(
    2,
    "0"
  )}:${String((recordElapsed || 0) % 60).padStart(2, "0")}`;

  return (
    <div className="mt-3.5">
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        disabled={!canRecord && !recording}
        title={
          recording
            ? "Stop recording"
            : !live
            ? "Transmit live broadcast to record"
            : !recordStream
            ? "Stream lacks CORS headers, cannot record"
            : "Record station broadcast"
        }
        className={`flex h-12 w-full items-center justify-between rounded-pill border-2 border-ink px-4 font-mono text-xs font-bold uppercase tracking-wider shadow-hard-sm transition-all duration-tactile ease-spring ${
          recording
            ? "bg-[#FF4D4D] text-cream -translate-y-0.5 shadow-hard animate-pulse"
            : !canRecord
            ? "bg-panel-inset text-ink/40 cursor-not-allowed opacity-60"
            : "bg-cream text-ink hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Circle
            className={`h-4 w-4 ${
              recording
                ? "fill-cream text-cream animate-ping"
                : canRecord
                ? "fill-[#FF4D4D] text-[#FF4D4D]"
                : "text-ink/40"
            }`}
            strokeWidth={2.5}
          />
          <span>{recording ? "Recording Broadcast" : "Record Station"}</span>
        </div>

        {recording ? (
          <span className="font-mono text-xs font-black tracking-widest bg-ink/30 px-2.5 py-0.5 rounded-pill text-cream">
            {formattedElapsed}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-ink-muted">
            {!live ? "OFFLINE" : !recordStream ? "NO CORS" : "READY"}
          </span>
        )}
      </button>

      {/* Short hint when disabled */}
      {!recording && (!live || !recordStream) && (
        <p className="mt-1 px-1 font-mono text-[10px] text-ink-muted">
          {!live
            ? "* Start live transmission to enable recording."
            : "* Station lacks CORS audio headers and cannot be recorded."}
        </p>
      )}
    </div>
  );
}
