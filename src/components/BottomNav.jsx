import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home, Search, Heart, MoreHorizontal } from "lucide-react";
import MobileActionsModal from "./MobileActionsModal";

export default function BottomNav() {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (pathname === "/now-playing" || pathname.startsWith("/recordings/")) return null;

  const isHomeActive = pathname === "/" || pathname.startsWith("/genre");
  const isSearchActive = pathname === "/search";
  const isFavActive = pathname === "/favorites";

  const navItems = [
    {
      to: "/",
      label: "Home",
      icon: Home,
      active: isHomeActive,
    },
    {
      to: "/search",
      label: "Search",
      icon: Search,
      active: isSearchActive,
    },
    {
      to: "/favorites",
      label: "Presets",
      icon: Heart,
      active: isFavActive,
    },
  ];

  return (
    <>
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-50 border-t-3 border-ink bg-cream px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden"
      >
        <div className="flex items-center justify-around gap-1.5">
          {navItems.map(({ to, label, icon: Icon, active }) => (
            <Link
              key={to}
              to={to}
              className={`flex min-h-[56px] min-w-[40px] flex-1 flex-col items-center justify-center gap-0.5 rounded-chunky border-2 border-ink px-2 py-1.5 font-mono text-[12.5px] font-bold uppercase tracking-wider leading-none transition-all duration-tactile ease-spring active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
                active
                  ? "bg-ink text-cream shadow-hard-sm"
                  : "bg-panel text-ink active:translate-x-0.5 active:translate-y-0.5"
              }`}
            >
              <Icon
                className={`h-[1.4rem] w-[1.4rem] shrink-0 ${active && Icon === Heart ? "fill-current" : ""}`}
                strokeWidth={2.5}
              />
              <span className="truncate leading-none">{label}</span>
            </Link>
          ))}

          {/* 4th Action: 3-Dot More Menu */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="More receiver options"
            className={`flex min-h-[56px] min-w-[40px] flex-1 flex-col items-center justify-center gap-0.5 rounded-chunky border-2 border-ink px-2 py-1.5 font-mono text-[12.5px] font-bold uppercase tracking-wider leading-none transition-all duration-tactile ease-spring active:scale-95 focus-visible:outline-none ${
              isMenuOpen
                ? "bg-ink text-cream shadow-hard-sm"
                : "bg-panel text-ink active:translate-x-0.5 active:translate-y-0.5"
            }`}
          >
            <MoreHorizontal className="h-[1.4rem] w-[1.4rem] shrink-0" strokeWidth={2.5} />
            <span className="leading-none">Hub</span>
          </button>
        </div>
      </nav>

      {/* Tactile Mobile Bottom Sheet */}
      <MobileActionsModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
