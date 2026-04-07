import {
  chooseTrainingModeId,
  toTrainingStageMasteryLevel,
} from "@/shared/training/modeEngine";
import { TrainingModeId } from "@/modules/training/domain/TrainingMode";

export function chooseTrainingMode(params: {
  masteryLevel: number;
  repetitions: number;
}): TrainingModeId {
  const { masteryLevel, repetitions } = params;

  return chooseTrainingModeId({
    rawMasteryLevel: masteryLevel,
    stageMasteryLevel: toTrainingStageMasteryLevel(masteryLevel),
    repetitions,
  });
}
