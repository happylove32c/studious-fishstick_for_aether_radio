import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import HomePage from "./pages/HomePage";
import GenrePage from "./pages/GenrePage";
import NowPlayingPage from "./pages/NowPlayingPage";
import PlayerBar from "./components/PlayerBar";
import BottomNav from "./components/BottomNav";
import { StationsProvider } from "./context/StationsContext";
import { PlayerProvider } from "./context/PlayerContext";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import FavoritesPage from "./pages/FavoritesPage";
import SearchPage from "./pages/SearchPage";

function KeyboardShortcuts() {
  usePlayerShortcuts();
  return null;
}

function BackButtonHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener;
    const register = async () => {
      listener = await CapApp.addListener("backButton", () => {
        if (window.history.state?.idx > 0) {
          navigate(-1);
        } else {
          CapApp.exitApp();
        }
      });
    };
    register();

    return () => {
      if (listener) listener.remove();
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <StationsProvider>
        <PlayerProvider>
          <KeyboardShortcuts />
          <BackButtonHandler />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/genre/:genre" element={<GenrePage />} />
            <Route path="/now-playing" element={<NowPlayingPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
          <PlayerBar />
          <BottomNav />
        </PlayerProvider>
      </StationsProvider>
    </BrowserRouter>
  );
}

export default App;