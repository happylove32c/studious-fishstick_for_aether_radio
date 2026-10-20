import { useLocation, Link } from "react-router-dom";
import { Home, Search, Heart } from "lucide-react";

export default function BottomNav() {
  const { pathname } = useLocation();

  if (pathname === "/now-playing") return null;

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
      label: "Favorites",
      icon: Heart,
      active: isFavActive,
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-50 border-t-3 border-ink bg-cream px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      <div className="flex items-center justify-around gap-2">
        {navItems.map(({ to, label, icon: Icon, active }) => (
          <Link
            key={to}
            to={to}
            className={`flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-pill border-2 border-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-tactile ease-spring active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
              active
                ? "bg-ink text-cream shadow-hard-sm"
                : "bg-panel text-ink active:translate-x-0.5 active:translate-y-0.5"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active && Icon === Heart ? "fill-current" : ""}`}
              strokeWidth={2.5}
            />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
