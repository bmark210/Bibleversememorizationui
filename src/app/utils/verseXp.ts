import { VerseStatus as PrismaVerseStatus } from "@/generated/prisma";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { computeSocialVerseXp } from "@/shared/social/xp";
import { formatXp } from "@/shared/social/formatXp";

export type VerseXpSnapshot = {
  status: DisplayVerseStatus;
  masteryLevel: number;
  repetitions: number;
  referenceScore?: number | null;
  incipitScore?: number | null;
  contextScore?: number | null;
};

function toSocialStatus(status: DisplayVerseStatus): PrismaVerseStatus {
  if (status === "LEARNING" || status === "REVIEW" || status === "MASTERED") {
    return PrismaVerseStatus.LEARNING;
  }
  if (status === "STOPPED") return PrismaVerseStatus.STOPPED;
  return PrismaVerseStatus.MY;
}

export function computeVerseXpContribution(snapshot: VerseXpSnapshot): number {
  return computeSocialVerseXp({
    status: toSocialStatus(snapshot.status),
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
