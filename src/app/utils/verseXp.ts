import type { VerseStatus as ApiVerseStatus } from "@/shared/domain/verseStatus";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { computeSocialVerseXp } from "@/shared/social/xp";
import { formatXp } from "@/shared/social/formatXp";
import type { VerseDifficultyLevel } from "@/shared/verses/difficulty";

export type VerseXpSnapshot = {
  status: DisplayVerseStatus;
  difficultyLevel: VerseDifficultyLevel;
  masteryLevel: number;
  repetitions: number;
  referenceScore?: number | null;
  incipitScore?: number | null;
  contextScore?: number | null;
};

function toSocialStatus(status: DisplayVerseStatus): ApiVerseStatus {
  if (status === "LEARNING" || status === "REVIEW" || status === "MASTERED") {
    return "LEARNING";
  }
  if (status === "STOPPED") return "STOPPED";
  return "MY";
}

export function computeVerseXpContribution(snapshot: VerseXpSnapshot): number {
  return computeSocialVerseXp({
    status: toSocialStatus(snapshot.status),
    difficultyLevel: snapshot.difficultyLevel,
    masteryLevel: snapshot.masteryLevel,
    repetitions: snapshot.repetitions,
    referenceScore: snapshot.referenceScore,
    incipitScore: snapshot.incipitScore,
    contextScore: snapshot.contextScore,
  }).totalXp;
}

export function buildVerseDeletionXpFeedback(params: {
  xpLoss: number;
  resetToCatalog?: boolean;
}) {
  const title = params.resetToCatalog ? "Сброшено в каталог" : "Стих удалён";
  const description =
    params.xpLoss > 0
      ? `Прогресс удалённого стиха убран из рейтинга: -${formatXp(params.xpLoss)}.`
      : "Удаление прошло успешно. XP не изменился.";

  return {
    title,
    description,
  };
}
