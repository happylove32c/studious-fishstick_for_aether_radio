import { Headphones, Heart, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
// TODO: re-enable network test
// import NetworkIndicator from "./NetworkIndicator";

export default function Header() {
  const { pathname } = useLocation();

  const navItem = (to, label) => {
    const active =
      pathname === to || (to === "/" && pathname.startsWith("/genre"));
    return (
      <Link
        to={to}
        className={`hidden items-center justify-center rounded-pill border-2 border-ink px-3.5 py-1 text-xs font-bold uppercase tracking-wider transition-transform duration-tactile ease-spring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:inline-flex ${
          active
            ? "bg-ink text-cream shadow-hard-sm"
            : "bg-panel text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5"
        }`}
      >
        <span>{label}</span>
      </Link>
    );
  };

  const favActive = pathname === "/favorites";
  const searchActive = pathname === "/search";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b-3 border-ink bg-cream px-4 py-3 sm:px-6 sm:py-4 md:px-10">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
        {/* Chunky Logo Mark */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          aria-label="Aether FM Home"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border-2 border-ink bg-panel text-ink shadow-hard-sm transition-transform duration-tactile ease-spring group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-hard group-active:translate-x-0.5 group-active:translate-y-0.5 sm:h-11 sm:w-11">
            <Headphones className="h-5 w-5 text-ink sm:h-5.5 sm:w-5.5" strokeWidth={2.5} />
          </div>

          <span className="truncate font-fredoka text-lg font-bold tracking-wide text-ink transition-colors sm:text-xl md:text-2xl">
            AETHER FM
          </span>
        </Link>

        <span className="hidden h-5 w-0.5 shrink-0 bg-ink/20 sm:block" />

        <nav aria-label="Main Navigation" className="flex items-center gap-2">
          {navItem("/", "Stations")}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* TODO: re-enable network test */}
        {/* <NetworkIndicator /> */}

        {/* Search icon button — visible sm+ only */}
        <Link
          to="/search"
          aria-label="Search"
          className={`group relative hidden h-10 w-10 items-center justify-center rounded-pill border-2 border-ink shadow-hard-sm transition-transform duration-tactile ease-spring active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream before:absolute before:inset-[-2px] before:content-[''] sm:flex ${
            searchActive
              ? "bg-ink text-cream"
              : "bg-panel text-ink"
          }`}
        >
          <Search className="h-5 w-5" strokeWidth={2.5} />
        </Link>

        {/* Favorites icon button — visible sm+ only (hidden on mobile; bottom bar replaces it) */}
        <Link
          to="/favorites"
          aria-label="Favorites"
          className="group relative hidden h-10 w-10 items-center justify-center rounded-pill border-2 border-ink bg-panel shadow-hard-sm transition-transform duration-tactile ease-spring active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream before:absolute before:inset-[-2px] before:content-[''] sm:flex"
        >
          <Heart
            className={`h-5 w-5 transition-all duration-tactile ${
              favActive
                ? "fill-current text-status-red"
                : "text-ink group-hover:fill-current group-hover:text-status-red"
            } group-hover:drop-shadow-[0_0_6px_rgba(239,68,68,.7)]`}
            strokeWidth={2.5}
          />
        </Link>
      </div>
    </header>
  );
}