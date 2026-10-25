import { usePlayer } from "../context/usePlayer";

/**
 * Hook providing station recording status and control methods.
 */
export function useRecorder() {
  const {
    recording,
    recordElapsed,
    startRecording,
    stopRecording,
    getRecordStream,
    isPlaying,
  } = usePlayer();

  const stream = getRecordStream ? getRecordStream() : null;
  const canRecord = Boolean(isPlaying && stream);

  return {
    recording,
    recordElapsed,
    startRecording,
    stopRecording,
    getRecordStream,
    canRecord,
  };
}

export default useRecorder;
