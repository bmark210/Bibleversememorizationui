import { VerseStatus } from "@/shared/domain/verseStatus";
export { clamp } from "@/shared/utils/clamp";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import { computeVerseTotalProgressPercent } from "@/shared/training/verseTotalProgress";
import {
  getTrainingModeByShiftInProgressOrder,
  normalizeRawMasteryLevel as normalizeSharedRawMasteryLevel,
  toTrainingStageMasteryLevel,
} from "@/shared/training/modeEngine";
import {
  resolveVerseState,
} from "@/shared/verseRules";
import { chooseTrainingMode } from "@/modules/training/application/chooseTrainingMode";
import { triggerHaptic } from "@/app/lib/haptics";
import type { Verse } from "@/app/domain/verse";
import type { VerseMutablePatch } from "@/app/types/verseSync";
import type {
  TrainingContactToastPayload,
  TrainingCompletionToastCardPayload,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
import type {
  HapticStyle,
  ModeId,
  TrainingVerseState,
  TrainingSubsetFilter,
  VersePreviewOverride,
} from "./types";

export function haptic(style: HapticStyle) {
  triggerHaptic(style);
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeRawMasteryLevel(raw: number | null | undefined): number {
  return normalizeSharedRawMasteryLevel(raw);
}

export function toStageMasteryLevel(rawMasteryLevel: number) {
  return toTrainingStageMasteryLevel(rawMasteryLevel);
}

export function getVerseIdentity(verse: Pick<Verse, "id" | "externalVerseId">) {
  return String(verse.externalVerseId ?? verse.id);
}

export function toTrainingVerseState(verse: Verse): TrainingVerseState | null {
  const externalVerseId = String(verse.externalVerseId ?? verse.id ?? "").trim();
  const text = String(verse.text ?? "").trim();
  if (!externalVerseId || !text) return null;

  const rawMasteryLevel = normalizeRawMasteryLevel(verse.masteryLevel);
  const resolved = resolveVerseState(verse);
  const rawLastModeId = (verse as Record<string, unknown>).lastTrainingModeId;
  const lastModeId =
    typeof rawLastModeId === "number" && rawLastModeId >= 1 && rawLastModeId <= 8
      ? (rawLastModeId as ModeId)
      : null;

  return {
    raw: verse,
    key: getVerseIdentity(verse),
    telegramId: (verse as Record<string, unknown>).telegramId
      ? String((verse as Record<string, unknown>).telegramId)
      : null,
    externalVerseId,
    status: resolved.displayStatus,
    rawMasteryLevel,
    stageMasteryLevel: toStageMasteryLevel(rawMasteryLevel),
    repetitions: Math.max(0, Math.round(verse.repetitions ?? 0)),
    reviewLapseStreak: Math.max(
      0,
      Math.round(Number((verse as Record<string, unknown>).reviewLapseStreak ?? 0))
    ),
    lastModeId,
    lastReviewedAt: parseDate((verse as Record<string, unknown>).lastReviewedAt),
    nextReviewAt: resolved.nextAvailabilityAt,
  };
}

function isTrainingDueVerse(
  verse: Pick<TrainingVerseState, "status" | "nextReviewAt">
): boolean {
  if (verse.status !== "REVIEW") return true;
  if (!verse.nextReviewAt) return true;
  return Date.now() >= verse.nextReviewAt.getTime();
}

export function isTrainingEligibleVerse(verse: TrainingVerseState) {
  return resolveVerseState({
    status: verse.status,
    flow: verse.raw.flow,
    masteryLevel: verse.rawMasteryLevel,
    repetitions: verse.repetitions,
    nextReviewAt: verse.nextReviewAt?.toISOString() ?? null,
    nextReview: verse.nextReviewAt?.toISOString() ?? null,
  }).isDueForTraining;
}

export function isTrainingReviewVerse(verse: Pick<TrainingVerseState, "status">) {
  return resolveVerseState({
    status: verse.status,
    flow: null,
    masteryLevel: 0,
    repetitions: 0,
    nextReviewAt: null,
    nextReview: null,
  }).isReview;
}

export function matchesTrainingSubsetFilter(
  verse: TrainingVerseState,
  filter: TrainingSubsetFilter
) {
  if (filter === "catalog") return isTrainingEligibleVerse(verse);
  if (filter === "review") return isTrainingReviewVerse(verse) && isTrainingDueVerse(verse);
  return verse.status === VerseStatus.LEARNING;
}

export function chooseModeId(verse: TrainingVerseState): ModeId {
  return chooseTrainingMode({
    masteryLevel: verse.rawMasteryLevel,
    repetitions: verse.repetitions,
    lastTrainingModeId: verse.lastModeId,
  });
}

export function getModeByShiftInProgressOrder(modeId: ModeId, shift: number): ModeId | null {
  return getTrainingModeByShiftInProgressOrder(modeId, shift);
}

function toHumanWaitLabel(nextReviewAt: Date | null): string | null {
  if (!nextReviewAt) return null;
  const diffMs = nextReviewAt.getTime() - Date.now();
  if (diffMs <= 0) return "повтор доступен сейчас";

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  if (diffMs >= dayMs) {
    const days = Math.max(1, Math.round(diffMs / dayMs));
    return `следующий повтор через ${days} дн.`;
  }
  if (diffMs >= hourMs) {
    const hours = Math.max(1, Math.round(diffMs / hourMs));
    return `следующий повтор через ${hours} ч.`;
  }
  const minutes = Math.max(1, Math.round(diffMs / minuteMs));
  return `следующий повтор через ${minutes} мин.`;
}

export function getTrainingContactToastPayload(params: {
  wasReviewExercise: boolean;
  reviewWasSuccessful: boolean;
  reference: string;
  finalStatus: DisplayVerseStatus;
  nextReviewAt: Date | null;
  beforeRawMasteryLevel: number;
  afterRawMasteryLevel: number;
}): TrainingContactToastPayload {
  const {
    wasReviewExercise,
    reviewWasSuccessful,
    reference,
    finalStatus,
    nextReviewAt,
    beforeRawMasteryLevel,
    afterRawMasteryLevel,
  } = params;

  if (wasReviewExercise) {
    if (!reviewWasSuccessful) {
      return {
        id: Date.now(),
        reference,
        tone: "negative",
        message: "Повтор не засчитан",
        hint: "Этап повторения без прогресса",
      };
    }
    if (finalStatus === "MASTERED") {
      return {
        id: Date.now(),
        reference,
        tone: "positive",
        message: "Повтор +1",
        hint: "Стих завершён",
      };
    }
    return {
      id: Date.now(),
      reference,
      tone: "positive",
      message: "Повтор засчитан",
      hint: toHumanWaitLabel(nextReviewAt) ?? "стих отправлен на ожидание",
    };
  }

  const masteryDelta = afterRawMasteryLevel - beforeRawMasteryLevel;
  const tone: TrainingContactToastPayload["tone"] =
    masteryDelta > 0 ? "positive" : masteryDelta < 0 ? "negative" : "neutral";
  const message =
    masteryDelta > 0
      ? `Увеличение рейтинга`
      : masteryDelta < 0
        ? `Рейтинг уменьшен`
        : "Рейтинг не изменился";

  return {
    id: Date.now(),
    reference,
    tone,
    message,
    hint: `Уровень ${Math.max(0, afterRawMasteryLevel)}/${TRAINING_STAGE_MASTERY_MAX}`,
  };
}

export function getTrainingMilestonePopupPayload(params: {
  wasReviewExercise: boolean;
  beforeStatus: DisplayVerseStatus;
  finalStatus: DisplayVerseStatus;
  reference: string;
  nextReviewAt: Date | null;
  beforeRawMasteryLevel: number;
  beforeRepetitions: number;
  afterRawMasteryLevel: number;
  afterRepetitions: number;
}): TrainingCompletionToastCardPayload | null {
  const {
    wasReviewExercise,
    beforeStatus,
    finalStatus,
    reference,
    nextReviewAt,
    beforeRawMasteryLevel,
    beforeRepetitions,
    afterRawMasteryLevel,
    afterRepetitions,
  } = params;

  const beforeProgressPercent = computeTotalProgressPercent(
    beforeRawMasteryLevel,
    beforeRepetitions
  );
  const afterProgressPercent = computeTotalProgressPercent(
    afterRawMasteryLevel,
    afterRepetitions
  );

  const movedToMastered =
    wasReviewExercise && beforeStatus === "REVIEW" && finalStatus === "MASTERED";
  if (movedToMastered) {
    return {
      id: Date.now(),
      reference,
      status: "MASTERED",
      milestoneKind: "review_to_mastered",
      nextReviewHint: null,
      beforeProgressPercent,
      afterProgressPercent,
      masteryLevel: Math.max(0, afterRawMasteryLevel),
      repetitions: Math.max(0, afterRepetitions),
    };
  }

  const movedWithinReview =
    wasReviewExercise &&
    beforeStatus === "REVIEW" &&
    finalStatus === "REVIEW" &&
    afterRepetitions > beforeRepetitions;
  if (movedWithinReview) {
    const nextReviewHint = toHumanWaitLabel(nextReviewAt);
    return {
      id: Date.now(),
      reference,
      status: "REVIEW",
      milestoneKind: "review_progress",
      nextReviewHint,
      beforeProgressPercent,
      afterProgressPercent,
      masteryLevel: Math.max(0, afterRawMasteryLevel),
      repetitions: Math.max(0, afterRepetitions),
    };
  }

  const movedToReviewFromLearning =
    !wasReviewExercise &&
    beforeStatus === VerseStatus.LEARNING &&
    finalStatus === "REVIEW";
  if (!movedToReviewFromLearning) return null;

  const nextReviewHint = toHumanWaitLabel(nextReviewAt);
  return {
    id: Date.now(),
    reference,
    status: "REVIEW",
    milestoneKind: "learning_to_review",
    nextReviewHint,
    beforeProgressPercent,
    afterProgressPercent,
    masteryLevel: Math.max(0, afterRawMasteryLevel),
    repetitions: Math.max(0, afterRepetitions),
  };
}

export function getTrainingLearningStartPopupPayload(params: {
  reference: string;
  rawMasteryLevel: number;
  repetitions: number;
}): TrainingCompletionToastCardPayload {
  const { reference, rawMasteryLevel, repetitions } = params;
  const progress = computeTotalProgressPercent(rawMasteryLevel, repetitions);

  return {
    id: Date.now(),
    reference,
    status: "LEARNING",
    milestoneKind: "learning_start",
    nextReviewHint: null,
    beforeProgressPercent: progress,
    afterProgressPercent: progress,
    masteryLevel: Math.max(0, rawMasteryLevel),
    repetitions: Math.max(0, repetitions),
  };
}

export function getCreatedAtMs(verse: Verse) {
  return parseDate((verse as Record<string, unknown>).createdAt)?.getTime() ?? 0;
}

export function sortByCreatedAtDesc(list: Verse[]) {
  return [...list].sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a));
}

export function mergePreviewOverrides(
  verse: Verse,
  overrides: Map<string, VersePreviewOverride>
) {
  const patch = overrides.get(getVerseIdentity(verse));
  return patch ? ({ ...verse, ...patch } as Verse) : verse;
}

export function toPreviewOverrideFromVersePatch(patch: VerseMutablePatch): VersePreviewOverride {
  const next: VersePreviewOverride = {};
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.flow !== undefined) next.flow = patch.flow ?? null;
  if (patch.masteryLevel !== undefined) next.masteryLevel = patch.masteryLevel ?? 0;
  if (patch.repetitions !== undefined) next.repetitions = patch.repetitions ?? 0;
  if (patch.lastReviewedAt !== undefined) next.lastReviewedAt = patch.lastReviewedAt ?? null;
  if (patch.nextReviewAt !== undefined) next.nextReviewAt = patch.nextReviewAt ?? null;
  return next;
}

export function computeTotalProgressPercent(
  rawMasteryLevel: number,
  repetitions: number
): number {
  return computeVerseTotalProgressPercent(rawMasteryLevel, repetitions);
}
