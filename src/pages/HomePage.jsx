import { useState, useMemo } from "react";
import Header from "../components/Header";
import FeaturedHero from "../components/FeaturedHero";
import StationQuickCard from "../components/StationQuickCard";
import StationRail from "../components/StationRail";

import StationCard from "../components/StationCard";
import ErrorBanner from "../components/ErrorBanner";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";
import { Radio, Heart } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { stations, loading, error, reload } = useStations();
  const { current, isFavorite } = usePlayer();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAllQuick, setShowAllQuick] = useState(false);

  const greeting = useMemo(() => getGreeting(), []);



  // Favorite stations list
  const favoriteStations = useMemo(() => {
    return stations.filter((s) => isFavorite(s));
  }, [stations, isFavorite]);

  // Curated category lists
  const chillStations = useMemo(() => {
    const chillGenres = ["lofi", "ambient", "jazz", "classical"];
    return stations.filter((s) => chillGenres.includes(s.genre?.toLowerCase()));
  }, [stations]);

  const highEnergyStations = useMemo(() => {
    const energyGenres = ["electronic", "rock", "hiphop", "pop", "metal", "alternative", "dance"];
    return stations.filter((s) => energyGenres.includes(s.genre?.toLowerCase()));
  }, [stations]);

  const talkNewsStations = useMemo(() => {
    const talkGenres = ["news", "talk", "world", "variety", "sports"];
    return stations.filter((s) => talkGenres.includes(s.genre?.toLowerCase()));
  }, [stations]);

  // 6 Top quick tune stations for the Spotify-style top grid
  const quickTuneStations = useMemo(() => {
    if (stations.length <= 6) return stations;
    // Mix popular/distinct genres
    const picked = [];
    const seenGenres = new Set();
    for (const s of stations) {
      const g = s.genre?.toLowerCase();
      if (!seenGenres.has(g)) {
        seenGenres.add(g);
        picked.push(s);
      }
      if (picked.length === 6) break;
    }
    return picked.length >= 4 ? picked : stations.slice(0, 6);
  }, [stations]);

  // Filtered stations when a specific category tab is selected
  const activeFilteredStations = useMemo(() => {
    if (selectedCategory === "all") return stations;
    if (selectedCategory === "favorites") return favoriteStations;
    if (selectedCategory === "chill") return chillStations;
    if (selectedCategory === "energy") return highEnergyStations;
    if (selectedCategory === "talk") return talkNewsStations;
    return stations.filter(
      (s) => s.genre?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [selectedCategory, stations, favoriteStations, chillStations, highEnergyStations, talkNewsStations]);

  const categoryChips = [
    { id: "all", label: "All Frequencies" },
    { id: "favorites", label: `Presets (${favoriteStations.length})`, count: favoriteStations.length },
    { id: "chill", label: "Chill & Lo-Fi" },
    { id: "energy", label: "Beats & Energy" },
    { id: "talk", label: "News & Talk" },
  ];

  return (
    <div className="min-h-screen bg-cream font-jetbrains text-ink">
      <Header />

      <main
        className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-10 md:py-8 ${
          current ? "pb-[15rem] md:pb-36" : "pb-[10rem] md:pb-20"
        }`}
      >
        {/* Welcome & Time-of-day Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-status-green animate-pulse" />
              <p className="label font-bold uppercase tracking-wider text-ink-muted">
                {greeting}, listener
              </p>
            </div>
            <h1 className="font-fredoka text-4xl font-bold uppercase leading-tight tracking-tight text-ink sm:text-6xl md:text-7xl">
              Airwaves
            </h1>
          </div>

          {/* Quick Stat Counter Badge */}
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-ink-muted">
            <span className="rounded-pill border-2 border-ink bg-panel px-3 py-1 shadow-hard-sm text-ink">
              {loading ? "Scanning…" : `${stations.length} Frequencies`}
            </span>

          </div>
        </div>

        {/* Error notification banner if any */}
        {error && stations.length === 0 && (
          <ErrorBanner message={error} onRetry={reload} />
        )}

        {/* Category Pill Filter Bar (Spotify-Style Chips) */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryChips.map((chip) => {
            const active = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedCategory(chip.id)}
                className={`whitespace-nowrap rounded-pill border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-tactile ease-spring ${
                  active
                    ? "bg-ink text-cream shadow-hard-sm -translate-y-0.5"
                    : "bg-panel text-ink hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Loading State Skeletons */}
        {loading && (
          <div className="mt-8 space-y-8 animate-pulse">
            <div className="h-64 rounded-panel border-3 border-ink bg-panel/60 shadow-hard" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-chunky border-2 border-ink bg-panel/60" />
              ))}
            </div>
          </div>
        )}

        {/* View Mode 1: ALL FREQUENCIES (Rich Spotify / BBC Sounds layout) */}
        {!loading && selectedCategory === "all" && (
          <div className="mt-6 space-y-10 sm:space-y-14">
            {/* 1. Hero Spotlight Broadcast */}
            {stations.length > 0 && <FeaturedHero stations={stations} />}

            {/* 2. Spotify-Style Quick Tune 6-Card Grid ("Jump Back In") */}
            {quickTuneStations.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-ink" strokeWidth={2.5} />
                    <h2 className="font-fredoka text-xl font-bold uppercase tracking-tight text-ink sm:text-2xl">
                      Quick Tune
                    </h2>
                  </div>
                  {quickTuneStations.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllQuick((prev) => !prev)}
                      className="rounded-pill border-2 border-ink bg-panel px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-ink shadow-hard-sm active:translate-y-0.5"
                    >
                      {showAllQuick ? "See less" : "See more"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {(showAllQuick ? quickTuneStations : quickTuneStations.slice(0, 3)).map((station) => (
                    <StationQuickCard
                      key={station._id || station.streamUrl}
                      station={station}
                      playlist={stations}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 3. Horizontal Sound Rail 1: Trending Airwaves */}
            <StationRail
              title="Hot On The Airwaves"
              subtitle="Curated live terrestrial broadcasts across the dial"
              stations={stations.slice(0, 10)}
              allStations={stations}
            />

            {/* 4. Horizontal Sound Rail 2: Chill & Focus */}
            {chillStations.length > 0 && (
              <StationRail
                title="Downtempo & Focus"
                subtitle="Low-key frequencies for coding, reading, and deep work"
                stations={chillStations}
                allStations={stations}
              />
            )}

            {/* 5. Horizontal Sound Rail 3: High Energy Beats */}
            {highEnergyStations.length > 0 && (
              <StationRail
                title="High-Energy Transmissions"
                subtitle="Electronic pulses, heavy guitars, and rhythmic heat"
                stations={highEnergyStations}
                allStations={stations}
              />
            )}

            {/* 6. User Presets Rail (if any saved) */}
            {favoriteStations.length > 0 && (
              <StationRail
                title="Your Presets"
                subtitle="Fast dial to your bookmarked broadcasts — press 1–6 to tune"
                stations={favoriteStations}
                allStations={favoriteStations}
                showPresetKeys
              />
            )}


          </div>
        )}

        {/* View Mode 2: FILTERED CATEGORY VIEW */}
        {!loading && selectedCategory !== "all" && (
          <div className="mt-8">
            <div className="mb-6">
              <h2 className="font-fredoka text-3xl font-bold uppercase text-ink sm:text-4xl">
                {categoryChips.find((c) => c.id === selectedCategory)?.label || selectedCategory}
              </h2>
              <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-ink-muted">
                {activeFilteredStations.length} {activeFilteredStations.length === 1 ? "station" : "stations"} found
              </p>
            </div>

            {activeFilteredStations.length === 0 ? (
              <div className="mx-auto mt-8 max-w-md rounded-panel border-3 border-ink bg-panel p-8 text-center shadow-hard sm:p-12">
                <Heart className="mx-auto h-12 w-12 text-ink-muted" strokeWidth={2} />
                <h3 className="mt-3 font-fredoka text-2xl font-bold uppercase text-ink">
                  No stations in this category
                </h3>
                <p className="mt-2 font-mono text-xs font-medium text-ink-muted">
                  {selectedCategory === "favorites"
                    ? "Tap the heart on any station to pin it to your quick-dial favorites."
                    : "Try exploring another frequency band or browse all stations."}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="mt-6 rounded-pill border-3 border-ink bg-panel px-6 py-2.5 font-fredoka text-sm font-bold uppercase tracking-wider text-ink shadow-hard transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard-lg"
                >
                  View All Frequencies
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                {activeFilteredStations.map((s, i) => (
                  <StationCard
                    key={s._id || i}
                    number={String(i + 1).padStart(3, "0")}
                    station={s}
                    playlist={activeFilteredStations}
                    genre={s.genre}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}