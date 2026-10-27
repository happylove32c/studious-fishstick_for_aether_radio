import { useState, useEffect } from "react";
import {
  CassetteTape,
  HardDrive,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BackLink from "../components/BackLink";
import RecordingRow from "../components/RecordingRow";
import { usePlayer } from "../context/usePlayer";
import { useRecordingPlayer } from "../context/useRecordingPlayer";
import {
  listRecordings,
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

export default function RecordingsPage() {
  const { current } = usePlayer();
  const { currentRec, play: playRecording, stop: stopRecording } = useRecordingPlayer();
  const navigate = useNavigate();

  const [recordings, setRecordings] = useState(listRecordings);
  const [storageInfo, setStorageInfo] = useState({ freeBytes: null });

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

  const handleDelete = async (id) => {
    if (currentRec?.id === id) {
      stopRecording();
    }
    await deleteRecording(id);
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
            {recordings.map((rec) => (
              <RecordingRow
                key={rec.id}
                rec={rec}
                isCurrentlyPlaying={currentRec?.id === rec.id}
                onOpen={handleOpenRecording}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
