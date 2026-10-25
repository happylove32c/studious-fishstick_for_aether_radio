import { useState, useEffect } from "react";
import {
  CassetteTape,
  Check,
  Download,
  Edit2,
  HardDrive,
  Play,
  Radio,
  Trash2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import { usePlayer } from "../context/usePlayer";
import { useRecordingPlayer } from "../context/useRecordingPlayer";
import {
  listRecordings,
  getRecordingBlob,
  renameRecording,
  deleteRecording,
  subscribe,
  checkStorageSpace,
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

export default function RecordingsPage() {
  const { current } = usePlayer();
  const { currentRec, play: playRecording, stop: stopRecording } = useRecordingPlayer();
  const navigate = useNavigate();

  const [recordings, setRecordings] = useState(listRecordings);
  const [storageInfo, setStorageInfo] = useState({ freeBytes: null });
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  // Subscribe to live updates in store
  useEffect(() => {
    return subscribe((updated) => {
      setRecordings(updated);
    });
  }, []);

  // Check storage info
  useEffect(() => {
    checkStorageSpace().then((info) => {
      if (info) setStorageInfo(info);
    });
  }, [recordings]);

  const totalBytes = recordings.reduce(
    (sum, r) => sum + (Number(r.sizeBytes) || 0),
    0
  );

  // Tapping a row opens /recordings/:id and starts playback
  const handleOpenRecording = (id) => {
    playRecording(id);
    navigate(`/recordings/${id}`);
  };

  const handleStartRename = (e, rec) => {
    e.stopPropagation();
    setEditingId(rec.id);
    setEditingName(rec.name || "");
  };

  const handleSaveRename = (e, id) => {
    e.stopPropagation();
    const trimmed = editingName.trim();
    if (trimmed) {
      renameRecording(id, trimmed);
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingName("");
  };

  const handleDownload = async (e, rec) => {
    e.stopPropagation();
    try {
      setDownloadingId(rec.id);
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
      setDownloadingId(null);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (currentRec?.id === id) {
      stopRecording();
    }
    await deleteRecording(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-cream font-jetbrains text-ink">
      <Header />

      <main
        className={`px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-6 sm:py-8 md:px-10 md:py-12 ${
          current ? "pb-[15rem] md:pb-36" : "pb-[10rem] md:pb-16"
        }`}
      >
        <BackLink className="mb-6" />

        {/* Header telemetry and title */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label font-bold uppercase text-ink-muted">
              Archived Broadcasts
            </p>
            <h1 className="font-fredoka text-5xl font-bold uppercase leading-none tracking-tight text-ink sm:text-7xl md:text-8xl">
              Recordings
            </h1>
          </div>

          {/* Storage Telemetry Pill */}
          <div className="inline-flex items-center gap-2 self-start rounded-pill border-2 border-ink bg-panel px-4 py-2 font-mono text-xs font-bold text-ink shadow-hard-sm sm:self-end">
            <HardDrive className="h-4 w-4 text-ink" strokeWidth={2.5} />
            <span>Used: {formatBytes(totalBytes)}</span>
            {storageInfo.freeBytes !== null && (
              <span className="text-ink-muted">
                • {formatBytes(storageInfo.freeBytes)} free
              </span>
            )}
          </div>
        </div>

        <p className="mt-3 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted sm:text-sm">
          {recordings.length}{" "}
          {recordings.length === 1 ? "broadcast saved" : "broadcasts saved"}
        </p>

        {/* Empty State */}
        {recordings.length === 0 && (
          <div className="mx-auto mt-8 max-w-md rounded-panel border-3 border-ink bg-panel p-8 text-center shadow-hard sm:mt-14 sm:p-12">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-panel border-3 border-ink bg-[#FFD166] text-ink shadow-hard">
              <CassetteTape className="h-10 w-10 text-ink" strokeWidth={2.5} />
            </div>
            <h2 className="font-fredoka text-2xl font-bold uppercase text-ink sm:text-3xl">
              No recordings yet
            </h2>
            <p className="mt-2 font-mono text-xs font-medium text-ink-muted sm:text-sm">
              Capture live station audio by tapping the red Record button in the
              Now Playing master control deck.
            </p>
            <Link
              to="/now-playing"
              className="mt-6 inline-flex items-center justify-center rounded-pill border-3 border-ink bg-[#FF6B6B] px-6 py-3 font-fredoka text-sm font-bold uppercase tracking-wider text-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
            >
              Go to Now Playing
            </Link>
          </div>
        )}

        {/* Recordings List */}
        {recordings.length > 0 && (
          <div className="mt-8 space-y-3 sm:mt-12 sm:space-y-4">
            {recordings.map((rec) => {
              const isItemEditing = editingId === rec.id;
              const isConfirming = confirmDeleteId === rec.id;
              const isCurrentlyPlaying = currentRec?.id === rec.id;

              return (
                <div
                  key={rec.id}
                  onClick={() => handleOpenRecording(rec.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpenRecording(rec.id);
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
                      {isItemEditing ? (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(e, rec.id);
                              if (e.key === "Escape") handleCancelRename(e);
                            }}
                            autoFocus
                            className="w-full rounded-pill border-2 border-ink bg-cream px-3 py-1 font-fredoka text-base font-bold text-ink outline-none focus:ring-2 focus:ring-ink"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(e, rec.id)}
                            aria-label="Save name"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-[#4ECDC4] text-ink shadow-hard-xs active:scale-95"
                          >
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCancelRename(e)}
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
                            onClick={(e) => handleStartRename(e, rec)}
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
                      onClick={(e) => handleDownload(e, rec)}
                      disabled={downloadingId === rec.id}
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
                          onClick={(e) => handleDelete(e, rec.id)}
                          className="rounded-full border border-ink bg-cream px-2 py-0.5 text-[10px] uppercase shadow-hard-xs active:scale-95"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
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
                          setConfirmDeleteId(rec.id);
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
            })}
          </div>
        )}
      </main>
    </div>
  );
}
