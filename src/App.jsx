import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GenrePage from "./pages/GenrePage";
import NowPlayingPage from "./pages/NowPlayingPage";
import PlayerBar from "./components/PlayerBar";
import { StationsProvider } from "./context/StationsContext";
import { PlayerProvider } from "./context/PlayerContext";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";
import FavoritesPage from "./pages/FavoritesPage";

function KeyboardShortcuts() {
  usePlayerShortcuts();
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <StationsProvider>
        <PlayerProvider>
          <KeyboardShortcuts />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/genre/:genre" element={<GenrePage />} />
            <Route path="/now-playing" element={<NowPlayingPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
          <PlayerBar />
        </PlayerProvider>
      </StationsProvider>
    </BrowserRouter>
  );
}

export default App;