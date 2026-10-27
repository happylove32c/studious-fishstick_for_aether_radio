import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronDown,
  Trash2,
  CassetteTape,
  AlertCircle,
  X,
} from "lucide-react";
import { useRecordingPlayer } from "../context/useRecordingPlayer";
import { useGoBack } from "../hooks/useGoBack";
import { useSwipeDownDismiss } from "../hooks/useSwipeDownDismiss";
import {
  listRecordings,
  deleteRecording,
  subscribe,
} from "../utils/recordingsStore";
import { getGenreColor, readableOn } from "../utils/genreColors";
import CassetteDeck from "../components/CassetteDeck";
import SeekBar from "../components/SeekBar";
import TransportControls from "../components/TransportControls";

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

export default function RecordingPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack();

  const {
    currentRec,
    isPlaying,
    position,
    duration,
    rate,
    play,
    toggle,
    seek,
    skip,
    setRate,
    stop,
  } = useRecordingPlayer();

  const [allRecordings, setAllRecordings] = useState(listRecordings);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to changes in recordings store
  useEffect(() => {
    return subscribe((list) => {
      setAllRecordings(list);
    });
  }, []);

  const targetRec = useMemo(() => {
    return allRecordings.find((r) => r.id === id) || null;
  }, [allRecordings, id]);

  // If this recording is not currently active, start playing it on entry
  useEffect(() => {
    if (id && (!currentRec || currentRec.id !== id)) {
      play(id);
    }
  }, [id, currentRec, play]);

  const activeRec = currentRec?.id === id ? currentRec : targetRec;

  // Swipe down gesture to minimize
  const { ref: swipeRef, handlers: swipeHandlers } = useSwipeDownDismiss(
    goBack,
    { enabled: !showDeleteModal }
  );

  const accent = getGenreColor(activeRec?.genre || "vintage");
  const ink = readableOn(accent);

  const pct = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, Math.max(0, (position / duration) * 100));
  }, [position, duration]);

  const handleSeekChange = (e) => {
    seek(Number(e.target.value));
  };

  const handleCycleSpeed = () => {
    const nextIdx = (SPEED_OPTIONS.indexOf(rate) + 1) % SPEED_OPTIONS.length;
    setRate(SPEED_OPTIONS[nextIdx]);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (currentRec?.id === id) {
        stop();
      }
      await deleteRecording(id);
      navigate("/recordings", { replace: true });
    } catch (err) {
      console.error("Failed to delete recording:", err);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Tape spool rotation speed according to playback rate
  const spinStyle = {
    animationDuration: `${2 / (rate || 1)}s`,
  };

  if (!targetRec && !currentRec) {
    return (
      <div className="min-h-screen bg-cream font-jetbrains text-ink flex flex-col items-center justify-center p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-panel border-3 border-ink bg-[#FF6B6B] shadow-hard mb-4">
          <AlertCircle className="h-10 w-10 text-cream" strokeWidth={2.5} />
        </div>
        <h1 className="font-fredoka text-3xl font-bold uppercase text-ink">
          Recording Not Found
        </h1>
        <p className="mt-2 font-mono text-sm text-ink-muted max-w-sm">
          This archived recording may have been deleted or does not exist in local storage.
        </p>
        <Link
          to="/recordings"
          className="mt-6 rounded-pill border-3 border-ink bg-[#FFD166] px-6 py-3 font-fredoka text-sm font-bold uppercase tracking-wider text-ink shadow-hard active:translate-x-0.5 active:translate-y-0.5"
        >
          View All Recordings
        </Link>
      </div>
    );
  }

  const formattedDate = activeRec?.createdAt
    ? new Date(activeRec.createdAt).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Archived Broadcast";

  return (
    <div
      ref={swipeRef}
      {...swipeHandlers}
      style={{
        "--g": accent,
        "--gb": `${accent}99`,
        "--gt": ink,
      }}
      className="min-h-screen bg-cream font-jetbrains text-ink pb-12 select-none"
    >
      {/* 1. Tape Deck Top Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-3 border-ink bg-cream/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-6 md:px-10">
        <button
          type="button"
          onClick={goBack}
          aria-label="Minimize Tape Deck"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div className="flex items-center gap-2 rounded-pill border-2 border-ink bg-panel px-3.5 py-1 shadow-hard-xs font-fredoka text-xs sm:text-sm font-bold uppercase tracking-wider text-ink">
          <CassetteTape className="h-4 w-4 text-ink" strokeWidth={2.5} />
          <span>Cassette Playback</span>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          aria-label="Delete Recording"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FF6B6B] hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </header>

      {/* 2. Main Cassette Player Stage */}
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <CassetteDeck
          activeRec={activeRec}
          accent={accent}
          pct={pct}
          isPlaying={isPlaying}
          spinStyle={spinStyle}
          formattedDate={formattedDate}
        />

        {/* 3. Broadcast Title & Metadata Display */}
        <div className="mt-6 text-center">
          <h1 className="font-fredoka text-3xl sm:text-4xl md:text-5xl font-bold uppercase leading-tight tracking-tight text-ink line-clamp-2">
            {activeRec?.name || "Untitled Broadcast"}
          </h1>
          <p className="mt-1 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-ink-muted">
            Captured from {activeRec?.stationName || "Radio Stream"}
          </p>
        </div>

        {/* 4. Real Seek Bar with Ink Border & Genre Fill */}
        <div className="mt-8 rounded-panel border-3 border-ink bg-panel p-4 sm:p-5 shadow-hard">
          <SeekBar
            position={position}
            duration={duration}
            pct={pct}
            accent={accent}
            handleSeekChange={handleSeekChange}
          />

          <TransportControls
            isPlaying={isPlaying}
            toggle={toggle}
            skip={skip}
            rate={rate}
            handleCycleSpeed={handleCycleSpeed}
            accent={accent}
            ink={ink}
          />
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-panel border-3 border-ink bg-panel p-6 shadow-hard-lg animate-scale-in">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <h3 className="font-fredoka text-xl font-bold uppercase text-ink">
                Delete Recording?
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-full border border-ink p-1 hover:bg-cream"
              >
                <X className="h-4 w-4 text-ink" strokeWidth={2.5} />
              </button>
            </div>
            <p className="mt-3 font-mono text-xs font-medium text-ink-muted leading-relaxed">
              Are you sure you want to delete{" "}
              <strong className="text-ink">
                "{activeRec?.name || "this broadcast"}"
              </strong>
              ? This audio file will be permanently removed from storage.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3 font-mono text-xs font-bold uppercase">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-pill border-2 border-ink bg-cream px-4 py-2 text-ink shadow-hard-xs active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-pill border-2 border-ink bg-[#FF6B6B] px-4 py-2 text-cream shadow-hard-xs hover:bg-[#FF4D4D] active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
