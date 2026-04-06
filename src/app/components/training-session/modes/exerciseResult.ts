"use client";

export type TrainingExerciseFailureReason = "max-mistakes" | "check-failed";

export type TrainingExerciseResolution =
  | {
      kind: "success";
      message: string;
      matchPercent?: number | null;
    }
  | {
      kind: "failure";
      reason: TrainingExerciseFailureReason;
      message: string;
      matchPercent?: number | null;
    }
  | {
      kind: "revealed";
      message: string;
      matchPercent?: number | null;
    };
