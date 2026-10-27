import { createContext, useCallback, useEffect, useRef } from "react";
import { useAudioEngine } from "../hooks/useAudioEngine";
import { useStationRecorder } from "../hooks/useStationRecorder";
import { useFavorites } from "../hooks/useFavorites";
import { usePersistedVolume } from "../hooks/usePersistedVolume";

export const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const recorderRef = useRef(null);

  const {
    volume,
    muted,
    volumeRef,
    mutedRef,
    setVolume,
    toggleMute,
  } = usePersistedVolume();

  const audioEngine = useAudioEngine({
    volumeRef,
    mutedRef,
    onStopRecording: () => recorderRef.current?.stopRecording(),
  });

  const {
    current,
    isPlaying,
    error,
    status,
    format,
    playlist,
    index,
    play,
    toggle,
    stop,
    next,
    prev,
    isCurrent,
    setError,
    audioRef,
    analyserRef,
    getRecordStream,
  } = audioEngine;

  const handleSetVolume = useCallback(
    (val) => {
      setVolume(val);
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(1, val));
      }
    },
    [setVolume, audioRef]
  );

  const handleToggleMute = useCallback(() => {
    toggleMute();
    if (audioRef.current) {
      audioRef.current.muted = !mutedRef.current;
    }
  }, [toggleMute, audioRef, mutedRef]);

  const recorder = useStationRecorder({
    current,
    isPlaying,
    getRecordStream,
    setError,
  });

  useEffect(() => {
    recorderRef.current = recorder;
  });

  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <PlayerContext.Provider
      value={{
        current,
        isPlaying,
        volume,
        muted,
        error,
        status,
        format,
        playlist,
        index,
        play,
        toggle,
        stop,
        next,
        prev,
        setVolume: handleSetVolume,
        toggleMute: handleToggleMute,
        isCurrent,
        isFavorite,
        toggleFavorite,
        audioRef,
        analyserRef,
        recording: recorder.recording,
        recordElapsed: recorder.recordElapsed,
        startRecording: recorder.startRecording,
        stopRecording: recorder.stopRecording,
        getRecordStream: recorder.getRecordStream,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export default PlayerProvider;
