import { VerseStatus } from "@/shared/domain/verseStatus";
import { type TrainingModeId } from "@/shared/training/modeEngine";
import { chooseTrainingMode } from "@/modules/training/application/chooseTrainingMode";
import { MODE_PIPELINE } from "./constants";
import type { TrainingModeMeta } from "./types";

type CurrentTrainingModeParams = {
  status: string;
  masteryLevel: number;
  repetitionsCount: number;
  lastTrainingModeId?: TrainingModeId | null;
};

export function getTrainingModeMeta(
  modeId: TrainingModeId | null | undefined
): TrainingModeMeta | null {
  if (modeId == null) return null;
  return MODE_PIPELINE[modeId] ?? null;
}

export function getCurrentTrainingModeId({
  status,
  masteryLevel,
  repetitionsCount,
  lastTrainingModeId = null,
}: CurrentTrainingModeParams): TrainingModeId | null {
  if (status === VerseStatus.LEARNING || status === "REVIEW") {
    return chooseTrainingMode({
      masteryLevel,
      repetitions: repetitionsCount,
      lastTrainingModeId,
    });
  }

  return null;
}

export function getCurrentTrainingModeMeta(
  params: CurrentTrainingModeParams
): TrainingModeMeta | null {
  return getTrainingModeMeta(getCurrentTrainingModeId(params));
}
