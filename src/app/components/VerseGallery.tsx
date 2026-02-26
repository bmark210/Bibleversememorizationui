"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type RefObject, type TouchEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  X,
  Clock3,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Pause,
  Play,
  Repeat,
  Trophy,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import { TrainingSubsetSelect } from "./verse-gallery/TrainingSubsetSelect";
import {
  TrainingCompletionToastCard,
  type TrainingCompletionToastCardPayload,
} from "./verse-gallery/TrainingCompletionToastCard";
import { Verse } from "@/app/App";
import { UserVersesService } from "@/api/services/UserVersesService";
import { fetchAllUserVerses } from "@/api/services/userVersesPagination";
import { VerseStatus } from "@/generated/prisma";
import { normalizeDisplayVerseStatus, type DisplayVerseStatus } from "@/app/types/verseStatus";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import {
  TrainingModeId,
  TRAINING_MODE_SHIFT_BY_RATING,
  applyMasteryDelta,
  chooseTrainingModeId,
  getTrainingModeByShiftInProgressOrder,
  normalizeRawMasteryLevel as normalizeSharedRawMasteryLevel,
  shouldCountTrainingRepetition,
  toTrainingStageMasteryLevel,
} from "@/shared/training/modeEngine";
import {
  createVerticalTouchSwipeStart,
  getVerticalTouchSwipeStep,
  type VerticalTouchSwipeStart,
} from "@/shared/ui/verticalTouchSwipe";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";
import { VerseCard, type VerseCardPreviewTone } from "./VerseCard";
import type { Verse as LegacyVerse } from "../data/mockData";
import {
  TrainingModeRenderer,
  TrainingModeRendererKey,
  type TrainingModeRendererHandle,
} from "./training-session/TrainingModeRenderer";
import type { TrainingModeRating } from "./training-session/modes/types";
import { toMasteryPercent } from "./Dashboard";
import type {
  DailyGoalGalleryContext,
  DailyGoalProgressEvent,
  DailyGoalResumeMode,
  DailyGoalTrainingStartDecision,
} from "@/app/features/daily-goal/types";
import type { VerseMutablePatch, VersePatchEvent } from "@/app/types/verseSync";

type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  autoStartTrainingOnOpen?: boolean;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<VerseMutablePatch | void>;
  onVersePatched?: (event: VersePatchEvent) => void;
  onDelete: (verse: Verse) => Promise<void>;
  previewTotalCount?: number;
  previewHasMore?: boolean;
  previewIsLoadingMore?: boolean;
  onRequestMorePreviewVerses?: () => Promise<boolean>;
  dailyGoalContext?: DailyGoalGalleryContext;
  onBeforeStartTrainingFromGalleryVerse?: (verse: Verse) => Promise<DailyGoalTrainingStartDecision> | DailyGoalTrainingStartDecision;
  onDailyGoalProgressEvent?: (event: DailyGoalProgressEvent) => void;
  onDailyGoalJumpToVerseRequest?: (externalVerseId: string) => void;
  onDailyGoalPreferredResumeModeChange?: (mode: DailyGoalResumeMode) => void;
};

type HapticStyle = "light" | "medium" | "heavy" | "success" | "error" | "warning";
type PanelMode = "preview" | "training";
type Rating = TrainingModeRating;
type TrainingSubsetFilter = "learning" | "review" | "all";

type GalleryStatusAction = {
  nextStatus: VerseStatus;
  label: string;
  icon: typeof Plus;
  successMessage: string;
};

type VersePreviewOverride = Partial<
  Pick<Verse, "status" | "masteryLevel" | "repetitions">
> & {
  lastReviewedAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
};

const MAX_MASTERY_LEVEL = TRAINING_STAGE_MASTERY_MAX;

type ModeId = TrainingModeId;
type TrainingModeMeta = (typeof MODE_PIPELINE)[ModeId];

type TrainingVerseState = {
  raw: Verse;
  key: string;
  telegramId: string | null;
  externalVerseId: string;
  status: DisplayVerseStatus;
  rawMasteryLevel: number;
  stageMasteryLevel: number;
  repetitions: number;
  lastModeId: ModeId | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

const MODE_PIPELINE: Record<ModeId, { label: string; description: string; renderer: TrainingModeRendererKey; badgeClass: string }> = {
  [TrainingModeId.ClickChunks]: {
    label: "Выбор частей",
    description: "Нажимайте куски стиха в правильной последовательности.",
    renderer: TrainingModeRendererKey.ChunksOrder,
    badgeClass: "border-lime-500/30 bg-lime-500/10 text-lime-700",
  },
  [TrainingModeId.ClickWordsHinted]: {
    label: "Выбор слов",
    description: "Часть слов уже открыта: нажимайте скрытые слова по порядку.",
    renderer: TrainingModeRendererKey.OrderHints,
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  },
  [TrainingModeId.ClickWordsNoHints]: {
    label: "Выбор слов (без подсказок)",
    description: "Нажимайте слова стиха по порядку без подсказок.",
    renderer: TrainingModeRendererKey.Order,
    badgeClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700",
  },
  [TrainingModeId.FirstLettersWithWordHints]: {
    label: "Выбор букв",
    description: "Часть слов открыта: нажимайте первые буквы скрытых слов.",
    renderer: TrainingModeRendererKey.LettersHints,
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
  [TrainingModeId.FirstLettersTapNoHints]: {
    label: "Выбор букв (без подсказок)",
    description: "Нажимайте первые буквы слов по порядку без подсказок.",
    renderer: TrainingModeRendererKey.LettersTap,
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  },
  [TrainingModeId.FirstLettersTyping]: {
    label: "Ввод букв",
    description: "Введите первые буквы слов по порядку.",
    renderer: TrainingModeRendererKey.LettersType,
    badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  },
  [TrainingModeId.FullRecall]: {
    label: "Полный ввод",
    description: "Полный ввод стиха по памяти.",
    renderer: TrainingModeRendererKey.Typing,
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  },
};

const SCORE_BY_RATING: Record<Rating, number> = { 0: 35, 1: 60, 2: 84, 3: 96 };
const MASTERY_DELTA_BY_RATING: Record<Rating, number> = { 0: -1, 1: 0, 2: 1, 3: 2 };
const MODE_SHIFT_BY_RATING: Record<Rating, number> = TRAINING_MODE_SHIFT_BY_RATING;
const SPACED_REPETITION_MS: Record<number, number> = {
  0: 10 * 60 * 1000,
  1: 60 * 60 * 1000,
  2: 6 * 60 * 60 * 1000,
  3: 24 * 60 * 60 * 1000,
  4: 3 * 24 * 60 * 60 * 1000,
  5: 3 * 24 * 60 * 60 * 1000,
  6: 3 * 24 * 60 * 60 * 1000,
  7: 3 * 24 * 60 * 60 * 1000,
  8: 3 * 24 * 60 * 60 * 1000,
};

function haptic(style: HapticStyle) {
  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (!tg) return;
    if (style === "success" || style === "error" || style === "warning") tg.notificationOccurred(style);
    else tg.impactOccurred(style);
  } catch {}
}

function getGalleryStatusAction(status: DisplayVerseStatus): GalleryStatusAction | null {
  if (status === VerseStatus.NEW) {
    return { nextStatus: VerseStatus.LEARNING, label: "Добавить в изучение", icon: Plus, successMessage: "Добавлено в изучение" };
  }
  if (status === VerseStatus.LEARNING || status === "WAITING" || status === "REVIEW" || status === "MASTERED") {
    return { nextStatus: VerseStatus.STOPPED, label: "Поставить на паузу", icon: Pause, successMessage: "Пауза включена" };
  }
  if (status === VerseStatus.STOPPED) {
    return { nextStatus: VerseStatus.LEARNING, label: "Возобновить изучение", icon: Play, successMessage: "Возобновлено" };
  }
  return null;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeVerseStatus(status: Verse["status"]): DisplayVerseStatus {
  return normalizeDisplayVerseStatus(status);
}

function normalizeRawMasteryLevel(raw: number | null | undefined): number {
  return normalizeSharedRawMasteryLevel(raw);
}

function toStageMasteryLevel(rawMasteryLevel: number) {
  return toTrainingStageMasteryLevel(rawMasteryLevel);
}

function masteryToProgress(stageMasteryLevel: number) {
  return Math.round((clamp(stageMasteryLevel, 0, MAX_MASTERY_LEVEL) / MAX_MASTERY_LEVEL) * 100);
}

function getVerseIdentity(verse: Pick<Verse, "id" | "externalVerseId">) {
  return String(verse.externalVerseId ?? verse.id);
}

function toTrainingVerseState(verse: Verse): TrainingVerseState | null {
  const externalVerseId = String(verse.externalVerseId ?? verse.id ?? "").trim();
  const text = String(verse.text ?? "").trim();
  if (!externalVerseId || !text) return null;
  const rawMasteryLevel = normalizeRawMasteryLevel(verse.masteryLevel);
  const rawLastModeId = (verse as any).lastTrainingModeId;
  const lastModeId =
    typeof rawLastModeId === "number" && rawLastModeId >= 1 && rawLastModeId <= 7
      ? (rawLastModeId as ModeId)
      : null;
  return {
    raw: verse,
    key: getVerseIdentity(verse),
    telegramId: (verse as any).telegramId ? String((verse as any).telegramId) : null,
    externalVerseId,
    status: normalizeVerseStatus(verse.status),
    rawMasteryLevel,
    stageMasteryLevel: toStageMasteryLevel(rawMasteryLevel),
    repetitions: Math.max(0, Math.round(verse.repetitions ?? 0)),
    lastModeId,
    lastReviewedAt: parseDate((verse as any).lastReviewedAt),
    nextReviewAt: parseDate((verse as any).nextReviewAt ?? (verse as any).nextReview),
  };
}
function isTrainingEligibleVerse(verse: TrainingVerseState) {
  return verse.status === VerseStatus.LEARNING || verse.status === "REVIEW";
}

function isTrainingReviewVerse(verse: Pick<TrainingVerseState, "status">) {
  return verse.status === "REVIEW" || verse.status === "MASTERED";
}

function matchesTrainingSubsetFilter(
  verse: TrainingVerseState,
  filter: TrainingSubsetFilter
) {
  if (filter === "all") return isTrainingEligibleVerse(verse);
  if (filter === "review") return isTrainingReviewVerse(verse);
  return verse.status === VerseStatus.LEARNING;
}

function chooseModeId(verse: TrainingVerseState): ModeId {
  return chooseTrainingModeId({
    rawMasteryLevel: verse.rawMasteryLevel,
    stageMasteryLevel: verse.stageMasteryLevel,
    lastModeId: verse.lastModeId,
  });
}

function getModeByShiftInProgressOrder(modeId: ModeId, shift: number): ModeId | null {
  return getTrainingModeByShiftInProgressOrder(modeId, shift);
}

function calcNextReviewAt(masteryLevel: number, score: number): Date {
  const base = SPACED_REPETITION_MS[clamp(masteryLevel, 0, MAX_MASTERY_LEVEL)] ?? SPACED_REPETITION_MS[0];
  const multiplier = score >= 92 ? 1.25 : score >= 80 ? 1 : score >= 65 ? 0.75 : 0.5;
  return new Date(Date.now() + Math.round(base * multiplier));
}

function deriveTrainingDisplayStatus(params: {
  baseStatus: VerseStatus;
  masteryLevel: number;
  repetitions: number;
  nextReviewAt: Date | null;
}): DisplayVerseStatus {
  const { baseStatus, masteryLevel, repetitions, nextReviewAt } = params;
  if (baseStatus === VerseStatus.NEW) return VerseStatus.NEW;
  if (baseStatus === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  if (repetitions >= 5) return "MASTERED";
  if (masteryLevel >= MAX_MASTERY_LEVEL && nextReviewAt && nextReviewAt.getTime() > Date.now()) {
    return "WAITING";
  }
  if (masteryLevel >= MAX_MASTERY_LEVEL) return "REVIEW";
  return VerseStatus.LEARNING;
}

function getTrainingCompletionToastPayload(params: {
  wasReviewExercise: boolean;
  becameLearned: boolean;
  finalStatus: DisplayVerseStatus;
  reference: string;
}): TrainingCompletionToastCardPayload | null {
  const { wasReviewExercise, becameLearned, finalStatus, reference } = params;

  if (wasReviewExercise) {
    if (finalStatus === "MASTERED") {
      return {
        id: Date.now(),
        reference,
        status: "MASTERED",
        title: "Стих выучен полностью",
        description: "Стих полностью завершен. Посмотреть можно в главном списке стихов.",
      };
    }
    if (finalStatus === "WAITING") {
      return {
        id: Date.now(),
        reference,
        status: "WAITING",
        title: "Переведён в ожидание повторения",
        description: "Следующее повторение станет доступно завтра.",
      };
    }
    if (finalStatus === "REVIEW") {
      return {
        id: Date.now(),
        reference,
        status: "REVIEW",
        title: "Стих повторён",
        description: "Повторение сохранено. Можно продолжать тренировку.",
      };
    }
    return {
      id: Date.now(),
      reference,
      status: finalStatus,
      title: "Стих повторён",
      description: "Повторение сохранено. Можно продолжать тренировку.",
    };
  }

  if (!becameLearned) return null;

  if (finalStatus === "MASTERED") {
    return {
      id: Date.now(),
      reference,
      status: "MASTERED",
      title: "Стих выучен полностью",
      description: "Стих полностью завершен. Посмотреть можно в главном списке стихов.",
    };
  }
  if (finalStatus === "WAITING") {
    return {
      id: Date.now(),
      reference,
      status: "WAITING",
      title: "Переведён в ожидание повторения",
      description: "Можно будет повторить завтра.",
    };
  }
  return {
    id: Date.now(),
    reference,
    status: "LEARNING",
    title: "Стих изучен",
    description: "Этап изучения сохранён. Переходите к следующему стиху.",
  };
}

function getTelegramId(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem("telegramId");
  if (fromStorage) return fromStorage;
  const tgUserId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return tgUserId ? String(tgUserId) : null;
}

function patchStatusForTrainingVerse(verse: TrainingVerseState): "NEW" | "LEARNING" | "STOPPED" {
  if (verse.status === VerseStatus.STOPPED) return "STOPPED";
  return verse.rawMasteryLevel > 0 ? "LEARNING" : "NEW";
}

async function persistTrainingVerseProgress(
  verse: TrainingVerseState,
  options?: { includeRepetitions?: boolean }
): Promise<Record<string, unknown> | null> {
  const telegramId = verse.telegramId ?? getTelegramId();
  if (!telegramId) return null;
  const response = await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, {
    masteryLevel: verse.rawMasteryLevel,
    ...(options?.includeRepetitions ? { repetitions: verse.repetitions } : {}),
    lastReviewedAt: verse.lastReviewedAt?.toISOString(),
    nextReviewAt: verse.nextReviewAt?.toISOString(),
    lastTrainingModeId: verse.lastModeId ?? null,
    status: patchStatusForTrainingVerse(verse),
  });
  return (response ?? null) as unknown as Record<string, unknown> | null;
}

function asLegacyVerse(verse: TrainingVerseState): LegacyVerse {
  const progress = masteryToProgress(verse.stageMasteryLevel);
  return {
    id: verse.key,
    reference: verse.raw.reference,
    text: verse.raw.text,
    translation: (verse.raw as any).translation ?? "SYNOD",
    testament: "NT",
    tags: [],
    masteryLevel: progress,
    nextReview: verse.nextReviewAt ?? new Date(),
    totalReviews: verse.repetitions,
    correctReviews: Math.round((progress / 100) * Math.max(1, verse.repetitions)),
  };
}

function getCreatedAtMs(verse: Verse) {
  return parseDate((verse as any).createdAt)?.getTime() ?? 0;
}

function sortByCreatedAtDesc(list: Verse[]) {
  return [...list].sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a));
}

function mergePreviewOverrides(verse: Verse, overrides: Map<string, VersePreviewOverride>) {
  const patch = overrides.get(getVerseIdentity(verse));
  return patch ? ({ ...verse, ...patch } as Verse) : verse;
}

function toPreviewOverrideFromVersePatch(patch: VerseMutablePatch): VersePreviewOverride {
  const next: VersePreviewOverride = {};
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.masteryLevel !== undefined) next.masteryLevel = patch.masteryLevel ?? 0;
  if (patch.repetitions !== undefined) next.repetitions = patch.repetitions ?? 0;
  if (patch.lastReviewedAt !== undefined) next.lastReviewedAt = patch.lastReviewedAt ?? null;
  if (patch.nextReviewAt !== undefined) next.nextReviewAt = patch.nextReviewAt ?? null;
  return next;
}

function getDailyGoalPhaseLabel(phase: DailyGoalGalleryContext['phase']) {
  if (phase === 'learning') return 'Изучение';
  if (phase === 'review') return 'Повторение';
  return 'Цель выполнена';
}

function getDailyGoalTargetKindHint(
  context: DailyGoalGalleryContext | undefined
): 'new' | 'review' | null {
  if (!context) return null;
  if (context.phase === 'learning') return 'new';
  if (context.phase === 'review') return 'review';
  return null;
}

function getDailyGoalPreferredTrainingSubset(
  context: DailyGoalGalleryContext | undefined
): TrainingSubsetFilter {
  if (!context) return "all";
  if (context.effectiveResumeMode === "learning") return "learning";
  if (context.effectiveResumeMode === "review") return "review";
  return "all";
}

function getDailyGoalResumeModeLabel(mode: DailyGoalResumeMode | null | undefined) {
  if (mode === "learning") return "Изучение";
  if (mode === "review") return "Повторение";
  return "Не выбран";
}

function getDailyGoalModeFromDisplayStatus(
  status: DisplayVerseStatus | null | undefined
): DailyGoalResumeMode | null {
  if (!status) return null;
  if (status === "REVIEW" || status === "MASTERED") return "review";
  if (status === VerseStatus.LEARNING) return "learning";
  return null;
}

function getDailyGoalPhasePillMeta(options: {
  mode: DailyGoalResumeMode;
  title: string;
  done: number;
  total: number;
  completed: boolean;
  isCurrentMode: boolean;
}) {
  const { mode, title, done, total, completed, isCurrentMode } = options;
  const accent =
    mode === "learning"
      ? {
          active: "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
          chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
          icon: "text-emerald-500",
        }
      : {
          active: "border-violet-500/35 bg-violet-500/12 text-violet-700 dark:text-violet-300",
          chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20",
          icon: "text-violet-500",
        };
  const className = completed
    ? "border-border/60 bg-background/65 text-muted-foreground"
    : isCurrentMode
      ? accent.active
      : "border-border/60 bg-background/60 text-muted-foreground";
  return {
    mode,
    title,
    progress: `${done}/${total}`,
    planCount: total,
    className,
    completed,
    isCurrentMode,
    chipClassName: accent.chip,
    iconClassName: completed ? "text-emerald-500" : isCurrentMode ? accent.icon : "text-muted-foreground/70",
  };
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

const SWIPE_HINT_KEY = "verse-swipe-hint-seen";

function SwipeHint({ panelMode }: { panelMode: PanelMode }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      return isTouch && !sessionStorage.getItem(SWIPE_HINT_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(SWIPE_HINT_KEY, "1"); } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [visible]);

  const hintText = panelMode === "training" ? "Свайп ↑↓ — стихи в изучении" : "Свайп ↑↓ — листать · кнопки — действия";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.35 }} className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: 2, duration: 0.8, ease: "easeInOut", delay: 0.3 }} className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-foreground/10 backdrop-blur-sm border border-border/30">
            <div className="flex flex-col items-center gap-0">
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{hintText}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const MAX_DOTS = 12;
const MAX_DOT_PROGRESS_TEXT_WIDTH_CLASS = "max-w-[46vw] sm:max-w-[240px]";
const EMULATED_DOT_COUNT = 15;

function DotProgress({ total, active }: { total: number; active: number }) {
  const safeTotal = Math.max(0, total);
  const safeActive = clamp(active, 0, Math.max(0, safeTotal - 1));
  const currentValue = safeTotal > 0 ? safeActive + 1 : 0;
  const isEmulated = safeTotal > MAX_DOTS;
  const dotCount = isEmulated ? EMULATED_DOT_COUNT : safeTotal;
  const activeDotIndex =
    dotCount <= 1 || safeTotal <= 1
      ? 0
      : Math.round((safeActive / (safeTotal - 1)) * (dotCount - 1));

  if (dotCount <= 0) {
    return (
      <div
        role="status"
        aria-label="Нет карточек"
        className="px-3 py-2.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg"
      >
        <div className="h-2 w-20 rounded-full bg-muted/40" />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={`Стих ${currentValue} из ${safeTotal}`}
      className={cn(
        "relative overflow-hidden rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg",
        isEmulated
          ? "w-[min(46vw,220px)] min-w-[146px] px-3 py-2.5"
          : "px-3 py-2.5"
      )}
    >
      {isEmulated && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-border/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background/95 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/95 to-transparent"
          />
        </>
      )}

      <div className={cn("relative flex items-center", isEmulated ? "w-full justify-between" : "gap-1.5")}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const isActiveDot = i === activeDotIndex;
          const distance = Math.abs(i - activeDotIndex);
          const compressedSize = distance >= 6 ? 4 : distance >= 4 ? 5 : 6;
          const baseDotSize = isEmulated ? compressedSize : 8;
          const baseOpacity = isEmulated ? clamp(0.95 - distance * 0.12, 0.18, 0.9) : 0.32;

          return (
            <div
              key={i}
              className={cn(
                "relative flex items-center justify-center",
                isEmulated ? "shrink-0" : ""
              )}
            >
              {isActiveDot ? (
                <>
                  <motion.span
                    aria-hidden="true"
                    className="absolute rounded-full bg-primary/28 blur-md pointer-events-none"
                    animate={{
                      width: isEmulated ? 20 : 24,
                      height: isEmulated ? 10 : 11,
                      opacity: [0.35, 0.5, 0.35],
                    }}
                    transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    layout
                    animate={{
                      width: isEmulated ? 18 : 20,
                      height: isEmulated ? 8 : 9,
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    className="relative rounded-full border border-primary/40 bg-gradient-to-r from-primary/80 via-primary to-primary/80 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_10px_rgba(0,0,0,0.22)]"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute left-[12%] right-[12%] top-[1px] h-[2px] rounded-full bg-white/28"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-[1px] left-[1px] w-[28%] rounded-full bg-white/10 blur-[1px]"
                    />
                  </motion.div>
                </>
              ) : (
                <motion.div
                  layout
                  animate={{
                    width: baseDotSize,
                    height: baseDotSize,
                    opacity: baseOpacity,
                    scale: isEmulated && distance >= 5 ? 0.95 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="rounded-full bg-muted-foreground/55"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const slideVariants = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.88 }),
  center: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 32 } as const },
  exit: (dir: number) => ({ y: dir > 0 ? "-18%" : "18%", opacity: 0, scale: 0.86, transition: { duration: 0.2, ease: "easeIn" } as const }),
};

type UnifiedViewportProps = {
  panelMode: PanelMode;
  previewVerse: Verse | null;
  activeIndex: number;
  actionPending: boolean;
  trainingActiveVerse: TrainingVerseState | null;
  trainingModeId: ModeId | null;
  trainingRendererRef: RefObject<TrainingModeRendererHandle | null>;
  onStartTraining: () => void | Promise<void>;
  onPreviewStatusAction: () => void | Promise<void>;
  onPreviewTouchStart: (e: TouchEvent<HTMLDivElement>) => void;
  onPreviewTouchEnd: (e: TouchEvent<HTMLDivElement>) => void;
  onTrainingSwipeStep: (step: 1 | -1) => void;
  onTrainingRate: (rating: Rating) => void | Promise<void>;
  dailyGoalGuideActive?: boolean;
};

function VerseGalleryUnifiedCardViewport({
  panelMode,
  previewVerse,
  activeIndex,
  actionPending,
  trainingActiveVerse,
  trainingModeId,
  trainingRendererRef,
  onStartTraining,
  onPreviewStatusAction,
  onPreviewTouchStart,
  onPreviewTouchEnd,
  onTrainingSwipeStep,
  onTrainingRate,
  dailyGoalGuideActive = false,
}: UnifiedViewportProps) {
  const isPreview = panelMode === "preview";
  const preview = isPreview ? previewVerse : null;
  const trainingVerse = !isPreview ? trainingActiveVerse : null;
  const activeTouchStart = isPreview ? onPreviewTouchStart : undefined;
  const activeTouchEnd = isPreview ? onPreviewTouchEnd : undefined;

  if (isPreview && !preview) return null;
  if (!isPreview && (!trainingVerse || !trainingModeId)) return null;

  const previewStatus = preview ? normalizeVerseStatus(preview.status) : null;
  const previewProgress = preview
    ? Math.min(Math.round(((Number(preview.masteryLevel ?? 0) / TRAINING_STAGE_MASTERY_MAX) * 100)), 100)
    : 0;
  const isPreviewReviewStage = preview
    ? previewStatus === "REVIEW" || previewStatus === "WAITING" || previewStatus === "MASTERED"
    : false;
  const isPreviewStoppedStage = previewStatus === VerseStatus.STOPPED;
  const isPreviewStoppedRepeatStage = Boolean(
    preview && isPreviewStoppedStage && Number(preview.repetitions ?? 0) > 0
  );
  const previewRepetitionsCount = preview ? Math.max(0, Number(preview.repetitions ?? 0)) : 0;
  const previewTone: VerseCardPreviewTone | undefined = preview
    ? previewStatus === VerseStatus.NEW
      ? "new"
      : previewStatus === VerseStatus.STOPPED
        ? "stopped"
        : previewStatus === "WAITING"
          ? "waiting"
        : previewStatus === "MASTERED"
          ? "mastered"
          : isPreviewReviewStage
          ? "review"
          : "learning"
    : undefined;
  const trainingProgress = trainingVerse
    ? Math.min(Math.round((Number(trainingVerse.raw.masteryLevel ?? 0) / TRAINING_STAGE_MASTERY_MAX) * 100), 100)
    : 0;
  const isTrainingReviewStage = trainingVerse
    ? trainingVerse.status === "REVIEW" || trainingVerse.status === "WAITING" || trainingVerse.status === "MASTERED"
    : false;
  const trainingRepetitionsCount = trainingVerse ? Math.max(0, Number(trainingVerse.repetitions ?? 0)) : 0;

  const isPreviewReviewAction = Boolean(isPreviewReviewStage);
  const isTrainingStartPrimaryAction = Boolean(
    preview &&
      previewStatus &&
      previewStatus !== VerseStatus.NEW &&
      previewStatus !== VerseStatus.STOPPED &&
      previewStatus !== "WAITING"
  );
  const previewPrimaryAction =
    !preview || !previewStatus
      ? null
      : previewStatus === VerseStatus.NEW
        ? {
            label: "Добавить в мои",
            ariaLabel: "Добавить стих в мои",
            icon: Plus,
            onClick: () => void onPreviewStatusAction(),
            className:
              "border border-sky-500/25 bg-gradient-to-r from-sky-500/18 to-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
          }
        : previewStatus === VerseStatus.STOPPED
          ? {
              label: "Возобновить",
              ariaLabel: "Возобновить изучение стиха",
              icon: Play,
              onClick: () => void onPreviewStatusAction(),
              className:
                "border border-rose-500/25 bg-gradient-to-r from-rose-500/16 to-rose-500/8 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300",
            }
          : previewStatus === "WAITING"
            ? {
                label: "Ожидание",
                ariaLabel: "Стих ожидает времени следующего повтора",
                icon: Clock3,
                onClick: () => {},
                disabled: true,
                className:
                  "border border-indigo-500/25 bg-gradient-to-r from-indigo-500/14 to-indigo-500/8 text-indigo-700 dark:text-indigo-300",
              }
          : isPreviewReviewAction
            ? {
                label: previewStatus === "MASTERED" ? "Выучен" : "Повторять",
                ariaLabel: previewStatus === "MASTERED" ? "Стих отмечен как выученный" : "Повторять этот стих",
                icon: previewStatus === "MASTERED" ? Trophy : Repeat,
                onClick: () => void onStartTraining(),
                className:
                  previewStatus === "MASTERED"
                    ? "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-yellow-400/10 text-amber-800 hover:bg-amber-500/22 dark:text-amber-300"
                    : "border border-violet-500/25 bg-gradient-to-r from-violet-500/18 to-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300",
              }
            : {
                label: "Учить",
                ariaLabel: "Учить этот стих",
                icon: Play,
                onClick: () => void onStartTraining(),
                className:
                  "border border-emerald-500/25 bg-gradient-to-r from-emerald-500/18 to-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
              };

  const previewProgressTone =
    previewTone === "stopped"
      ? {
          labelClass: "text-rose-700/75 dark:text-rose-300/80",
          valueClass: "text-rose-700 dark:text-rose-300",
          trackClass: "bg-rose-500/14",
          fillClass: "from-rose-500 to-rose-400/80",
        }
      : previewTone === "mastered"
        ? {
            labelClass: "text-amber-800/75 dark:text-amber-300/80",
            valueClass: "text-amber-800 dark:text-amber-300",
            trackClass: "bg-amber-500/14",
            fillClass: "from-amber-500 to-yellow-400/85",
          }
        : previewTone === "waiting"
          ? {
              labelClass: "text-indigo-700/75 dark:text-indigo-300/80",
              valueClass: "text-indigo-700 dark:text-indigo-300",
              trackClass: "bg-indigo-500/14",
              fillClass: "from-indigo-500 to-indigo-400/80",
            }
        : {
          labelClass: "text-emerald-700/75 dark:text-emerald-300/80",
          valueClass: "text-emerald-700 dark:text-emerald-300",
          trackClass: "bg-emerald-500/14",
          fillClass: "from-emerald-500 to-emerald-400/80",
        };

  const previewRepeatTone =
    previewTone === "stopped"
      ? {
          wrapperClass: "border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-background",
          iconWrapClass:
            "border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300",
          titleClass: "text-rose-700/80 dark:text-rose-300/80",
          valueClass: "text-rose-700 dark:text-rose-300",
          title: "На паузе",
          icon: Repeat,
        }
      : previewTone === "mastered"
        ? {
            wrapperClass: "border-amber-500/25 bg-gradient-to-r from-amber-500/12 via-amber-500/6 to-background",
            iconWrapClass:
              "border-amber-500/30 bg-amber-500/14 text-amber-800 dark:text-amber-300",
            titleClass: "text-amber-800/80 dark:text-amber-300/80",
            valueClass: "text-amber-800 dark:text-amber-300",
            title: "Выучено",
            icon: Trophy,
          }
        : {
          wrapperClass: "border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-background",
          iconWrapClass:
            "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300",
          titleClass: "text-violet-700/80 dark:text-violet-300/80",
          valueClass: "text-violet-700 dark:text-violet-300",
          title: "Повторение",
          icon: Repeat,
        };

  const trainingLegacyVerse = trainingVerse ? asLegacyVerse(trainingVerse) : null;

  return (
    <div onTouchStart={activeTouchStart} onTouchEnd={activeTouchEnd} className="w-full">
      <VerseCard
        isActive
        minHeight="training"
        previewTone={isPreview ? previewTone : undefined}
        onVerticalSwipeStep={!isPreview ? onTrainingSwipeStep : undefined}
        header={
          isPreview && preview ? (
            <div className="flex-shrink-0 text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-serif italic text-primary/90 font-bold">
                {preview.reference}
              </h2>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto" />
            </div>
          ) : trainingVerse ? (
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif italic text-primary/90 font-bold">
                {trainingVerse.raw.reference}
              </h2>
              <div className="mx-auto">
                {isTrainingReviewStage ? (
                  <motion.div
                    key={`review-${trainingVerse.key}-${trainingRepetitionsCount}`}
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex items-center gap-2 rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-500/12 to-violet-500/5 px-2.5 py-1.5 backdrop-blur-sm"
                  >
                    <div className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300">
                      <Repeat className="h-3 w-3" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-700/85 dark:text-violet-300/90">
                        Повторение
                      </span>
                      <span className="h-3.5 w-px bg-violet-500/20" aria-hidden="true" />
                      <span className="text-[11px] font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                        {trainingRepetitionsCount} повт.
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`learn-${trainingVerse.key}-${trainingProgress}`}
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 backdrop-blur-sm"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80 dark:text-emerald-300/90">
                      Освоение
                    </span>
                    <div
                      role="progressbar"
                      aria-label="Прогресс освоения"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={trainingProgress}
                      className="relative h-1 w-16 overflow-hidden rounded-full bg-emerald-500/15"
                    >
                      <motion.div
                        key={`${trainingVerse.raw.id}-${trainingProgress}`}
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${trainingProgress}%` }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {trainingProgress}%
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          ) : null
        }
        body={
          isPreview && preview ? (
            <div className="h-full flex items-center justify-center overflow-hidden px-2">
              <p className="text-xl sm:text-2xl leading-relaxed text-foreground/90 italic text-center line-clamp-[9] font-light">
                «{preview.text}»
              </p>
            </div>
          ) : trainingLegacyVerse && trainingModeId ? (
            <div className="relative h-full">
              <TrainingModeRenderer
                ref={trainingRendererRef as unknown as RefObject<TrainingModeRendererHandle>}
                renderer={MODE_PIPELINE[trainingModeId].renderer}
                verse={trainingLegacyVerse}
                onRate={onTrainingRate}
              />
            </div>
          ) : null
        }
        bodyScrollable={!isPreview}
        contentClassName={!isPreview ? "pb-2" : undefined}
        centerAction={
          isPreview && preview ? (
            <Button
              variant="secondary"
              className={cn(
                "gap-2 min-w-[200px] shadow-lg rounded-2xl backdrop-blur-sm",
                previewPrimaryAction?.className
              )}
              onClick={previewPrimaryAction?.onClick}
              disabled={actionPending || Boolean(previewPrimaryAction?.disabled)}
              aria-label={previewPrimaryAction?.ariaLabel}
              data-tour-id={
                dailyGoalGuideActive && isTrainingStartPrimaryAction
                  ? "daily-goal-gallery-train-button"
                  : undefined
              }
            >
              {previewPrimaryAction ? <previewPrimaryAction.icon className="h-4 w-4" /> : null}
              {previewPrimaryAction?.label}
            </Button>
          ) : null
        }
        footer={
          isPreview && preview ? (
            previewStatus === VerseStatus.NEW ? null : (isPreviewReviewStage || isPreviewStoppedRepeatStage) ? (
              <motion.div
                key={`preview-repeat-footer-${preview.id}-${previewStatus}-${previewRepetitionsCount}`}
                initial={{ opacity: 0, y: 6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn("rounded-2xl border p-3 shadow-sm", previewRepeatTone.wrapperClass)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl border", previewRepeatTone.iconWrapClass)}>
                      <previewRepeatTone.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", previewRepeatTone.titleClass)}>
                        {previewRepeatTone.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Повторы
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-2xl font-bold tabular-nums", previewRepeatTone.valueClass)}>
                      {previewRepetitionsCount}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className={cn("text-[10px] font-bold uppercase tracking-[0.3em]", previewProgressTone.labelClass)}>
                    {previewStatus === VerseStatus.STOPPED ? "Прогресс" : "Прогресс освоения"}
                  </span>
                  <span className={cn("text-2xl font-bold", previewProgressTone.valueClass)}>{previewProgress}%</span>
                </div>
                <div className={cn("relative h-2 rounded-full overflow-hidden", previewProgressTone.trackClass)}>
                  <motion.div
                    key={`${preview.id}-${activeIndex}`}
                    className={cn("absolute inset-y-0 left-0 bg-gradient-to-r rounded-full", previewProgressTone.fillClass)}
                    initial={{ width: 0 }}
                    animate={{ width: `${previewProgress}%` }}
                    transition={{ duration: 0.85, ease: [0.34, 1.56, 0.64, 1] }}
                  />
                </div>
              </div>
            )
          ) : null
        }
      />
    </div>
  );
}

function DailyGoalTrainingLoadingView() {
  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-[1.75rem] border border-border/60 bg-background/95 shadow-xl backdrop-blur-xl">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-semibold leading-snug">
                  Подготавливаем тренировку
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Подбираем упражнения и включаем нужный режим.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between text-[0.7rem] text-muted-foreground">
                <span>Загрузка упражнений</span>
                <span className="font-medium text-foreground/80">Почти готово</span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted/35">
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-y-0 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                  initial={{ x: "-45%", width: "60%" }}
                  animate={{ x: ["-45%", "10%", "85%"], width: ["60%", "68%", "58%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>

            <div aria-hidden="true" className="mt-4 rounded-xl border border-border/40 bg-background/70 p-3">
              <div className="mb-2 h-3.5 w-32 rounded-full bg-muted/45 animate-pulse" />
              <div className="space-y-2">
                <div className="h-2.5 w-full rounded-full bg-muted/30 animate-pulse" />
                <div className="h-2.5 w-4/5 rounded-full bg-muted/20 animate-pulse [animation-delay:120ms]" />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export function VerseGallery({
  verses,
  initialIndex,
  autoStartTrainingOnOpen = false,
  onClose,
  onStatusChange,
  onVersePatched,
  onDelete,
  previewTotalCount = verses.length,
  previewHasMore = false,
  previewIsLoadingMore = false,
  onRequestMorePreviewVerses,
  dailyGoalContext,
  onBeforeStartTrainingFromGalleryVerse,
  onDailyGoalProgressEvent,
  onDailyGoalJumpToVerseRequest,
  onDailyGoalPreferredResumeModeChange,
}: VerseGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [panelMode, setPanelMode] = useState<PanelMode>("preview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [trainingCompletionToast, setTrainingCompletionToast] =
    useState<TrainingCompletionToastCardPayload | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [previewOverrides, setPreviewOverrides] = useState<Map<string, VersePreviewOverride>>(() => new Map());

  const [trainingVerses, setTrainingVerses] = useState<TrainingVerseState[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingModeId, setTrainingModeId] = useState<ModeId | null>(null);
  const [trainingSubsetFilter, setTrainingSubsetFilter] = useState<TrainingSubsetFilter>("all");
  const [isAutoStartingTraining, setIsAutoStartingTraining] = useState(() => autoStartTrainingOnOpen);
  const previewTouchStartRef = useRef<VerticalTouchSwipeStart | null>(null);
  const trainingRendererRef = useRef<TrainingModeRendererHandle | null>(null);
  const autoStartedTrainingRef = useRef(false);
  const hasUserChosenTrainingSubsetRef = useRef(false);
  const hasAutoAppliedDailyGoalSubsetRef = useRef(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { contentSafeAreaInset, isInTelegram } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const [slideAnnouncement, setSlideAnnouncement] = useState("");
  const previewDisplayTotal = Math.max(previewTotalCount, verses.length, 1);

  const previewActiveVerseBase = verses[activeIndex] ?? null;
  const previewActiveVerse = previewActiveVerseBase ? mergePreviewOverrides(previewActiveVerseBase, previewOverrides) : null;
  const dailyGoalGuideActive = Boolean(
    dailyGoalContext?.showGuideBanner &&
      (dailyGoalContext.phase === 'learning' || dailyGoalContext.phase === 'review')
  );
  const dailyGoalPreferredTrainingSubset = getDailyGoalPreferredTrainingSubset(dailyGoalContext);
  const closeTrainingGoesToPreview = !autoStartTrainingOnOpen;
  const dailyGoalPhaseLabel = dailyGoalContext ? getDailyGoalPhaseLabel(dailyGoalContext.phase) : null;
  const dailyGoalNextTargetReference = dailyGoalContext?.nextTargetVerseId
    ? verses.find((verse) => getVerseIdentity(verse) === dailyGoalContext.nextTargetVerseId)?.reference ?? null
    : null;
  const dailyGoalLearningTotalCount = dailyGoalContext?.progressCounts.newTotal ?? 0;
  const dailyGoalLearningCompletedCount = dailyGoalContext?.progressCounts.newDone ?? 0;
  const dailyGoalReviewTotalCount = dailyGoalContext?.progressCounts.reviewTotal ?? 0;
  const dailyGoalReviewCompletedCount = dailyGoalContext?.progressCounts.reviewDone ?? 0;
  const dailyGoalEffectiveResumeMode = dailyGoalContext?.effectiveResumeMode ?? null;
  const dailyGoalShowReviewStage = Boolean(dailyGoalContext?.phaseStates.review.enabled);
  const currentCardDailyGoalMode =
    panelMode === "training"
      ? getDailyGoalModeFromDisplayStatus(trainingVerses[trainingIndex]?.status ?? null)
      : getDailyGoalModeFromDisplayStatus(previewActiveVerse ? normalizeVerseStatus(previewActiveVerse.status) : null);
  const dailyGoalCurrentExecutionMode: DailyGoalResumeMode | null =
    panelMode === "training"
      ? trainingSubsetFilter === "all"
        ? currentCardDailyGoalMode ?? dailyGoalEffectiveResumeMode
        : trainingSubsetFilter
      : currentCardDailyGoalMode ?? dailyGoalEffectiveResumeMode;
  const dailyGoalLearningPill = dailyGoalContext
    ? getDailyGoalPhasePillMeta({
        mode: "learning",
        title: "Изучение",
        done: dailyGoalContext.phaseStates.learning.done,
        total: dailyGoalContext.phaseStates.learning.total,
        completed: dailyGoalContext.phaseStates.learning.completed,
        isCurrentMode:
          panelMode === "training" &&
          dailyGoalCurrentExecutionMode === "learning" &&
          !dailyGoalContext.phaseStates.learning.completed,
      })
    : null;
  const dailyGoalReviewPill =
    dailyGoalContext && dailyGoalShowReviewStage
      ? getDailyGoalPhasePillMeta({
          mode: "review",
          title: "Повторение",
          done: dailyGoalContext.phaseStates.review.done,
          total: dailyGoalContext.phaseStates.review.total,
          completed: dailyGoalContext.phaseStates.review.completed,
          isCurrentMode:
            panelMode === "training" &&
            dailyGoalCurrentExecutionMode === "review" &&
            !dailyGoalContext.phaseStates.review.completed,
        })
      : null;

  const trainingEligibleIndices = useMemo(
    () =>
      trainingVerses
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
        .map(({ index }) => index),
    [trainingVerses, trainingSubsetFilter]
  );

  const trainingActiveVerse = panelMode === "training" ? trainingVerses[trainingIndex] ?? null : null;
  const displayVerse = panelMode === "training" && trainingActiveVerse ? trainingActiveVerse.raw : previewActiveVerse;
  const isTrainingAutoStartOverlayVisible = isAutoStartingTraining && panelMode === "preview";

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (verses.length === 0) return;
    setActiveIndex((prev) => clamp(prev, 0, Math.max(0, verses.length - 1)));
  }, [verses.length]);

  useEffect(() => {
    if (panelMode !== "training") return;
    if (!trainingActiveVerse) {
      setPanelMode("preview");
      setTrainingModeId(null);
    }
  }, [panelMode, trainingActiveVerse]);

  useEffect(() => {
    if (!displayVerse) return;
    const total = panelMode === "training" ? Math.max(trainingEligibleIndices.length, 1) : previewDisplayTotal;
    const position = panelMode === "training"
      ? Math.max(1, trainingEligibleIndices.indexOf(trainingIndex) + 1)
      : activeIndex + 1;
    setSlideAnnouncement(`Стих ${position} из ${Math.max(total, 1)}: ${displayVerse.reference}`);
  }, [displayVerse, panelMode, trainingEligibleIndices, trainingIndex, activeIndex, previewDisplayTotal]);

  useEffect(() => {
    if (panelMode !== "training") return;
    if (trainingEligibleIndices.length > 0) {
      if (!trainingEligibleIndices.includes(trainingIndex)) {
        const nextIndex = trainingEligibleIndices[0];
        const nextVerse = trainingVerses[nextIndex];
        if (!nextVerse) return;
        setTrainingIndex(nextIndex);
        setTrainingModeId(chooseModeId(nextVerse));
      }
      return;
    }

    if (trainingSubsetFilter !== "all") {
      toast.info("Нет стихов для выбранного режима", {
        description: "Переключаем обратно на «Все».",
      });
      setTrainingSubsetFilter("all");
      return;
    }

    if (trainingVerses.some(isTrainingEligibleVerse)) {
      const nextIndex = trainingVerses.findIndex(isTrainingEligibleVerse);
      if (nextIndex >= 0) {
        const nextVerse = trainingVerses[nextIndex];
        setTrainingIndex(nextIndex);
        setTrainingModeId(chooseModeId(nextVerse));
      }
    }
  }, [panelMode, trainingEligibleIndices, trainingIndex, trainingSubsetFilter, trainingVerses]);

  useEffect(() => {
    if (panelMode !== "training") return;
    if (!dailyGoalGuideActive) return;
    if (dailyGoalPreferredTrainingSubset === "all") return;
    if (hasUserChosenTrainingSubsetRef.current) return;
    if (hasAutoAppliedDailyGoalSubsetRef.current) return;
    // Do not override an explicit subset chosen by the user (or selected card at start).
    if (trainingSubsetFilter !== "all") return;
    hasAutoAppliedDailyGoalSubsetRef.current = true;
    setTrainingSubsetFilter(dailyGoalPreferredTrainingSubset);
    toast.info(
      dailyGoalPreferredTrainingSubset === "learning"
        ? "Этап ежедневной цели: изучение"
        : "Этап ежедневной цели: повторение",
      {
        description:
          dailyGoalPreferredTrainingSubset === "learning"
            ? "Фильтр тренировки переключен на «Изучение»."
            : "Фильтр тренировки переключен на «Повторение».",
      }
    );
  }, [panelMode, dailyGoalGuideActive, dailyGoalPreferredTrainingSubset, trainingSubsetFilter]);

  useEffect(() => {
    if (panelMode === "training") {
      setIsAutoStartingTraining(false);
      return;
    }
    setTrainingCompletionToast(null);
  }, [panelMode]);

  const showFeedback = useCallback((message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  const showTrainingCompletionToast = useCallback((payload: TrainingCompletionToastCardPayload) => {
    setTrainingCompletionToast(payload);
  }, []);

  const dismissTrainingCompletionToast = useCallback(() => {
    setTrainingCompletionToast(null);
  }, []);

  const applyUserTrainingSubsetFilter = useCallback(
    (nextFilter: TrainingSubsetFilter) => {
      hasUserChosenTrainingSubsetRef.current = true;
      hasAutoAppliedDailyGoalSubsetRef.current = true;
      setTrainingSubsetFilter((prev) => (prev === nextFilter ? prev : nextFilter));
      if (nextFilter === "learning" || nextFilter === "review") {
        onDailyGoalPreferredResumeModeChange?.(nextFilter);
      }
    },
    [onDailyGoalPreferredResumeModeChange]
  );

  const setPreviewOverride = useCallback((verse: Verse, patch: VersePreviewOverride) => {
    const key = getVerseIdentity(verse);
    setPreviewOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, { ...(next.get(key) ?? {}), ...patch });
      return next;
    });
  }, []);

  const navigatePreviewTo = useCallback(async (dir: "prev" | "next") => {
    const newDir = dir === "next" ? 1 : -1;
    if (dir === "next") {
      if (activeIndex < verses.length - 1) {
        haptic("light");
        setDirection(newDir);
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, verses.length - 1)));
        return;
      }

      if (!previewHasMore || previewIsLoadingMore || !onRequestMorePreviewVerses) {
        return;
      }

      const didLoadMore = await onRequestMorePreviewVerses();
      if (!didLoadMore) return;

      haptic("light");
      setDirection(newDir);
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, verses.length)));
      return;
    }

    const newIndex = Math.max(0, activeIndex - 1);
    if (newIndex === activeIndex) return;
    haptic("light");
    setDirection(newDir);
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, [activeIndex, verses.length, previewHasMore, previewIsLoadingMore, onRequestMorePreviewVerses]);

  const syncPreviewIndexToVerse = useCallback((target: TrainingVerseState | Verse | null | undefined) => {
    if (!target) return;
    const key = "raw" in target ? target.key : getVerseIdentity(target);
    const nextIndex = verses.findIndex((v) => getVerseIdentity(v) === key);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }, [verses]);

  const exitTrainingMode = useCallback((target?: TrainingVerseState | null) => {
    syncPreviewIndexToVerse(target ?? trainingActiveVerse);
    setDirection(0);
    setPanelMode("preview");
    setTrainingModeId(null);
  }, [syncPreviewIndexToVerse, trainingActiveVerse]);

  const handleTrainingBackAction = useCallback(() => {
    if (trainingRendererRef.current?.handleBackAction()) {
      return;
    }
    if (!closeTrainingGoesToPreview) {
      onClose();
      return;
    }
    exitTrainingMode();
  }, [closeTrainingGoesToPreview, exitTrainingMode, onClose]);

  const jumpToAdjacentTrainingVerse = useCallback((delta: -1 | 1) => {
    if (panelMode !== "training") return;
    if (!trainingActiveVerse) return;
    if (trainingEligibleIndices.length <= 1) return;
    const currentPos = trainingEligibleIndices.indexOf(trainingIndex);

    let nextIndex: number | undefined;
    if (currentPos >= 0) {
      const nextPos = currentPos + delta;
      if (nextPos < 0 || nextPos >= trainingEligibleIndices.length) return;
      nextIndex = trainingEligibleIndices[nextPos];
    } else {
      // Current verse may temporarily fall out of the selected filter after rating.
      // Keep manual navigation working by jumping to the nearest eligible verse.
      if (delta > 0) {
        nextIndex = trainingEligibleIndices.find((idx) => idx > trainingIndex) ?? trainingEligibleIndices[0];
      } else {
        nextIndex = [...trainingEligibleIndices].reverse().find((idx) => idx < trainingIndex) ?? trainingEligibleIndices[trainingEligibleIndices.length - 1];
      }
    }

    const nextVerse = trainingVerses[nextIndex];
    if (!nextVerse) return;
    setDirection(delta > 0 ? 1 : -1);
    setTrainingIndex(nextIndex);
    setTrainingModeId(chooseModeId(nextVerse));
    haptic("medium");
  }, [panelMode, trainingActiveVerse, trainingEligibleIndices, trainingIndex, trainingVerses]);

  const removeCompletedTrainingVerseAndNavigate = useCallback((delta: -1 | 1) => {
    if (panelMode !== "training") return;
    if (!trainingActiveVerse) return;

    const currentKey = trainingActiveVerse.key;
    const nextList = trainingVerses.filter((verse) => verse.key !== currentKey);

    if (nextList.length === trainingVerses.length) {
      jumpToAdjacentTrainingVerse(delta);
      return;
    }

    if (nextList.length === 0) {
      setTrainingVerses([]);
      setTrainingIndex(0);
      setTrainingModeId(null);
      haptic("light");
      return;
    }

    const candidateIndices = nextList
      .map((verse, index) => ({ verse, index }))
      .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
      .map(({ index }) => index);

    let nextIndex: number | null = null;
    if (candidateIndices.length > 0) {
      const pivot = delta > 0 ? trainingIndex : trainingIndex - 1;
      if (delta > 0) {
        nextIndex = candidateIndices.find((idx) => idx >= pivot) ?? candidateIndices[0] ?? null;
      } else {
        nextIndex = [...candidateIndices].reverse().find((idx) => idx <= pivot) ?? candidateIndices[candidateIndices.length - 1] ?? null;
      }
    } else {
      const fallbackEligible = nextList
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => isTrainingEligibleVerse(verse))
        .map(({ index }) => index);
      if (fallbackEligible.length > 0) {
        nextIndex = delta > 0 ? (fallbackEligible[0] ?? 0) : (fallbackEligible[fallbackEligible.length - 1] ?? 0);
        if (trainingSubsetFilter !== "all") {
          setTrainingSubsetFilter("all");
        }
      } else {
        nextIndex = Math.min(Math.max(delta > 0 ? trainingIndex : trainingIndex - 1, 0), nextList.length - 1);
      }
    }

    const nextVerse = nextIndex != null ? nextList[nextIndex] : nextList[0];
    setTrainingVerses(nextList);
    if (nextVerse) {
      const resolvedIndex = nextList.findIndex((verse) => verse.key === nextVerse.key);
      setDirection(delta > 0 ? 1 : -1);
      setTrainingIndex(resolvedIndex >= 0 ? resolvedIndex : 0);
      setTrainingModeId(chooseModeId(nextVerse));
    } else {
      setTrainingIndex(0);
      setTrainingModeId(null);
    }
    haptic("light");
  }, [
    jumpToAdjacentTrainingVerse,
    panelMode,
    trainingActiveVerse,
    trainingIndex,
    trainingSubsetFilter,
    trainingVerses,
  ]);

  const handleTrainingNavigationStep = useCallback((delta: -1 | 1) => {
    jumpToAdjacentTrainingVerse(delta);
  }, [jumpToAdjacentTrainingVerse]);

  const fetchLearningVersesForTraining = useCallback(async () => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      return sortByCreatedAtDesc(
        verses.filter((v) => {
          const status = normalizeVerseStatus(v.status);
          return status === VerseStatus.LEARNING || status === "REVIEW";
        })
      );
    }
    try {
      const response = (await fetchAllUserVerses({
        telegramId,
        status: VerseStatus.LEARNING,
        orderBy: "createdAt",
        order: "desc",
      })) as Array<Verse>;
      const filtered = response.filter((v) => {
        const status = normalizeVerseStatus(v.status);
        return status === VerseStatus.LEARNING || status === "REVIEW";
      });
      return sortByCreatedAtDesc(filtered);
    } catch (error) {
      console.error("Не удалось загрузить стихи LEARNING:", error);
      return sortByCreatedAtDesc(
        verses.filter((v) => {
          const status = normalizeVerseStatus(v.status);
          return status === VerseStatus.LEARNING || status === "REVIEW";
        })
      );
    }
  }, [verses]);

  const startTrainingFromActiveVerse = useCallback(async (forcedSubset?: DailyGoalResumeMode) => {
    if (actionPending || !previewActiveVerse) return false;
    if (onBeforeStartTrainingFromGalleryVerse) {
      const decision = await onBeforeStartTrainingFromGalleryVerse(previewActiveVerse);
      if (decision.kind === 'redirect') {
        toast.info(decision.message);
        const targetIndex = verses.findIndex(
          (verse) => getVerseIdentity(verse) === String(decision.targetVerseId)
        );
        if (targetIndex >= 0) {
          setDirection(targetIndex > activeIndex ? 1 : -1);
          setActiveIndex(targetIndex);
        } else {
          onDailyGoalJumpToVerseRequest?.(decision.targetVerseId);
          onClose();
        }
        return false;
      }
      if (decision.kind === 'warn') {
        toast.info(decision.message);
      }
    }
    try {
      setActionPending(true);
      let startVerse = previewActiveVerse;
      const activeDisplayStatus = normalizeVerseStatus(previewActiveVerse.status);
      if (activeDisplayStatus === VerseStatus.NEW || activeDisplayStatus === VerseStatus.STOPPED) {
        await onStatusChange(previewActiveVerse, VerseStatus.LEARNING);
        setPreviewOverride(previewActiveVerse, { status: VerseStatus.LEARNING });
        startVerse = { ...previewActiveVerse, status: VerseStatus.LEARNING } as Verse;
      }
      let learningRaw = await fetchLearningVersesForTraining();
      let normalized = learningRaw.map(toTrainingVerseState).filter((v): v is TrainingVerseState => v !== null);
      const startKey = getVerseIdentity(startVerse);
      if (!normalized.some((v) => v.key === startKey)) {
        const fallback = toTrainingVerseState(startVerse);
        if (fallback && (fallback.status === VerseStatus.LEARNING || fallback.status === "REVIEW")) normalized = [fallback, ...normalized];
      }
      if (!normalized.some((v) => v.status === VerseStatus.LEARNING || v.status === "REVIEW")) {
        showFeedback("Нет стихов в изучении", "error");
        return false;
      }
      const selectedSubsetHint: TrainingSubsetFilter =
        activeDisplayStatus === "REVIEW" || activeDisplayStatus === "MASTERED"
          ? "review"
          : activeDisplayStatus === VerseStatus.LEARNING
            ? "learning"
            : "all";
      const preferredSubset: TrainingSubsetFilter =
        forcedSubset === "learning" || forcedSubset === "review"
          ? forcedSubset
          : selectedSubsetHint !== "all"
          ? selectedSubsetHint
          : dailyGoalGuideActive && dailyGoalPreferredTrainingSubset !== "all"
            ? dailyGoalPreferredTrainingSubset
            : "all";
      const activeVerseMatchesPreferred =
        preferredSubset === "all"
          ? true
          : normalized.some(
              (v) => v.key === startKey && matchesTrainingSubsetFilter(v, preferredSubset)
            );

      const preferredEligibleIndex =
        preferredSubset === "all"
          ? -1
          : normalized.findIndex((v) => matchesTrainingSubsetFilter(v, preferredSubset));

      const rawStartIndex = activeVerseMatchesPreferred
        ? normalized.findIndex((v) => v.key === startKey)
        : preferredEligibleIndex;
      const startIndex = rawStartIndex >= 0 ? rawStartIndex : Math.max(0, normalized.findIndex((v) => v.key === startKey));
      const startState = normalized[startIndex] ?? normalized[0];
      hasUserChosenTrainingSubsetRef.current = false;
      hasAutoAppliedDailyGoalSubsetRef.current = preferredSubset !== "all";
      setTrainingVerses(normalized);
      setTrainingSubsetFilter(preferredSubset);
      if (preferredSubset === "learning" || preferredSubset === "review") {
        onDailyGoalPreferredResumeModeChange?.(preferredSubset);
      }
      setTrainingIndex(startIndex);
      setTrainingModeId(chooseModeId(startState));
      setPanelMode("training");
      setDirection(0);
      if (preferredSubset === "learning") {
        toast.info("Этап ежедневной цели: изучение", {
          description: "Тренировка открыта в режиме «Изучение».",
        });
      } else if (preferredSubset === "review") {
        toast.info("Этап ежедневной цели: повторение", {
          description: "Тренировка открыта в режиме «Повторение».",
        });
      }
      haptic("medium");
      return true;
    } catch {
      haptic("error");
      showFeedback("Ошибка — попробуйте ещё раз", "error");
      return false;
    } finally {
      setActionPending(false);
    }
  }, [
    activeIndex,
    actionPending,
    onBeforeStartTrainingFromGalleryVerse,
    onClose,
    onDailyGoalJumpToVerseRequest,
    previewActiveVerse,
    onStatusChange,
    setPreviewOverride,
    fetchLearningVersesForTraining,
    showFeedback,
    dailyGoalGuideActive,
    dailyGoalPreferredTrainingSubset,
    verses,
    onDailyGoalPreferredResumeModeChange,
  ]);

  const handleDailyGoalPillClick = useCallback(
    async (mode: DailyGoalResumeMode) => {
      haptic("light");
      if (panelMode === "preview") {
        await startTrainingFromActiveVerse(mode);
        return;
      }
      applyUserTrainingSubsetFilter(mode);
    },
    [applyUserTrainingSubsetFilter, panelMode, startTrainingFromActiveVerse]
  );

  useEffect(() => {
    if (!autoStartTrainingOnOpen) return;
    if (autoStartedTrainingRef.current) return;
    if (panelMode !== "preview") return;
    if (!previewActiveVerse) return;
    if (actionPending) return;

    autoStartedTrainingRef.current = true;
    setIsAutoStartingTraining(true);
    let cancelled = false;
    void (async () => {
      try {
        await startTrainingFromActiveVerse();
      } finally {
        if (!cancelled) {
          setIsAutoStartingTraining(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    autoStartTrainingOnOpen,
    panelMode,
    previewActiveVerse,
    actionPending,
    startTrainingFromActiveVerse,
  ]);

  const handlePreviewTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "preview" || isTrainingAutoStartOverlayVisible) return;
    previewTouchStartRef.current = createVerticalTouchSwipeStart(e);
  };

  const handlePreviewTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "preview" || isTrainingAutoStartOverlayVisible) return;
    const start = previewTouchStartRef.current;
    previewTouchStartRef.current = null;
    const step = getVerticalTouchSwipeStep(start, e);
    if (!step) return;
    void navigatePreviewTo(step > 0 ? "next" : "prev");
  };
  const handleTrainingRate = useCallback(async (rating: Rating) => {
    if (panelMode !== "training" || trainingModeId === null) return;
    const current = trainingVerses[trainingIndex];
    if (!current) return;

    const wasReviewExercise = isTrainingReviewVerse(current);
    const rawMasteryBefore = current.rawMasteryLevel;
    const masteryDelta = MASTERY_DELTA_BY_RATING[rating] ?? 0;
    const isLearningVerse = current.status === VerseStatus.LEARNING;
    const { rawMasteryAfter, graduatesToReview } = applyMasteryDelta({
      isLearningVerse,
      rawMasteryBefore,
      masteryDelta,
    });
    const canUpdateRepetitions = current.status === "REVIEW";
    const shouldIncrementRepetitions =
      canUpdateRepetitions && shouldCountTrainingRepetition(rating);
    const nextRepetitions = current.repetitions + (shouldIncrementRepetitions ? 1 : 0);
    const stageMasteryAfter = toStageMasteryLevel(rawMasteryAfter);
    const now = new Date();
    const score = SCORE_BY_RATING[rating];
    const nextReviewAt = calcNextReviewAt(stageMasteryAfter, score);
    const becameLearned = graduatesToReview;
    const nextStatus =
      current.status === VerseStatus.STOPPED
        ? VerseStatus.STOPPED
        : rawMasteryAfter > 0
          ? (nextRepetitions >= 5 ? "MASTERED" : graduatesToReview ? "REVIEW" : VerseStatus.LEARNING)
          : VerseStatus.NEW;

    const updated: TrainingVerseState = {
      ...current,
      raw: {
        ...current.raw,
        masteryLevel: rawMasteryAfter,
        repetitions: nextRepetitions,
        status: nextStatus,
      } as Verse,
      rawMasteryLevel: rawMasteryAfter,
      stageMasteryLevel: stageMasteryAfter,
      repetitions: nextRepetitions,
      status: nextStatus,
      lastModeId: trainingModeId,
      lastReviewedAt: now,
      nextReviewAt,
    };

    const updatedList = [...trainingVerses];
    updatedList[trainingIndex] = updated;
    setTrainingVerses(updatedList);
    setPreviewOverride(current.raw, {
      status: updated.status,
      masteryLevel: rawMasteryAfter,
      ...(canUpdateRepetitions ? { repetitions: updated.repetitions } : {}),
    });

    if (becameLearned) {
      haptic("success");
      showFeedback("Стих выучен", "success");
    }

    const nextMode = getModeByShiftInProgressOrder(trainingModeId, MODE_SHIFT_BY_RATING[rating] ?? 1);
    const nextModeForCurrentVerse =
      !wasReviewExercise && nextMode
        ? nextMode
        : chooseModeId(updated);

    if (trainingSubsetFilter !== "all" && !matchesTrainingSubsetFilter(updated, trainingSubsetFilter)) {
      toast.info("Стих вышел из текущего фильтра", {
        description: "Фильтр переключен на «Все», вы остаетесь на текущем стихе.",
      });
      setTrainingSubsetFilter("all");
    }

    setTrainingModeId(nextModeForCurrentVerse);

    try {
      const persistedResponse = await persistTrainingVerseProgress(updated, { includeRepetitions: canUpdateRepetitions });
      const persistedStatus = normalizeVerseStatus(
        (persistedResponse?.status as Verse["status"] | undefined) ?? updated.status
      );
      const persistedMasteryLevel = normalizeRawMasteryLevel(
        (persistedResponse?.masteryLevel as number | null | undefined) ?? updated.rawMasteryLevel
      );
      const persistedRepetitions = Math.max(
        0,
        Math.round(Number((persistedResponse?.repetitions as number | null | undefined) ?? updated.repetitions))
      );
      const persistedLastReviewedAt =
        parseDate((persistedResponse?.lastReviewedAt as string | Date | null | undefined) ?? updated.lastReviewedAt) ??
        updated.lastReviewedAt;
      const persistedNextReviewAt =
        parseDate((persistedResponse?.nextReviewAt as string | Date | null | undefined) ?? updated.nextReviewAt) ??
        null;
      const persistedDisplayStatus =
        persistedStatus === VerseStatus.LEARNING
          ? deriveTrainingDisplayStatus({
              baseStatus: VerseStatus.LEARNING,
              masteryLevel: persistedMasteryLevel,
              repetitions: persistedRepetitions,
              nextReviewAt: persistedNextReviewAt,
            })
          : persistedStatus;

      const persistedUpdated: TrainingVerseState = {
        ...updated,
        raw: {
          ...updated.raw,
          status: persistedDisplayStatus,
          masteryLevel: persistedMasteryLevel,
          repetitions: persistedRepetitions,
          lastReviewedAt: persistedLastReviewedAt ? persistedLastReviewedAt.toISOString() : null,
          nextReviewAt: persistedNextReviewAt ? persistedNextReviewAt.toISOString() : null,
        } as Verse,
        status: persistedDisplayStatus,
        rawMasteryLevel: persistedMasteryLevel,
        stageMasteryLevel: toStageMasteryLevel(persistedMasteryLevel),
        repetitions: persistedRepetitions,
        lastReviewedAt: persistedLastReviewedAt,
        nextReviewAt: persistedNextReviewAt,
      };

      setTrainingVerses((prev) => {
        const idx = prev.findIndex((v) => v.key === current.key);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = persistedUpdated;
        return next;
      });
      setPreviewOverride(current.raw, {
        status: persistedUpdated.status,
        masteryLevel: persistedUpdated.rawMasteryLevel,
        repetitions: persistedUpdated.repetitions,
        lastReviewedAt: persistedUpdated.lastReviewedAt ?? null,
        nextReviewAt: persistedUpdated.nextReviewAt ?? null,
      });
      onVersePatched?.({
        target: { id: current.raw.id, externalVerseId: current.externalVerseId },
        patch: {
          status: persistedUpdated.status,
          masteryLevel: persistedUpdated.rawMasteryLevel,
          repetitions: persistedUpdated.repetitions,
          lastReviewedAt: persistedUpdated.lastReviewedAt?.toISOString() ?? null,
          nextReviewAt: persistedUpdated.nextReviewAt?.toISOString() ?? null,
        },
      });

      const completionToast = getTrainingCompletionToastPayload({
        wasReviewExercise,
        becameLearned,
        finalStatus: persistedUpdated.status,
        reference: persistedUpdated.raw.reference,
      });
      onDailyGoalProgressEvent?.({
        source: 'verse-gallery',
        externalVerseId: persistedUpdated.externalVerseId,
        reference: persistedUpdated.raw.reference,
        targetKindHint: getDailyGoalTargetKindHint(dailyGoalContext),
        saved: true,
        rating,
        trainingModeId,
        before: {
          status: String(current.status),
          masteryLevel: Number(current.rawMasteryLevel ?? 0),
          repetitions: Number(current.repetitions ?? 0),
          lastReviewedAt: current.lastReviewedAt ? current.lastReviewedAt.toISOString() : null,
        },
        after: {
          status: String(persistedUpdated.status),
          masteryLevel: Number(persistedUpdated.rawMasteryLevel ?? 0),
          repetitions: Number(persistedUpdated.repetitions ?? 0),
          lastReviewedAt: persistedUpdated.lastReviewedAt ? persistedUpdated.lastReviewedAt.toISOString() : null,
        },
        occurredAt: new Date().toISOString(),
      });
      if (completionToast) {
        showTrainingCompletionToast(completionToast);
        removeCompletedTrainingVerseAndNavigate(1);
      }
    } catch (error) {
      console.error("Failed to persist training progress", error);
      haptic("error");
      showFeedback("Ошибка — попробуйте ещё раз", "error");
    }
  }, [
    dailyGoalContext,
    onDailyGoalProgressEvent,
    panelMode,
    onVersePatched,
    removeCompletedTrainingVerseAndNavigate,
    setPreviewOverride,
    showFeedback,
    showTrainingCompletionToast,
    trainingIndex,
    trainingModeId,
    trainingSubsetFilter,
    trainingVerses,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (deleteDialogOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (panelMode === "training") {
          if (closeTrainingGoesToPreview) exitTrainingMode();
          else onClose();
        } else onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        if (panelMode === "training") handleTrainingNavigationStep(1);
        else void navigatePreviewTo("next");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        if (panelMode === "training") handleTrainingNavigationStep(-1);
        else void navigatePreviewTo("prev");
        return;
      }
      if (e.key === "Tab" && dialogRef.current) trapFocus(dialogRef.current, e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTrainingGoesToPreview, deleteDialogOpen, panelMode, onClose, exitTrainingMode, handleTrainingNavigationStep, navigatePreviewTo]);

  if (!displayVerse) return null;

  const galleryBodyKey =
    panelMode === "training"
      ? `training-${trainingIndex}-${getVerseIdentity(displayVerse)}-${trainingModeId ?? "none"}`
      : `preview-${activeIndex}-${getVerseIdentity(displayVerse)}`;

  const previewStatusAction = panelMode === "preview" && previewActiveVerse
    ? getGalleryStatusAction(normalizeVerseStatus(previewActiveVerse.status))
    : null;

  const handlePreviewStatusAction = async () => {
    if (!previewStatusAction || !previewActiveVerse || actionPending) return;
    try {
      setActionPending(true);
      setPreviewOverride(previewActiveVerse, { status: previewStatusAction.nextStatus });
      const patch = await onStatusChange(previewActiveVerse, previewStatusAction.nextStatus);
      if (patch) {
        setPreviewOverride(previewActiveVerse, toPreviewOverrideFromVersePatch(patch));
      }
      haptic("success");
      showFeedback(previewStatusAction.successMessage, "success");
    } catch {
      haptic("error");
      setPreviewOverride(previewActiveVerse, { status: previewActiveVerse.status });
      showFeedback("Ошибка — попробуйте ещё раз", "error");
    } finally {
      setActionPending(false);
    }
  };

  const displayTotal = panelMode === "training" ? Math.max(trainingEligibleIndices.length, 1) : previewDisplayTotal;
  const displayActive = panelMode === "training"
    ? Math.max(0, trainingEligibleIndices.indexOf(trainingIndex))
    : Math.max(0, activeIndex);
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={
        isTrainingAutoStartOverlayVisible
          ? "Подготовка режима обучения"
          : (panelMode === "training" ? "Режим обучения" : "Просмотр стиха")
      }
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-md"
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">{feedback?.message ?? ""}</div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{slideAnnouncement}</div>

      <div className="shrink-0 backdrop-blur-xl bg-background/80 border-b border-border/50 z-40" style={{ paddingTop: `${topInset}px` }}>
     
          <div className="max-w-4xl mx-auto px-4 py-2">
            <div className="flex items-start justify-between gap-4 relative">
              <div className="min-w-0 flex-1">
                <div className="flex justify-center items-center gap-3">
                          <div
                role="status"
                aria-label={`Стих ${Math.min(displayActive + 1, displayTotal)} из ${displayTotal}`}
                className={cn(
                  "min-w-0 px-3 py-1 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg",
                  MAX_DOT_PROGRESS_TEXT_WIDTH_CLASS
                )}
              >
                <span className="block truncate text-sm font-semibold tabular-nums text-center">
                  {Math.min(displayActive + 1, displayTotal)} / {displayTotal}
                </span>
              </div>

                </div>
              </div>
            </div>
          </div>
      </div>
      {dailyGoalGuideActive && dailyGoalContext ? (
        <div className="shrink-0 px-4 sm:px-6 pt-3 z-30">
            <div className="flex flex-col gap-2.5">
                {dailyGoalContext.learningStageBlocked ? (
                  <div className="mt-1 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                    Чтобы начать цель, добавьте стих или переведите стих в режим изучения (LEARNING).
                  </div>
                ) : dailyGoalContext.reviewStageSkipped ? (null
                  // <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  //   Этап повторения будет пропущен: сейчас нет карточек для повторения.
                  // </div>
                ) : null}
                {dailyGoalNextTargetReference && dailyGoalContext.phase !== 'completed' ? (
                  <div className="mt-1 text-xs sm:text-sm truncate">
                    Следующий стих: <span className="font-medium">{dailyGoalNextTargetReference}</span>
                  </div>
                ) : null}

              <div className="flex flex-row md:flex-col gap-2 h-full">
                {dailyGoalLearningPill ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDailyGoalPillClick("learning");
                    }}
                    aria-pressed={panelMode === "training" && dailyGoalCurrentExecutionMode === "learning"}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2.5 backdrop-blur-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      "hover:bg-background/70",
                      dailyGoalLearningPill.className
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {dailyGoalLearningPill.completed ? (
                          <CheckCircle2 className={cn("h-4 w-4 shrink-0", dailyGoalLearningPill.iconClassName)} />
                        ) : (
                          <Clock3 className={cn("h-4 w-4 shrink-0", dailyGoalLearningPill.iconClassName)} />
                        )}
                        <span className="font-medium truncate text-sm">{dailyGoalLearningPill.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs tabular-nums font-semibold">{dailyGoalLearningPill.progress}</span>
                      </div>
                    </div>
                  </button>
                ) : null}
                {dailyGoalReviewPill ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDailyGoalPillClick("review");
                    }}
                    aria-pressed={panelMode === "training" && dailyGoalCurrentExecutionMode === "review"}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 backdrop-blur-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      "hover:bg-background/70",
                      dailyGoalReviewPill.className
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {dailyGoalReviewPill.completed ? (
                          <CheckCircle2 className={cn("h-4 w-4 shrink-0", dailyGoalReviewPill.iconClassName)} />
                        ) : (
                          <Clock3 className={cn("h-4 w-4 shrink-0", dailyGoalReviewPill.iconClassName)} />
                        )}
                        <span className="font-medium truncate text-sm">{dailyGoalReviewPill.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs tabular-nums font-semibold">{dailyGoalReviewPill.progress}</span>
                      </div>
                    </div>
                  </button>
                ) : null}
              </div>
          </div>
        </div>
      ) : null}
      <div className="flex-1 relative grid place-items-center px-4 sm:px-6" role="region" aria-roledescription="carousel" aria-label={panelMode === "training" ? "Карточки обучения" : "Карточки со стихами"}>
        {isTrainingAutoStartOverlayVisible ? (
          <DailyGoalTrainingLoadingView
          />
        ) : (
          <AnimatePresence initial={false} mode="sync" custom={direction}>
            <motion.div key={galleryBodyKey} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="col-start-1 row-start-1 w-full max-w-4xl focus-visible:outline-none" tabIndex={-1}>
              <VerseGalleryUnifiedCardViewport
                panelMode={panelMode}
                previewVerse={previewActiveVerse}
                activeIndex={activeIndex}
                actionPending={actionPending}
                trainingActiveVerse={trainingActiveVerse}
                trainingModeId={trainingModeId}
                trainingRendererRef={trainingRendererRef}
                onStartTraining={() => {
                  void startTrainingFromActiveVerse();
                }}
                onPreviewStatusAction={() => {
                  void handlePreviewStatusAction();
                }}
                onPreviewTouchStart={handlePreviewTouchStart}
                onPreviewTouchEnd={handlePreviewTouchEnd}
                onTrainingSwipeStep={handleTrainingNavigationStep}
                onTrainingRate={handleTrainingRate}
                dailyGoalGuideActive={dailyGoalGuideActive}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {panelMode === "preview" && !isTrainingAutoStartOverlayVisible && (
        <div className="shrink-0 px-4 sm:px-6 z-40">
          <div className="mx-auto w-full flex flex-wrap items-center justify-center max-w-2xl gap-3">
            <Button
              variant="outline"
              className="gap-2 backdrop-blur-xl rounded-2xl"
              ref={closeButtonRef}
              onClick={onClose}
              disabled={actionPending}
              aria-label="Завершить тренировку"
            >
              Завершить
            </Button>
            {previewStatusAction && (
              <Button variant="secondary" className=" gap-2 backdrop-blur-xl rounded-2xl" onClick={() => void handlePreviewStatusAction()} disabled={actionPending} aria-label={previewStatusAction.label}>
                <previewStatusAction.icon className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              className={`gap-2 text-destructive hover:text-destructive backdrop-blur-xl rounded-2xl ${previewStatusAction ? "" : "flex-1"}`}
              onClick={() => {
                if (actionPending) return;
                haptic("warning");
                setDeleteDialogOpen(true);
              }}
              disabled={actionPending}
              aria-label="Удалить стих"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {panelMode === "training" && !isTrainingAutoStartOverlayVisible && (
        <div className="shrink-0 px-4 sm:px-6 pt-3 z-40">
          <div className="mx-auto w-full flex flex-wrap items-center justify-center max-w-2xl gap-3">
            <Button
              type="button"
              variant="secondary"
              className="w-fit gap-2 rounded-2xl backdrop-blur-xl"
              onClick={() => {
                haptic("light");
                handleTrainingBackAction();
              }}
              aria-label={closeTrainingGoesToPreview ? "Вернуться к превью" : "Закрыть галерею"}
            >
              <ChevronLeft className="h-4 w-4" />
              {closeTrainingGoesToPreview ? "К превью" : "Закрыть"}
            </Button>
            <TrainingSubsetSelect
              value={trainingSubsetFilter}
              onValueChange={(value) => {
                const nextFilter = value as TrainingSubsetFilter;
                if (trainingSubsetFilter === nextFilter) return;
                haptic("light");
                applyUserTrainingSubsetFilter(nextFilter);
              }}
            />
          </div>
        </div>
      )}

      <div
        className="shrink-0 flex items-center justify-center gap-2 sm:gap-3 pt-3 z-40 px-2 sm:px-4"
        style={{ paddingBottom: `${Math.max(bottomInset, 10)}px` }}
      >
        <Button
          variant="secondary"
          size="icon"
          onClick={() => (panelMode === "training" ? handleTrainingNavigationStep(-1) : void navigatePreviewTo("prev"))}
          disabled={
            isTrainingAutoStartOverlayVisible ||
            (panelMode === "training"
              ? displayActive <= 0 || trainingEligibleIndices.length <= 1
              : activeIndex === 0)
          }
          aria-label="Предыдущий стих"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex items-center justify-center">
          {isTrainingAutoStartOverlayVisible ? (
            <div className="px-3 py-2 rounded-full border border-border/50 bg-background/80 text-xs text-muted-foreground">
              Подготовка…
            </div>
          ) : (
            <DotProgress total={displayTotal} active={Math.min(displayActive, Math.max(0, displayTotal - 1))} />
          )}
        </div>

        <Button
          variant="secondary"
          size="icon"
          onClick={() => (panelMode === "training" ? handleTrainingNavigationStep(1) : void navigatePreviewTo("next"))}
          disabled={
            isTrainingAutoStartOverlayVisible ||
            (panelMode === "training"
              ? displayActive >= displayTotal - 1 || trainingEligibleIndices.length <= 1
              : (previewIsLoadingMore && activeIndex >= verses.length - 1) || (activeIndex === verses.length - 1 && !previewHasMore))
          }
          aria-label="Следующий стих"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {!isTrainingAutoStartOverlayVisible && <SwipeHint panelMode={panelMode} />}

      <TrainingCompletionToastCard
        toast={trainingCompletionToast}
        onDismiss={dismissTrainingCompletionToast}
        bottomOffset={Math.max(bottomInset, 10) + 84}
        durationMs={10000}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить стих?</AlertDialogTitle>
            <AlertDialogDescription>Это действие нельзя отменить. Стих будет удалён из вашей коллекции.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending || panelMode !== "preview" || !previewActiveVerse}
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={async () => {
                if (!previewActiveVerse) return;
                try {
                  setActionPending(true);
                  await onDelete(previewActiveVerse);
                  haptic("success");
                  showFeedback("Стих удалён", "success");
                  if (verses.length <= 1) onClose();
                  else {
                    const newDir = activeIndex > 0 ? -1 : 1;
                    setDirection(newDir);
                    setActiveIndex(activeIndex > 0 ? activeIndex - 1 : 0);
                  }
                } catch {
                  haptic("error");
                  showFeedback("Ошибка удаления", "error");
                } finally {
                  setActionPending(false);
                }
                setDeleteDialogOpen(false);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
