import { Pause, Play, Plus } from "lucide-react";
import { VerseStatus } from "@/generated/prisma";
import {
  normalizeDisplayVerseStatus,
  type DisplayVerseStatus,
} from "@/app/types/verseStatus";
import {
  REVIEW_REPETITION_INTERVAL_DAYS,
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
  TOTAL_REPEATS_AND_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";
import {
  chooseTrainingModeId,
  getTrainingModeByShiftInProgressOrder,
  normalizeRawMasteryLevel as normalizeSharedRawMasteryLevel,
  toTrainingStageMasteryLevel,
} from "@/shared/training/modeEngine";
import type { Verse } from "@/app/App";
import type { VerseMutablePatch } from "@/app/types/verseSync";
import type {
  TrainingContactToastPayload,
  TrainingCompletionToastCardPayload,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
import { MAX_MASTERY_LEVEL, SPACED_REPETITION_MS } from "./constants";
import type {
  HapticStyle,
  GalleryStatusAction,
  ModeId,
  TrainingVerseState,
  TrainingSubsetFilter,
  VersePreviewOverride,
} from "./types";

export function haptic(style: HapticStyle) {
  try {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            HapticFeedback?: {
              notificationOccurred: (s: string) => void;
              impactOccurred: (s: string) => void;
            };
          };
        };
      }
    ).Telegram?.WebApp?.HapticFeedback;
    if (!tg) return;
    if (style === "success" || style === "error" || style === "warning") {
      tg.notificationOccurred(style);
      return;
    }
    tg.impactOccurred(style);
  } catch {}
}

export function getGalleryStatusAction(status: DisplayVerseStatus): GalleryStatusAction | null {
  if (status === "CATALOG") {
    return {
      nextStatus: VerseStatus.MY,
      label: "Добавить в мои",
      icon: Plus,
      successMessage: "Добавлено в мои стихи",
    };
  }
  if (status === VerseStatus.MY) {
    return {
      nextStatus: VerseStatus.LEARNING,
      label: "Добавить в изучение",
      icon: Plus,
      successMessage: "Добавлено в изучение",
    };
  }
  if (status === VerseStatus.LEARNING || status === "REVIEW") {
    return {
      nextStatus: VerseStatus.STOPPED,
      label: "Поставить на паузу",
      icon: Pause,
      successMessage: "Пауза включена",
    };
  }
  if (status === VerseStatus.STOPPED) {
    return {
      nextStatus: VerseStatus.LEARNING,
      label: "Возобновить изучение",
      icon: Play,
      successMessage: "Возобновлено",
    };
  }
  return null;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeVerseStatus(status: Verse["status"]): DisplayVerseStatus {
  return normalizeDisplayVerseStatus(status);
}

export function normalizeRawMasteryLevel(raw: number | null | undefined): number {
  return normalizeSharedRawMasteryLevel(raw);
}

export function toStageMasteryLevel(rawMasteryLevel: number) {
  return toTrainingStageMasteryLevel(rawMasteryLevel);
}

export function masteryToProgress(stageMasteryLevel: number) {
  return Math.round(
    (clamp(stageMasteryLevel, 0, MAX_MASTERY_LEVEL) / MAX_MASTERY_LEVEL) * 100
  );
}

export function getVerseIdentity(verse: Pick<Verse, "id" | "externalVerseId">) {
  return String(verse.externalVerseId ?? verse.id);
}

export function toTrainingVerseState(verse: Verse): TrainingVerseState | null {
  const externalVerseId = String(verse.externalVerseId ?? verse.id ?? "").trim();
  const text = String(verse.text ?? "").trim();
  if (!externalVerseId || !text) return null;

  const rawMasteryLevel = normalizeRawMasteryLevel(verse.masteryLevel);
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
    status: normalizeVerseStatus(verse.status),
    rawMasteryLevel,
    stageMasteryLevel: toStageMasteryLevel(rawMasteryLevel),
    repetitions: Math.max(0, Math.round(verse.repetitions ?? 0)),
    lastModeId,
    lastReviewedAt: parseDate((verse as Record<string, unknown>).lastReviewedAt),
    nextReviewAt: parseDate(
      (verse as Record<string, unknown>).nextReviewAt ??
        (verse as Record<string, unknown>).nextReview
    ),
  };
}

export function isTrainingDueVerse(
  verse: Pick<TrainingVerseState, "status" | "nextReviewAt">
): boolean {
  if (verse.status !== "REVIEW") return true;
  if (!verse.nextReviewAt) return true;
  return Date.now() >= verse.nextReviewAt.getTime();
}

export function isTrainingEligibleVerse(verse: TrainingVerseState) {
  return (
    (verse.status === VerseStatus.LEARNING || verse.status === "REVIEW") &&
    isTrainingDueVerse(verse)
  );
}

export function isTrainingReviewVerse(verse: Pick<TrainingVerseState, "status">) {
  return verse.status === "REVIEW";
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
  return chooseTrainingModeId({
    rawMasteryLevel: verse.rawMasteryLevel,
    stageMasteryLevel: verse.stageMasteryLevel,
    repetitions: verse.repetitions,
    lastModeId: verse.lastModeId,
  });
}

export function getModeByShiftInProgressOrder(modeId: ModeId, shift: number): ModeId | null {
  return getTrainingModeByShiftInProgressOrder(modeId, shift);
}

export function calcNextReviewAt(masteryLevel: number, score: number): Date {
  const base =
    SPACED_REPETITION_MS[clamp(masteryLevel, 0, MAX_MASTERY_LEVEL)] ??
    SPACED_REPETITION_MS[0];
  const multiplier = score >= 92 ? 1.25 : score >= 80 ? 1 : score >= 65 ? 0.75 : 0.5;
  return new Date(Date.now() + Math.round(base * multiplier));
}

export function calcNextReviewAtForReviewRepetition(
  successfulRepetitions: number
): Date | null {
  if (successfulRepetitions >= REPEAT_THRESHOLD_FOR_MASTERED) {
    return null;
  }
  const clampedIndex = clamp(
    successfulRepetitions,
    0,
    REVIEW_REPETITION_INTERVAL_DAYS.length - 1
  );
  const intervalDays = REVIEW_REPETITION_INTERVAL_DAYS[clampedIndex] ?? 1;
  return new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
}

export function deriveTrainingDisplayStatus(params: {
  baseStatus: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  nextReviewAt: Date | null;
}): DisplayVerseStatus {
  const { baseStatus, masteryLevel, repetitions } = params;
  if (baseStatus === VerseStatus.MY) return VerseStatus.MY;
  if (baseStatus === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  if (repetitions >= REPEAT_THRESHOLD_FOR_MASTERED) return "MASTERED";
  if (masteryLevel >= MAX_MASTERY_LEVEL) return "REVIEW";
  return VerseStatus.LEARNING;
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
      ? `Рейтинг +${masteryDelta}`
      : masteryDelta < 0
        ? `Рейтинг ${masteryDelta}`
        : "Рейтинг без изменений";

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
      title: "Стих выучен полностью",
      description: "Этап повторения завершён. Стих перешёл в список завершённых.",
      outcome: "success",
      beforeProgressPercent,
      afterProgressPercent,
      masteryLevel: Math.max(0, afterRawMasteryLevel),
      repetitions: Math.max(0, afterRepetitions),
    };
  }

  const movedToReview =
    !wasReviewExercise &&
    beforeStatus === VerseStatus.LEARNING &&
    finalStatus === "REVIEW";
  if (!movedToReview) return null;

  const reviewHint = toHumanWaitLabel(nextReviewAt);
  return {
    id: Date.now(),
    reference,
    status: "REVIEW",
    title: "Этап изучения завершён",
    description: reviewHint
      ? `Стих переведён в повторение, ${reviewHint}.`
      : "Стих переведён в повторение. Теперь он закрепляется по интервальным повторам.",
    outcome: "success",
    beforeProgressPercent,
    afterProgressPercent,
    masteryLevel: Math.max(0, afterRawMasteryLevel),
    repetitions: Math.max(0, afterRepetitions),
  };
}

export function asLegacyVerse(verse: TrainingVerseState): Verse {
  const progress = masteryToProgress(verse.stageMasteryLevel);
  return {
    id: verse.key,
    externalVerseId: verse.externalVerseId,
    status: verse.status,
    reference: verse.raw.reference,
    text: verse.raw.text,
    translation: String((verse.raw as Record<string, unknown>).translation ?? "rus_syn"),
    masteryLevel: progress,
    repetitions: verse.repetitions,
    lastReviewedAt: verse.lastReviewedAt?.toISOString() ?? null,
    nextReviewAt: verse.nextReviewAt?.toISOString() ?? null,
    nextReview: verse.nextReviewAt?.toISOString() ?? null,
    tags: [],
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
  const total = Math.min(rawMasteryLevel + repetitions, TOTAL_REPEATS_AND_STAGE_MASTERY_MAX);
  return Math.round((total / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100);
}
