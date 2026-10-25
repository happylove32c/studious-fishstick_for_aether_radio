import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronDown,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Radio,
  CassetteTape,
  Calendar,
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

function formatTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m < 60) {
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
        {/* Cassette Shell Enclosure */}
        <div className="relative overflow-hidden rounded-panel border-3 border-ink bg-panel p-5 shadow-hard-lg sm:p-7">
          {/* Subtle Accent Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-10 h-56 w-56 rounded-full opacity-25 blur-3xl transition-colors duration-700"
            style={{ backgroundColor: accent }}
          />

          {/* Cassette Screws in the four corners */}
          <div className="absolute top-2.5 left-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
            +
          </div>
          <div className="absolute top-2.5 right-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
            +
          </div>
          <div className="absolute bottom-2.5 left-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
            +
          </div>
          <div className="absolute bottom-2.5 right-2.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-ink bg-cream font-mono text-[9px] font-black text-ink-muted">
            +
          </div>

          {/* Tape Label Header Bar */}
          <div
            style={{ backgroundColor: accent }}
            className="relative rounded-t-chunky border-2 border-ink px-4 py-2.5 shadow-hard-sm"
          >
            <div className="flex items-center justify-between text-ink font-mono text-[10px] font-black uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ink" />
                SIDE A • HI-FI STEREO
              </span>
              <span>AETHER TAPE LABS</span>
            </div>
            {/* Retro Tape Lines */}
            <div className="mt-1.5 flex h-1 w-full gap-1">
              <div className="h-full flex-1 rounded-full bg-ink/20" />
              <div className="h-full flex-1 rounded-full bg-ink/30" />
              <div className="h-full flex-1 rounded-full bg-ink/40" />
            </div>
          </div>

          {/* Cassette Tape Window Deck */}
          <div className="relative border-x-2 border-b-2 border-ink bg-cream p-4 sm:p-6 shadow-inner">
            {/* Cassette Center Recessed Window */}
            <div className="relative mx-auto flex h-36 sm:h-44 w-full max-w-lg items-center justify-between overflow-hidden rounded-xl border-3 border-ink bg-ink/90 px-6 sm:px-12 shadow-hard-inner">
              {/* Center Tape Counter Window Grid */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-70">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-cream">
                  <span>100</span>
                  <span>50</span>
                  <span className="text-[#FFD166]">0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
                <div className="mt-1 h-3 w-16 border-t border-b border-cream/30 flex items-center justify-center">
                  <div className="h-1 w-1 rounded-full bg-[#FF6B6B]" />
                </div>
              </div>

              {/* Connecting Magnetic Tape Ribbon (between spools) */}
              <div className="pointer-events-none absolute bottom-5 left-14 right-14 h-2.5 bg-[#2B231D] border-t border-b border-[#40352C] opacity-80" />

              {/* Left Spool Reel (Supply Spool) */}
              <div className="relative flex items-center justify-center">
                {/* Wound Tape Outer Coil */}
                <div
                  className="absolute rounded-full bg-[#3B2F2F] border-2 border-[#1E1717] transition-all duration-300"
                  style={{
                    width: `${Math.max(68, 92 - (pct / 100) * 24)}px`,
                    height: `${Math.max(68, 92 - (pct / 100) * 24)}px`,
                  }}
                />

                {/* Spinning Spool Hub */}
                <div
                  style={isPlaying ? spinStyle : {}}
                  className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-ink bg-cream shadow-hard-xs ${
                    isPlaying ? "animate-spin" : ""
                  }`}
                >
                  {/* Spool Teeth / Cogs */}
                  <div className="absolute h-full w-2 bg-ink/20 rounded" />
                  <div className="absolute h-full w-2 rotate-60 bg-ink/20 rounded" />
                  <div className="absolute h-full w-2 -rotate-60 bg-ink/20 rounded" />
                  {/* Center Spindle Hole */}
                  <div className="h-6 w-6 rounded-full border-2 border-ink bg-ink" />
                </div>
              </div>

              {/* Right Spool Reel (Take-Up Spool) */}
              <div className="relative flex items-center justify-center">
                {/* Wound Tape Outer Coil */}
                <div
                  className="absolute rounded-full bg-[#3B2F2F] border-2 border-[#1E1717] transition-all duration-300"
                  style={{
                    width: `${Math.max(68, 68 + (pct / 100) * 24)}px`,
                    height: `${Math.max(68, 68 + (pct / 100) * 24)}px`,
                  }}
                />

                {/* Spinning Spool Hub */}
                <div
                  style={isPlaying ? spinStyle : {}}
                  className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-ink bg-cream shadow-hard-xs ${
                    isPlaying ? "animate-spin" : ""
                  }`}
                >
                  {/* Spool Teeth / Cogs */}
                  <div className="absolute h-full w-2 bg-ink/20 rounded" />
                  <div className="absolute h-full w-2 rotate-60 bg-ink/20 rounded" />
                  <div className="absolute h-full w-2 -rotate-60 bg-ink/20 rounded" />
                  {/* Center Spindle Hole */}
                  <div className="h-6 w-6 rounded-full border-2 border-ink bg-ink" />
                </div>
              </div>
            </div>

            {/* Bottom Tape Guide Roller Holes */}
            <div className="mt-3 flex items-center justify-around px-8">
              <div className="h-3 w-3 rounded-full border-2 border-ink bg-panel" />
              <div className="h-2 w-12 rounded-full border border-ink bg-panel-inset" />
              <div className="h-3 w-3 rounded-full border-2 border-ink bg-panel" />
            </div>
          </div>

          {/* Tape Details Label Footer */}
          <div className="mt-3 flex items-center justify-between font-mono text-[11px] font-bold text-ink-muted">
            <span className="flex items-center gap-1 text-ink">
              <Radio className="h-3.5 w-3.5" strokeWidth={2.5} />
              {activeRec?.stationName || "Live Radio Capture"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2.5} />
              {formattedDate}
            </span>
          </div>
        </div>

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
          <div className="relative flex flex-col gap-2">
            {/* Custom Range Slider Track */}
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max={duration > 0 ? duration : 1}
                step="0.1"
                value={position}
                onChange={handleSeekChange}
                aria-label="Recording seek position"
                className="w-full h-3 cursor-pointer appearance-none rounded-pill border-2 border-ink outline-none transition-all"
                style={{
                  background: `linear-gradient(to right, ${accent} ${pct}%, #E7E2D6 ${pct}%)`,
                }}
              />
            </div>

            {/* Time Indicators (mm:ss) */}
            <div className="flex items-center justify-between font-mono text-xs sm:text-sm font-black text-ink">
              <span className="rounded-pill border border-ink bg-cream px-2 py-0.5 shadow-hard-xs">
                {formatTime(position)}
              </span>
              <span className="rounded-pill border border-ink bg-cream px-2 py-0.5 shadow-hard-xs text-ink-muted">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* 5. Master Transport Controls (Back 15s, Play/Pause, Forward 15s, Speed Pill) */}
          <div className="mt-5 flex items-center justify-between sm:justify-center sm:gap-8 pt-2">
            {/* Rewind 15s */}
            <button
              type="button"
              onClick={() => skip(-15)}
              aria-label="Rewind 15 seconds"
              title="Rewind 15s"
              className="flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
            >
              <RotateCcw className="h-5 w-5" strokeWidth={2.5} />
              <span className="font-mono text-[9px] font-black leading-none mt-0.5">
                -15s
              </span>
            </button>

            {/* Main Play / Pause Button */}
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? "Pause Recording" : "Play Recording"}
              style={{ backgroundColor: accent, color: ink }}
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-pill border-3 border-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 fill-current" strokeWidth={2.5} />
              ) : (
                <Play className="h-8 w-8 ml-1 fill-current" strokeWidth={2.5} />
              )}
            </button>

            {/* Fast Forward 15s */}
            <button
              type="button"
              onClick={() => skip(15)}
              aria-label="Fast forward 15 seconds"
              title="Forward 15s"
              className="flex h-12 w-12 sm:h-14 sm:w-14 flex-col items-center justify-center rounded-pill border-2 border-ink bg-cream text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
            >
              <RotateCw className="h-5 w-5" strokeWidth={2.5} />
              <span className="font-mono text-[9px] font-black leading-none mt-0.5">
                +15s
              </span>
            </button>

            {/* Speed Pill (1x | 1.25x | 1.5x | 2x) */}
            <button
              type="button"
              onClick={handleCycleSpeed}
              aria-label={`Playback speed: ${rate}x. Tap to change.`}
              title="Cycle playback speed"
              className="flex h-11 px-3.5 sm:px-4 items-center justify-center rounded-pill border-2 border-ink bg-[#FFD166] text-ink shadow-hard-sm font-mono text-xs sm:text-sm font-black transition-transform duration-tactile ease-spring hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink"
            >
              <span>{rate}x</span>
            </button>
          </div>
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
