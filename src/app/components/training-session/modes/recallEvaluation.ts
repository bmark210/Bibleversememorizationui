"use client";

import { similarityRatio } from "@/shared/utils/levenshtein";
import type { TrainingExerciseResolution } from "./exerciseResult";

export function calculateRecallMatchPercent(
  userText: string,
  targetText: string,
): number {
  return Math.max(
    0,
    Math.min(100, Math.round(similarityRatio(userText, targetText) * 100)),
  );
}

export function buildRecallResolution(params: {
  matchPercent: number;
  recallThreshold: number;
}): TrainingExerciseResolution {
  const { matchPercent, recallThreshold } = params;
  const isSuccess = matchPercent >= recallThreshold;

  if (isSuccess) {
    return {
      kind: "success",
      message: `Совпадение ${matchPercent}%. Проверка пройдена.`,
      matchPercent,
    };
  }

  return {
    kind: "failure",
    reason: "check-failed",
    message: `Совпадение ${matchPercent}%. Попробуйте ещё раз.`,
    matchPercent,
  };
}
