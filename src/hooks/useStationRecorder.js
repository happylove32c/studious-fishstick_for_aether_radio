import { useCallback, useEffect, useRef, useState } from "react";
import { updateNativeRecording } from "../utils/nativeMediaControls";
import { checkStorageSpace, saveRecording } from "../utils/recordingsStore";

/**
 * Hook to manage live radio recording using MediaRecorder and IndexedDB persistence.
 *
 * @param {Object} options
 * @param {Object|null} options.current - Currently playing station.
 * @param {boolean} options.isPlaying - Whether audio is currently playing.
 * @param {Function} options.getRecordStream - Callback providing the active MediaStream.
 * @param {Function} [options.setError] - Optional setter to report errors.
 * @returns {{
 *   recording: boolean,
 *   recordElapsed: number,
 *   startRecording: () => Promise<void>,
 *   stopRecording: () => void,
 *   getRecordStream: () => MediaStream|null,
 *   isRecording: () => boolean
 * }}
 */
export function useStationRecorder({
  current,
  isPlaying,
  getRecordStream,
  setError,
}) {
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordElapsedRef = useRef(0);
  const recordingStationRef = useRef(null);
  const recordMimeRef = useRef("");
  const stopRecordingRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const station = recordingStationRef.current || current;
    const elapsed = recordElapsedRef.current;
    const mime = recordMimeRef.current || "audio/webm";

    setRecording(false);
    setRecordElapsed(0);
    recordElapsedRef.current = 0;
    recordingStationRef.current = null;
    mediaRecorderRef.current = null;

    updateNativeRecording({ recording: false, elapsed: 0 });

    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = async () => {
        const chunks = recordChunksRef.current;
        recordChunksRef.current = [];
        if (chunks.length > 0 && station) {
          const blob = new Blob(chunks, { type: mime });
          if (blob.size > 0) {
            const dateStr = new Date().toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const meta = {
              id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: `${station.name} ${dateStr}`,
              stationName: station.name,
              genre: station.genre || "Live Radio",
              createdAt: Date.now(),
              durationSec: elapsed,
              sizeBytes: blob.size,
              mime: blob.type || mime,
            };
            try {
              await saveRecording(meta, blob);
            } catch (err) {
              console.error("Failed to auto-save recording:", err);
            }
          }
        }
      };
      try {
        recorder.stop();
      } catch (err) {
        console.warn("Error stopping MediaRecorder:", err);
      }
    }
  }, [current]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (mediaRecorderRef.current) return;

    const stream = getRecordStream ? getRecordStream() : null;
    if (!isPlaying || !stream) {
      setError?.("This station can't be recorded");
      return;
    }

    const space = await checkStorageSpace();
    if (!space.ok) {
      setError?.(space.message || "Storage full (under 20MB free space)");
      return;
    }

    const mimeCandidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];
    let selectedMime = "";
    if (typeof MediaRecorder !== "undefined") {
      for (const m of mimeCandidates) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }
    }

    try {
      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      const recorder = new MediaRecorder(stream, options);

      recordChunksRef.current = [];
      recordMimeRef.current = selectedMime || recorder.mimeType || "audio/webm";
      recordingStationRef.current = current;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordChunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        if (stopRecordingRef.current) stopRecordingRef.current();
      };

      recorder.start(1000);

      setRecording(true);
      setRecordElapsed(0);
      recordElapsedRef.current = 0;
      updateNativeRecording({ recording: true, elapsed: 0 });

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        recordElapsedRef.current += 1;
        const currentElapsed = recordElapsedRef.current;
        setRecordElapsed(currentElapsed);
        updateNativeRecording({ recording: true, elapsed: currentElapsed });

        if (currentElapsed >= 3 * 3600) {
          if (stopRecordingRef.current) stopRecordingRef.current();
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      setError?.("This station can't be recorded");
    }
  }, [current, getRecordStream, isPlaying, setError]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current) stopRecordingRef.current?.();
    };
  }, []);

  const isRecording = useCallback(() => Boolean(mediaRecorderRef.current), []);

  return {
    recording,
    recordElapsed,
    startRecording,
    stopRecording,
    getRecordStream,
    isRecording,
  };
}

export default useStationRecorder;
