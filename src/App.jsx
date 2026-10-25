import { useEffect } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { closeTopModal } from "./utils/modalStack";
import AnimatedRoutes from "./components/AnimatedRoutes";
import PlayerBar from "./components/PlayerBar";
import BottomNav from "./components/BottomNav";
import { StationsProvider } from "./context/StationsContext";
import { PlayerProvider } from "./context/PlayerContext";
import { usePlayerShortcuts } from "./hooks/usePlayerShortcuts";

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
        if (closeTopModal()) return;
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
          <AnimatedRoutes />
          <PlayerBar />
          <BottomNav />
        </PlayerProvider>
      </StationsProvider>
    </BrowserRouter>
  );
}

export default App;