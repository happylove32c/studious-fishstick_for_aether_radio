import { useState } from "react";
import {
  Play,
  Edit2,
  Check,
  X,
  Radio,
  Download,
  Trash2,
} from "lucide-react";
import {
  renameRecording,
  getRecordingBlob,
} from "../utils/recordingsStore";

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec) {
  if (!sec || sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m < 60) {
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RecordingRow({
  rec,
  isCurrentlyPlaying = false,
  onOpen,
  onDelete,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleStartRename = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditingName(rec.name || "");
  };

  const handleSaveRename = (e) => {
    e.stopPropagation();
    const trimmed = editingName.trim();
    if (trimmed) {
      renameRecording(rec.id, trimmed);
    }
    setIsEditing(false);
    setEditingName("");
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditingName("");
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      setIsDownloading(true);
      const blob = await getRecordingBlob(rec.id);
      if (!blob) {
        alert("Audio file could not be retrieved for download.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const ext = rec.mime?.includes("mp4") ? "mp4" : "webm";
      const cleanName = (rec.name || "recording")
        .replace(/[/\\?%*:|"<>]/g, "_")
        .trim();

      const a = document.createElement("a");
      a.href = url;
      a.download = `${cleanName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 5000);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(rec.id);
    }
    setIsConfirming(false);
  };

  const handleRowClick = () => {
    if (onOpen) {
      onOpen(rec.id);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRowClick();
        }
      }}
      className={`group relative flex flex-col justify-between gap-4 rounded-panel border-3 border-ink bg-panel p-4 shadow-hard transition-transform duration-tactile cursor-pointer hover:-translate-y-0.5 hover:shadow-hard-lg sm:flex-row sm:items-center sm:p-5 ${
        isCurrentlyPlaying ? "ring-2 ring-ink bg-panel" : ""
      }`}
    >
      {/* Left: Play button / icon + Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Play trigger button */}
        <div
          aria-label="Play recording in cassette deck"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-pill border-2 border-ink shadow-hard-sm transition-transform duration-tactile group-hover:scale-105 ${
            isCurrentlyPlaying
              ? "bg-ink text-cream"
              : "bg-[#FFD166] text-ink"
          }`}
        >
          <Play className="h-5 w-5 ml-0.5 fill-current" strokeWidth={2.5} />
        </div>

        {/* Metadata & Title */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename(e);
                  if (e.key === "Escape") handleCancelRename(e);
                }}
                autoFocus
                className="w-full rounded-pill border-2 border-ink bg-cream px-3 py-1 font-fredoka text-base font-bold text-ink outline-none focus:ring-2 focus:ring-ink"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                aria-label="Save name"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-[#4ECDC4] text-ink shadow-hard-xs active:scale-95"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={handleCancelRename}
                aria-label="Cancel editing"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-cream text-ink shadow-hard-xs active:scale-95"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="truncate font-fredoka text-base font-bold text-ink sm:text-lg group-hover:text-ink">
                {rec.name || "Untitled Broadcast"}
              </h3>
              <button
                type="button"
                onClick={handleStartRename}
                aria-label="Rename recording"
                className="opacity-60 transition-opacity hover:opacity-100 p-1"
              >
                <Edit2 className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Detail row */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] font-bold text-ink-muted">
            <span className="inline-flex items-center gap-1 text-ink">
              <Radio className="h-3 w-3" strokeWidth={2.5} />
              {rec.stationName || "Live Radio"}
            </span>
            <span>•</span>
            <span>
              {new Date(rec.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>•</span>
            <span>{formatDuration(rec.durationSec)}</span>
            <span>•</span>
            <span>{formatBytes(rec.sizeBytes)}</span>
          </div>
        </div>
      </div>

      {/* Right Actions: Download & Delete */}
      <div
        className="flex items-center gap-2 self-end sm:self-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Download button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          title="Download audio file"
          aria-label="Download audio file"
          className="flex h-9 w-9 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 disabled:opacity-50"
        >
          <Download className="h-4 w-4" strokeWidth={2.5} />
        </button>

        {/* Delete button or confirm pill */}
        {isConfirming ? (
          <div className="flex items-center gap-1.5 rounded-pill border-2 border-ink bg-[#FF6B6B] p-1 font-mono text-xs font-black text-ink shadow-hard-sm animate-scale-in">
            <span className="px-1 text-[10px] uppercase">
              Delete?
            </span>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full border border-ink bg-cream px-2 py-0.5 text-[10px] uppercase shadow-hard-xs active:scale-95"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsConfirming(false);
              }}
              className="rounded-full border border-ink bg-panel px-2 py-0.5 text-[10px] uppercase shadow-hard-xs active:scale-95"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsConfirming(true);
            }}
            title="Delete recording"
            aria-label="Delete recording"
            className="flex h-9 w-9 items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile hover:-translate-y-0.5 hover:bg-[#FF6B6B] hover:shadow-hard active:translate-y-0"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}
