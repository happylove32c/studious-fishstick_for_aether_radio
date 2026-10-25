import { useContext } from "react";
import { RecordingPlayerContext } from "./RecordingPlayerContextDef";

export function useRecordingPlayer() {
  const context = useContext(RecordingPlayerContext);
  if (!context) {
    throw new Error(
      "useRecordingPlayer must be used within a RecordingPlayerProvider"
    );
  }
  return context;
}
