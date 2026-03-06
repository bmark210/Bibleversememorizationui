import {
  MASTERY_MAX,
  REVIEW_REPETITIONS_MAX,
} from "@/shared/constants/training";
import type { DisplayStatus } from "@/modules/training/domain/VerseProgress";

export function computeDisplayStatus(
  masteryLevel: number,
  repetitions: number
): DisplayStatus {
  if (repetitions >= REVIEW_REPETITIONS_MAX) return "MASTERED";
  if (masteryLevel >= MASTERY_MAX) return "REVIEW";
  return "LEARNING";
}
