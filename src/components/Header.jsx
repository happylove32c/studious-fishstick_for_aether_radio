import { Headphones, Settings, Shuffle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useStations } from "../context/useStations";
import { usePlayer } from "../context/usePlayer";

export default function Header() {
  const { pathname } = useLocation();
  const { stations } = useStations();
  const { isPlaying, status, play } = usePlayer();

  const live = isPlaying && status === "connected";

  const handleRandomTune = () => {
    if (!stations || stations.length === 0) return;
    const rand = stations[Math.floor(Math.random() * stations.length)];
    play(rand, stations);
  };

  const navItem = (to, label, badge) => {
    const active =
      pathname === to || (to === "/" && pathname.startsWith("/genre"));
    return (
      <Link
        to={to}
        className={`inline-flex items-center gap-2 rounded-pill border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-tactile ease-spring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
          active
            ? "bg-ink text-cream shadow-hard-sm -translate-y-0.5"
            : "bg-panel text-ink hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0"
        }`}
      >
        <span>{label}</span>
        {badge !== undefined && (
          <span
            className={`rounded-full px-1.5 py-0.2 font-mono text-[9px] font-black ${
              active ? "bg-cream text-ink" : "bg-panel-inset text-ink"
            }`}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };



  return (
    <header className="sticky top-0 z-40 hidden sm:flex items-center justify-between gap-4 border-b-3 border-ink bg-cream/95 px-6 py-3.5 backdrop-blur-md md:px-10">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          aria-label="Aether FM Home"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring group-hover:-translate-y-0.5 group-hover:shadow-hard group-active:translate-y-0">
            <Headphones className="h-5 w-5 text-ink" strokeWidth={2.5} />
          </div>

          <div className="flex flex-col">
            <span className="font-fredoka text-xl font-bold tracking-wide text-ink transition-colors md:text-2xl">
              AETHER FM
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted">
              Analog & Web Receiver • 88-108 MHz
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Segmented Navigation Pills */}
      <nav aria-label="Main Navigation" className="flex items-center gap-2">
        {navItem("/", "Frequencies", stations.length > 0 ? stations.length : undefined)}
        {navItem("/search", "Search")}
        {navItem("/favorites", "Presets")}
        {navItem("/recordings", "Recordings")}
      </nav>

      {/* Right: Quick Action Controls & Receiver Status */}
      <div className="flex items-center gap-2.5">
        {/* Receiver Signal Telemetry Pill */}
        <div className="hidden lg:flex items-center gap-2 rounded-pill border-2 border-ink bg-panel px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              live ? "bg-status-green animate-pulse" : "bg-status-amber"
            }`}
          />
          <span>{live ? "Live Stream" : `${stations.length} On Air`}</span>
        </div>

        {/* Random Frequency Dial Button */}
        {/* {stations.length > 0 && (
          <button
            type="button"
            onClick={handleRandomTune}
            title="Tune into a random frequency"
            className="flex items-center gap-2 rounded-pill border-2 border-ink bg-cream px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink shadow-hard-sm transition-transform duration-tactile ease-spring hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
          >
            <Shuffle className="h-4 w-4" strokeWidth={2.5} />
            <span>Random Dial</span>
          </button>
        )} */}

        {/* Settings Gear Button */}
        <Link
          to="/settings"
          aria-label="Settings"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink shadow-hard-sm transition-all duration-tactile ease-spring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
            pathname === "/settings"
              ? "bg-ink text-cream -translate-y-0.5 shadow-hard"
              : "bg-panel text-ink hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0"
          }`}
        >
          <Settings className="h-5 w-5" strokeWidth={2.5} />
        </Link>
      </div>
    </header>
  );
}