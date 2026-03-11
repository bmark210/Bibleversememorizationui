import { useCallback, useEffect, useState } from "react";
import type { TrainingProgressPopupPayload } from "./trainingProgressFeedback";

const DEFAULT_PROGRESS_POPUP_DURATION_MS = 2000;

export function useTrainingProgressPopup(
  durationMs = DEFAULT_PROGRESS_POPUP_DURATION_MS
) {
  const [progressPopup, setProgressPopup] =
    useState<TrainingProgressPopupPayload | null>(null);

  useEffect(() => {
    if (!progressPopup || typeof window === "undefined") return;

    const timeoutId = window.setTimeout(() => {
      setProgressPopup((current) =>
        current?.id === progressPopup.id ? null : current
      );
    }, durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, progressPopup]);

  const showProgressPopup = useCallback(
    (payload: TrainingProgressPopupPayload | null) => {
      if (!payload) return;
      setProgressPopup(payload);
    },
    []
  );

  const clearProgressPopup = useCallback(() => {
    setProgressPopup(null);
  }, []);

  return {
    progressPopup,
    showProgressPopup,
    clearProgressPopup,
  };
}
