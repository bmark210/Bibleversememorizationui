import {
  chooseTrainingModeId,
  toTrainingStageMasteryLevel,
} from "@/shared/training/modeEngine";
import { TrainingModeId } from "@/modules/training/domain/TrainingMode";

export function chooseTrainingMode(params: {
  masteryLevel: number;
  repetitions: number;
  lastTrainingModeId: TrainingModeId | null;
}): TrainingModeId {
  const { masteryLevel, repetitions, lastTrainingModeId } = params;

  return chooseTrainingModeId({
    rawMasteryLevel: masteryLevel,
    stageMasteryLevel: toTrainingStageMasteryLevel(masteryLevel),
    repetitions,
    lastModeId: lastTrainingModeId,
  });
}
