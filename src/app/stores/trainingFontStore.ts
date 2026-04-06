"use client";

import { create } from "zustand";

const TRAINING_FONT_SIZE_STORAGE_KEY = "training.font-size-preference";

export type TrainingFontSize = "small" | "medium" | "large" | "extra-large";

type TrainingFontStore = {
  trainingFontSize: TrainingFontSize;
  hydrateTrainingFontSize: () => TrainingFontSize;
  setTrainingFontSize: (size: TrainingFontSize) => void;
};

function isValidFontSize(value: string | null): value is TrainingFontSize {
  return (
    value === "small" ||
    value === "medium" ||
    value === "large" ||
    value === "extra-large"
  );
}

function readStoredTrainingFontSize(): TrainingFontSize {
  if (typeof window === "undefined") return "small";

  try {
    const stored = window.localStorage.getItem(TRAINING_FONT_SIZE_STORAGE_KEY);
    return isValidFontSize(stored) ? stored : "small";
  } catch {
    return "small";
  }
}

function writeStoredTrainingFontSize(size: TrainingFontSize) {
  if (typeof window === "undefined") return;

  try {
    if (size === "small") {
      window.localStorage.removeItem(TRAINING_FONT_SIZE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(TRAINING_FONT_SIZE_STORAGE_KEY, size);
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

export const useTrainingFontStore = create<TrainingFontStore>((set) => ({
  trainingFontSize: "small",
  hydrateTrainingFontSize: () => {
    const trainingFontSize = readStoredTrainingFontSize();
    set({ trainingFontSize });
    return trainingFontSize;
  },
  setTrainingFontSize: (size) => {
    writeStoredTrainingFontSize(size);
    set({ trainingFontSize: size });
  },
}));
