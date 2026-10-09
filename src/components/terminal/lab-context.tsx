"use client";

import { createContext, useContext } from "react";
import type { LabExperiment } from "@/content/lab";

/** Server-fetched Lab experiments, handed to whichever output renders them. */
export const LabExperimentsContext = createContext<readonly LabExperiment[]>([]);

export function useLabExperiments(): readonly LabExperiment[] {
  return useContext(LabExperimentsContext);
}
