import { useContext } from "react";
import { StationsContext } from "./StationsContextDef";

export function useStations() {
  const context = useContext(StationsContext);
  if (!context) {
    throw new Error("useStations must be used within a StationsProvider");
  }
  return context;
}
