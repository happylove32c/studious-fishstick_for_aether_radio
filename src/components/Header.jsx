import { Radio, Headphones, Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { usePlayer } from "../context/usePlayer";
import NetworkIndicator from "./NetworkIndicator";

export default function Header() {
  const { isPlaying, status } = usePlayer();
  const live = isPlaying && status === "connected";
  const { pathname } = useLocation();

  const navItem = (to, label, icon) => {
    const active =
      pathname === to || (to === "/" && pathname.startsWith("/genre"));
    return (
      <Link
        to={to}
        className={`hidden items-center gap-1.5 text-xs uppercase tracking-[0.25em] transition-colors sm:inline-flex ${
          active ? "text-white" : "text-white/40 hover:text-white"
        }`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-white/20 px-4 py-4 backdrop-blur-md sm:px-6 sm:py-5 md:px-10">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Headphones className="h-5 w-5 shrink-0 text-white/40 sm:h-6 sm:w-6" />

        <Link
          to="/"
          className="truncate text-[11px] font-bold tracking-[0.25em] text-white/40 transition-colors hover:text-white sm:text-xs sm:tracking-[0.35em]"
        >
          AETHER FM
        </Link>

        <span className="hidden h-px w-10 shrink-0 bg-white/30 sm:block" />

        {navItem("/", "Stations")}
        {navItem("/favorites", "Favorites", <Heart className="h-3.5 w-3.5" />)}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 text-[11px] uppercase tracking-[0.2em] text-white sm:gap-4 sm:text-xs sm:tracking-[0.25em]">
        <NetworkIndicator />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Radio
            className={`h-3.5 w-3.5 ${live ? "animate-pulse text-white" : "text-white/30"}`}
          />
          <span>{live ? "Live" : "Off air"}</span>
        </div>
      </div>
    </header>
  );
}