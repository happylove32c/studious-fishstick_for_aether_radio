import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import GenrePage from "./pages/GenrePage";
import NowPlayingPage from "./pages/NowPlayingPage";
import PlayerBar from "./components/PlayerBar";
import { StationsProvider } from "./context/StationsContext";
import { PlayerProvider } from "./context/PlayerContext";

function App() {
  return (
    <BrowserRouter>
      <StationsProvider>
        <PlayerProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/genre/:genre" element={<GenrePage />} />
            <Route path="/now-playing" element={<NowPlayingPage />} />
          </Routes>
          <PlayerBar />
        </PlayerProvider>
      </StationsProvider>
    </BrowserRouter>
  );
}

export default App;