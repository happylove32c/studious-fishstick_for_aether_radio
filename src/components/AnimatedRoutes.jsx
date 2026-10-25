import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import HomePage from "../pages/HomePage";
import GenrePage from "../pages/GenrePage";
import NowPlayingPage from "../pages/NowPlayingPage";
import FavoritesPage from "../pages/FavoritesPage";
import SearchPage from "../pages/SearchPage";
import RecordingsPage from "../pages/RecordingsPage";

function RouteSwitch({ location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/genre/:genre" element={<GenrePage />} />
      <Route path="/now-playing" element={<NowPlayingPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/recordings" element={<RecordingsPage />} />
    </Routes>
  );
}

export default function AnimatedRoutes() {
  const location = useLocation();
  const navType = useNavigationType();

  const [prevLocation, setPrevLocation] = useState(null);
  const [activeNavType, setActiveNavType] = useState(navType);
  const [currentLoc, setCurrentLoc] = useState(location);

  if (location.key !== currentLoc.key) {
    setPrevLocation(currentLoc);
    setCurrentLoc(location);
    setActiveNavType(navType);
  }

  useEffect(() => {
    if (!prevLocation) return;
    const timer = setTimeout(() => {
      setPrevLocation(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [prevLocation]);

  // At rest: render one normal layer with no wrapper styles
  if (!prevLocation) {
    return <RouteSwitch location={location} />;
  }

  // During transition: both layers are fixed inset-0 overflow-y-auto overscroll-contain bg-cream
  const isPop = activeNavType === "POP";
  const isNpIncoming = location.pathname === "/now-playing";
  const isNpOutgoing = prevLocation.pathname === "/now-playing";

  let incomingClass;
  let outgoingClass;
  let incomingZ;
  let outgoingZ;

  if (isNpIncoming) {
    incomingZ = "z-[60]";
    incomingClass = "animate-page-np-in";
    outgoingZ = "z-10";
    outgoingClass = "animate-page-push-out";
  } else if (isNpOutgoing) {
    outgoingZ = "z-[60]";
    outgoingClass = "animate-page-np-out";
    incomingZ = "z-10";
    incomingClass = "animate-page-pop-in";
  } else if (isPop) {
    outgoingZ = "z-20";
    outgoingClass = "animate-page-pop-out";
    incomingZ = "z-10";
    incomingClass = "animate-page-pop-in";
  } else {
    incomingZ = "z-20";
    incomingClass = "animate-page-push-in";
    outgoingZ = "z-10";
    outgoingClass = "animate-page-push-out";
  }

  return (
    <>
      <div
        key={prevLocation.key}
        className={`fixed inset-0 overflow-y-auto overscroll-contain bg-cream ${outgoingZ} ${outgoingClass}`}
      >
        <RouteSwitch location={prevLocation} />
      </div>
      <div
        key={location.key}
        className={`fixed inset-0 overflow-y-auto overscroll-contain bg-cream ${incomingZ} ${incomingClass}`}
      >
        <RouteSwitch location={location} />
      </div>
    </>
  );
}
