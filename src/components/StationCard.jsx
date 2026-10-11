import { ArrowRight, AudioLines, Heart, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";
import { getGenreColor, readableOn } from "../utils/genreColors";

export default function StationCard({ number, station, playlist, genre }) {
  const { play, isCurrent, status, isPlaying, isFavorite, toggleFavorite } =
    usePlayer();
  const navigate = useNavigate();

  const name = station.name ?? station.title ?? "Untitled";
  const streamUrl = station.streamUrl ?? station.url ?? station.stream;

  const resolved = { ...station, name, genre, streamUrl };
  const isCurrentStation = isCurrent(resolved);
  const live = isCurrentStation && isPlaying && status === "connected";
  const fav = isFavorite(resolved);

  const color = getGenreColor(genre);
  const ink = readableOn(color);

  const handleClick = () => {
    const resolvedList = (playlist || []).map((s) => ({
      ...s,
      name: s.name ?? s.title ?? "Untitled",
      genre: s.genre?.trim() || genre || "Unknown",
      streamUrl: s.streamUrl ?? s.url ?? s.stream,
    }));

    if (isCurrentStation && status !== "error") {
      navigate("/now-playing");
    } else {
      play(resolved, resolvedList);
      navigate("/now-playing");
    }
  };

  const handleFav = (e) => {
    e.stopPropagation();
    toggleFavorite(resolved);
  };

  // --g: genre colour, --gb: same colour at 60% for the resting border,
  // --gt: text colour that stays readable on the filled (hover) background.
  return (
    // `group` lives on the WRAPPER. Hovering the heart (a child of the
    // wrapper) therefore keeps the group "hovered", so the card body stays
    // filled while your pointer is on the heart.
    <div
      style={{ "--g": color, "--gb": `${color}99`, "--gt": ink }}
      className="group relative aspect-square w-full"
    >
      <button
        onClick={handleClick}
        className={`flex h-full w-full flex-col justify-between overflow-hidden border border-[color:var(--gb)] p-3 text-left text-white transition-colors duration-300 group-hover:border-[color:var(--g)] group-hover:bg-[color:var(--g)] group-hover:text-[color:var(--gt)] sm:p-5 md:p-6 ${
          live
            ? "bg-white/[0.08] shadow-[inset_0_0_0_1px_var(--g)]"
            : isCurrentStation
            ? "bg-white/[0.07]"
            : "bg-white/[0.03]"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.25em] opacity-60 sm:tracking-[0.3em]">
              {number}
            </span>
            {live && (
              <AudioLines className="h-3.5 w-3.5 animate-pulse sm:h-4 sm:w-4" />
            )}
          </div>
          {/* Space reserved for the absolutely-positioned heart sibling. */}
          <span className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
        </div>

        <div className="my-auto py-1">
          <p className="mb-1 text-[9px] uppercase tracking-[0.3em] opacity-60 sm:mb-2 sm:text-[10px] sm:tracking-[0.35em]">
            Station
          </p>
          <h2 className="line-clamp-2 break-words text-base font-black uppercase leading-tight tracking-[-0.03em] sm:text-2xl sm:leading-7 md:text-3xl md:leading-8">
            {name}
          </h2>
          <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.25em] opacity-80 sm:mt-2 sm:text-[10px] sm:tracking-[0.3em]">
            {genre || "Unknown"}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3.5">
          <div className="h-px bg-current opacity-20" />

          <div className="flex items-center justify-between">
            <span
              className={`text-[9px] uppercase tracking-[0.2em] sm:text-[10px] sm:tracking-[0.25em] ${
                live ? "font-bold" : "opacity-60"
              }`}
            >
              {live ? "Playing" : "Listen"}
            </span>

            {live ? (
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
            ) : (
              <Play className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
            )}
          </div>
        </div>
      </button>

      {/*
        Heart — sibling of the card body, but INSIDE the group wrapper, so
        hovering it keeps the card filled. It has no group-hover classes of
        its own, so its appearance doesn't change with the card.
      */}
      <button
        onClick={handleFav}
        aria-pressed={fav}
        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
        title={fav ? "Remove from favorites" : "Add to favorites"}
        className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center transition-colors sm:right-3 sm:top-3 sm:h-8 sm:w-8 ${
          fav
            ? "text-white hover:text-white"
            : "text-white/60 hover:text-white"
        }`}
      >
        <Heart
          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${fav ? "fill-current" : ""}`}
        />
      </button>
    </div>
  );
}