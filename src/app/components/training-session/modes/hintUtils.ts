export {
  canUseNextWordHint,
  generateHintFirstWords,
  generateNextWordHint,
  getAvailableHints,
  hasContextHint,
  isHintFree,
  requestTrainingAttemptHint,
  resolveHintRatingPolicy,
} from "@/modules/training/hints/hintEngine";

export type {
  HintContent,
  HintRatingPolicy,
  HintRequestResult,
  HintType,
  TrainingAttempt,
  TrainingAttemptPhase,
  TrainingAttemptStatus,
} from "@/modules/training/hints/types";
