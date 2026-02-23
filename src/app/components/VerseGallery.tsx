"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type Ref, type TouchEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Pause,
  Play,
  Repeat,
  Trash2,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { MasteryBadge } from "./MasteryBadge";
import { Verse } from "@/app/App";
import { UserVersesService } from "@/api/services/UserVersesService";
import { VerseStatus } from "@/generated/prisma";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";
import {
  TrainingModeId,
  TRAINING_MODE_SHIFT_BY_RATING,
  chooseTrainingModeId,
  getTrainingModeByShiftInProgressOrder,
  isTrainingReviewRawMastery,
  normalizeRawMasteryLevel as normalizeSharedRawMasteryLevel,
  toTrainingStageMasteryLevel,
} from "@/shared/training/modeEngine";
import {
  createVerticalTouchSwipeStart,
  getVerticalTouchSwipeStep,
  type VerticalTouchSwipeStart,
} from "@/shared/ui/verticalTouchSwipe";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";
import { VerseCard } from "./VerseCard";
import type { Verse as LegacyVerse } from "../data/mockData";
import {
  TrainingModeRenderer,
  TrainingModeRendererKey,
  type TrainingModeRendererHandle,
} from "./training-session/TrainingModeRenderer";
import type { TrainingModeRating } from "./training-session/modes/types";

type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onDelete: (verse: Verse) => Promise<void>;
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

type VersePreviewOverride = Partial<Pick<Verse, "status" | "masteryLevel" | "repetitions">>;

const MAX_MASTERY_LEVEL = TRAINING_STAGE_MASTERY_MAX;

type ModeId = TrainingModeId;
type TrainingModeMeta = (typeof MODE_PIPELINE)[ModeId];

type TrainingVerseState = {
  raw: Verse;
  key: string;
  telegramId: string | null;
  externalVerseId: string;
  status: VerseStatus;
  rawMasteryLevel: number;
  stageMasteryLevel: number;
  repetitions: number;
  lastModeId: ModeId | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
};

const TRAINING_SUBSET_OPTIONS: Array<{ key: TrainingSubsetFilter; label: string }> = [
  { key: "all", label: "Все" },
  { key: "learning", label: "Изучение" },
  { key: "review", label: "Повторение" },
];

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

function getGalleryStatusAction(status: VerseStatus): GalleryStatusAction | null {
  if (status === VerseStatus.NEW) {
    return { nextStatus: VerseStatus.LEARNING, label: "Добавить в изучение", icon: Plus, successMessage: "Добавлено в изучение" };
  }
  if (status === VerseStatus.LEARNING) {
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

function normalizeVerseStatus(status: Verse["status"]): VerseStatus {
  if (status === VerseStatus.LEARNING) return VerseStatus.LEARNING;
  if (status === VerseStatus.STOPPED) return VerseStatus.STOPPED;
  return VerseStatus.NEW;
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
  return {
    raw: verse,
    key: getVerseIdentity(verse),
    telegramId: (verse as any).telegramId ? String((verse as any).telegramId) : null,
    externalVerseId,
    status: normalizeVerseStatus(verse.status),
    rawMasteryLevel,
    stageMasteryLevel: toStageMasteryLevel(rawMasteryLevel),
    repetitions: Math.max(0, Math.round(verse.repetitions ?? 0)),
    lastModeId: null,
    lastReviewedAt: parseDate((verse as any).lastReviewedAt),
    nextReviewAt: parseDate((verse as any).nextReviewAt ?? (verse as any).nextReview),
  };
}
function isTrainingEligibleVerse(verse: TrainingVerseState) {
  return verse.status === VerseStatus.LEARNING;
}

function isTrainingReviewVerse(verse: Pick<TrainingVerseState, "status" | "rawMasteryLevel">) {
  return verse.status === VerseStatus.LEARNING && isTrainingReviewRawMastery(verse.rawMasteryLevel);
}

function matchesTrainingSubsetFilter(
  verse: TrainingVerseState,
  filter: TrainingSubsetFilter
) {
  if (filter === "all") return isTrainingEligibleVerse(verse);
  if (filter === "review") return isTrainingReviewVerse(verse);
  return verse.status === VerseStatus.LEARNING && verse.rawMasteryLevel <= TRAINING_STAGE_MASTERY_MAX;
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

async function persistTrainingVerseProgress(verse: TrainingVerseState) {
  const telegramId = verse.telegramId ?? getTelegramId();
  if (!telegramId) return false;
  await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, {
    masteryLevel: verse.rawMasteryLevel,
    repetitions: verse.repetitions,
    lastReviewedAt: verse.lastReviewedAt?.toISOString(),
    nextReviewAt: verse.nextReviewAt?.toISOString(),
    status: patchStatusForTrainingVerse(verse),
  });
  return true;
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

function useBodyScrollLock() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
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

const MAX_DOTS = 20;

function DotProgress({ total, active }: { total: number; active: number }) {
  if (total > MAX_DOTS) {
    return (
      <div role="status" aria-label={`Стих ${active + 1} из ${total}`} className="px-4 py-2.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg">
        <span className="text-sm font-semibold tabular-nums">{active + 1} / {total}</span>
      </div>
    );
  }
  return (
    <div role="status" aria-label={`Стих ${active + 1} из ${total}`} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative flex items-center justify-center">
          <motion.div layout animate={{ width: i === active ? 28 : 8, opacity: i === active ? 1 : 0.3 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className={`h-2 rounded-full transition-colors duration-300 ${i === active ? "bg-primary" : "bg-muted-foreground/40"}`} />
          {i === active && (
            <motion.span aria-hidden="true" className="absolute inset-0 rounded-full bg-primary pointer-events-none" animate={{ scaleX: [1, 2.4], scaleY: [1, 2], opacity: [0.45, 0] }} transition={{ duration: 1.15, repeat: Infinity, ease: "easeOut", repeatDelay: 0.55 }} />
          )}
        </div>
      ))}
    </div>
  );
}
const slideVariants = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.88 }),
  center: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 32 } as const },
  exit: (dir: number) => ({ y: dir > 0 ? "-18%" : "18%", opacity: 0, scale: 0.86, transition: { duration: 0.2, ease: "easeIn" } as const }),
};

type PreviewViewportProps = {
  verse: Verse;
  activeIndex: number;
  versesCount: number;
  actionPending: boolean;
  onNavigate: (dir: "prev" | "next") => void;
  onStartTraining: () => void | Promise<void>;
  onTouchStart: (e: TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (e: TouchEvent<HTMLDivElement>) => void;
};

function VerseGalleryPreviewViewport({
  verse,
  activeIndex,
  versesCount,
  actionPending,
  onNavigate,
  onStartTraining,
  onTouchStart,
  onTouchEnd,
}: PreviewViewportProps) {
  const isReviewAction =
    normalizeVerseStatus(verse.status) === VerseStatus.LEARNING &&
    Number(verse.masteryLevel ?? 0) > TRAINING_STAGE_MASTERY_MAX;
  const ctaLabel = isReviewAction ? "ПОВТОРЯТЬ" : "УЧИТЬ";
  const ctaAriaLabel = isReviewAction ? "Повторять этот стих" : "Учить этот стих";

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="w-full">
      <VerseCard
        verse={verse}
        isActive
        isFirst={activeIndex === 0}
        isLast={activeIndex === versesCount - 1}
        onNavigate={onNavigate}
        onHaptic={haptic}
        topBadge={<MasteryBadge status={normalizeVerseStatus(verse.status)} masteryLevel={verse.masteryLevel ?? 0} />}
        centerAction={
          <Button
            className={`gap-2 min-w-[200px] shadow-lg rounded-2xl ${
              isReviewAction
                ? ""
                : ""
            }`}
            onClick={() => void onStartTraining()}
            disabled={actionPending}
            aria-label={ctaAriaLabel}
          >
            {isReviewAction ? <Repeat className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {ctaLabel}
          </Button>
        }
      />
    </div>
  );
}

type TrainingViewportProps = {
  trainingActiveVerse: TrainingVerseState;
  trainingModeId: ModeId;
  trainingModeMeta: TrainingModeMeta | null;
  trainingRendererRef: Ref<TrainingModeRendererHandle>;
  onTouchStart: (e: TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (e: TouchEvent<HTMLDivElement>) => void;
  onRate: (rating: Rating) => void | Promise<void>;
};

function VerseGalleryTrainingViewport({
  trainingActiveVerse,
  trainingModeId,
  trainingModeMeta,
  trainingRendererRef,
  onTouchStart,
  onTouchEnd,
  onRate,
}: TrainingViewportProps) {
  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="w-full">
      <TrainingModeRenderer
        ref={trainingRendererRef}
        renderer={MODE_PIPELINE[trainingModeId].renderer}
        verse={asLegacyVerse(trainingActiveVerse)}
        onRate={onRate}
        topBadge={
          trainingModeMeta ? (
            <div className="flex items-center gap-2">
              <Badge className={`${trainingModeMeta.badgeClass} shadow-sm`}>
                {trainingModeMeta.label}
              </Badge>
              {/* {isTrainingReviewVerse(trainingActiveVerse) && (
                <Badge variant="outline" className="border-violet-500/40 bg-violet-500/10 text-violet-700 shadow-sm">
                  Повторение
                </Badge>
              )} */}
            </div>
          ) : null
        }
      />
    </div>
  );
}

export function VerseGallery({
  verses,
  initialIndex,
  onClose,
  onStatusChange,
  onDelete,
}: VerseGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [panelMode, setPanelMode] = useState<PanelMode>("preview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [previewOverrides, setPreviewOverrides] = useState<Map<string, VersePreviewOverride>>(() => new Map());

  const [trainingVerses, setTrainingVerses] = useState<TrainingVerseState[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingModeId, setTrainingModeId] = useState<ModeId | null>(null);
  const [trainingSubsetFilter, setTrainingSubsetFilter] = useState<TrainingSubsetFilter>("all");
  const previewTouchStartRef = useRef<VerticalTouchSwipeStart | null>(null);
  const trainingTouchStartRef = useRef<VerticalTouchSwipeStart | null>(null);
  const trainingRendererRef = useRef<TrainingModeRendererHandle | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { contentSafeAreaInset, isInTelegram } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const [slideAnnouncement, setSlideAnnouncement] = useState("");

  useBodyScrollLock();

  const previewActiveVerseBase = verses[activeIndex] ?? null;
  const previewActiveVerse = previewActiveVerseBase ? mergePreviewOverrides(previewActiveVerseBase, previewOverrides) : null;

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
  const trainingModeMeta = panelMode === "training" && trainingModeId ? MODE_PIPELINE[trainingModeId] : null;

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
    const total = panelMode === "training" ? Math.max(trainingEligibleIndices.length, 1) : verses.length;
    const position = panelMode === "training"
      ? Math.max(1, trainingEligibleIndices.indexOf(trainingIndex) + 1)
      : activeIndex + 1;
    setSlideAnnouncement(`Стих ${position} из ${Math.max(total, 1)}: ${displayVerse.reference}`);
  }, [displayVerse, panelMode, trainingEligibleIndices, trainingIndex, activeIndex, verses.length]);

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

  const showFeedback = useCallback((message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  const setPreviewOverride = useCallback((verse: Verse, patch: VersePreviewOverride) => {
    const key = getVerseIdentity(verse);
    setPreviewOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, { ...(next.get(key) ?? {}), ...patch });
      return next;
    });
  }, []);

  const navigatePreviewTo = useCallback((dir: "prev" | "next") => {
    const newDir = dir === "next" ? 1 : -1;
    const newIndex = dir === "next" ? Math.min(verses.length - 1, activeIndex + 1) : Math.max(0, activeIndex - 1);
    if (newIndex === activeIndex) return;
    haptic("light");
    setDirection(newDir);
    setActiveIndex(newIndex);
  }, [activeIndex, verses.length]);

  const syncPreviewIndexToVerse = useCallback((target: TrainingVerseState | Verse | null | undefined) => {
    if (!target) return;
    const key = "raw" in target ? target.key : getVerseIdentity(target);
    const nextIndex = verses.findIndex((v) => getVerseIdentity(v) === key);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }, [verses]);

  const exitTrainingMode = useCallback((target?: TrainingVerseState | null) => {
    syncPreviewIndexToVerse(target ?? trainingActiveVerse);
    setPanelMode("preview");
    setTrainingModeId(null);
  }, [syncPreviewIndexToVerse, trainingActiveVerse]);

  const handleTrainingBackAction = useCallback(() => {
    if (trainingRendererRef.current?.handleBackAction()) {
      return;
    }
    exitTrainingMode();
  }, [exitTrainingMode]);

  useEffect(() => {
    if (!isInTelegram || typeof window === "undefined") return;

    const backButton = (window as any).Telegram?.WebApp?.BackButton;
    if (!backButton) return;

    const handleBackButton = () => {
      if (deleteDialogOpen) {
        setDeleteDialogOpen(false);
        return;
      }
      if (panelMode === "training") {
        handleTrainingBackAction();
        return;
      }
      onClose();
    };

    try {
      backButton.onClick(handleBackButton);
      backButton.show();
    } catch {
      return;
    }

    return () => {
      try {
        backButton.offClick(handleBackButton);
        backButton.hide();
      } catch {
        // ignore Telegram API cleanup errors
      }
    };
  }, [isInTelegram, deleteDialogOpen, panelMode, handleTrainingBackAction, onClose]);

  const jumpToAdjacentTrainingVerse = useCallback((delta: -1 | 1) => {
    if (panelMode !== "training") return;
    if (!trainingActiveVerse) return;
    if (trainingEligibleIndices.length <= 1) return;
    const currentPos = trainingEligibleIndices.indexOf(trainingIndex);
    if (currentPos < 0) return;
    const nextPos = currentPos + delta;
    if (nextPos < 0 || nextPos >= trainingEligibleIndices.length) return;
    const nextIndex = trainingEligibleIndices[nextPos];
    const nextVerse = trainingVerses[nextIndex];
    if (!nextVerse) return;
    setDirection(delta > 0 ? 1 : -1);
    setTrainingIndex(nextIndex);
    setTrainingModeId(chooseModeId(nextVerse));
    haptic("medium");
  }, [panelMode, trainingActiveVerse, trainingEligibleIndices, trainingIndex, trainingVerses]);

  const fetchLearningVersesForTraining = useCallback(async () => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      return sortByCreatedAtDesc(verses.filter((v) => normalizeVerseStatus(v.status) === VerseStatus.LEARNING));
    }
    try {
      const response = (await UserVersesService.getApiUsersVerses(
        telegramId,
        VerseStatus.LEARNING,
        "createdAt",
        "desc"
      )) as Array<Verse>;
      const filtered = response.filter((v) => normalizeVerseStatus(v.status) === VerseStatus.LEARNING);
      return sortByCreatedAtDesc(filtered);
    } catch (error) {
      console.error("Не удалось загрузить стихи LEARNING:", error);
      return sortByCreatedAtDesc(verses.filter((v) => normalizeVerseStatus(v.status) === VerseStatus.LEARNING));
    }
  }, [verses]);

  const startTrainingFromActiveVerse = useCallback(async () => {
    if (actionPending || !previewActiveVerse) return false;
    try {
      setActionPending(true);
      let startVerse = previewActiveVerse;
      if (normalizeVerseStatus(previewActiveVerse.status) !== VerseStatus.LEARNING) {
        await onStatusChange(previewActiveVerse, VerseStatus.LEARNING);
        setPreviewOverride(previewActiveVerse, { status: VerseStatus.LEARNING });
        startVerse = { ...previewActiveVerse, status: VerseStatus.LEARNING } as Verse;
      }
      let learningRaw = await fetchLearningVersesForTraining();
      let normalized = learningRaw.map(toTrainingVerseState).filter((v): v is TrainingVerseState => v !== null);
      const startKey = getVerseIdentity(startVerse);
      if (!normalized.some((v) => v.key === startKey)) {
        const fallback = toTrainingVerseState(startVerse);
        if (fallback && fallback.status === VerseStatus.LEARNING) normalized = [fallback, ...normalized];
      }
      if (!normalized.some((v) => v.status === VerseStatus.LEARNING)) {
        showFeedback("Нет стихов в изучении", "error");
        return false;
      }
      const startIndex = Math.max(0, normalized.findIndex((v) => v.key === startKey));
      const startState = normalized[startIndex] ?? normalized[0];
      setTrainingVerses(normalized);
      setTrainingSubsetFilter("all");
      setTrainingIndex(startIndex);
      setTrainingModeId(chooseModeId(startState));
      setPanelMode("training");
      setDirection(0);
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
    actionPending,
    previewActiveVerse,
    onStatusChange,
    setPreviewOverride,
    fetchLearningVersesForTraining,
    showFeedback,
  ]);

  const handleTrainingTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "training") return;
    trainingTouchStartRef.current = createVerticalTouchSwipeStart(e);
  };

  const handleTrainingTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "training") return;
    const start = trainingTouchStartRef.current;
    trainingTouchStartRef.current = null;
    const step = getVerticalTouchSwipeStep(start, e);
    if (!step) return;
    jumpToAdjacentTrainingVerse(step);
  };

  const handlePreviewTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "preview") return;
    previewTouchStartRef.current = createVerticalTouchSwipeStart(e);
  };

  const handlePreviewTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "preview") return;
    const start = previewTouchStartRef.current;
    previewTouchStartRef.current = null;
    const step = getVerticalTouchSwipeStep(start, e);
    if (!step) return;
    navigatePreviewTo(step > 0 ? "next" : "prev");
  };
  const handleTrainingRate = useCallback(async (rating: Rating) => {
    if (panelMode !== "training" || trainingModeId === null) return;
    const current = trainingVerses[trainingIndex];
    if (!current) return;

    const rawMasteryBefore = current.rawMasteryLevel;
    const rawMasteryAfter = Math.max(0, Math.round(rawMasteryBefore + (MASTERY_DELTA_BY_RATING[rating] ?? 0)));
    const stageMasteryBefore = current.stageMasteryLevel;
    const stageMasteryAfter = toStageMasteryLevel(rawMasteryAfter);
    const now = new Date();
    const score = SCORE_BY_RATING[rating];
    const nextReviewAt = calcNextReviewAt(stageMasteryAfter, score);
    const becameLearned = stageMasteryBefore < MAX_MASTERY_LEVEL && stageMasteryAfter >= MAX_MASTERY_LEVEL;
    const nextStatus =
      current.status === VerseStatus.STOPPED
        ? VerseStatus.STOPPED
        : (rawMasteryAfter > 0 ? VerseStatus.LEARNING : VerseStatus.NEW);

    const updated: TrainingVerseState = {
      ...current,
      raw: {
        ...current.raw,
        masteryLevel: rawMasteryAfter,
        repetitions: current.repetitions + 1,
        status: nextStatus,
      } as Verse,
      rawMasteryLevel: rawMasteryAfter,
      stageMasteryLevel: stageMasteryAfter,
      repetitions: current.repetitions + 1,
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
      repetitions: updated.repetitions,
    });

    if (becameLearned) {
      haptic("success");
      showFeedback("Стих выучен", "success");
    }

    const isReviewExercise = isTrainingReviewVerse(updated);
    const nextMode = getModeByShiftInProgressOrder(trainingModeId, MODE_SHIFT_BY_RATING[rating] ?? 1);
    if (!isReviewExercise && matchesTrainingSubsetFilter(updated, trainingSubsetFilter) && nextMode) {
      setTrainingModeId(nextMode);
    } else {
      let eligibleIndices = updatedList
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
        .map(({ index }) => index);

      if (eligibleIndices.length === 0 && trainingSubsetFilter !== "all") {
        toast.info("Нет стихов для выбранного режима", {
          description: "Переключаем обратно на «Все».",
        });
        setTrainingSubsetFilter("all");
        eligibleIndices = updatedList
          .map((verse, index) => ({ verse, index }))
          .filter(({ verse }) => isTrainingEligibleVerse(verse))
          .map(({ index }) => index);
      }

      if (eligibleIndices.length === 0) {
        exitTrainingMode(updated);
      } else {
        const nextIndex = eligibleIndices.find((idx) => idx !== trainingIndex) ?? eligibleIndices[0];
        const nextVerse = updatedList[nextIndex];
        setDirection(1);
        setTrainingIndex(nextIndex);
        setTrainingModeId(chooseModeId(nextVerse));
      }
    }

    try {
      await persistTrainingVerseProgress(updated);
    } catch (error) {
      console.error("Failed to persist training progress", error);
      haptic("error");
      showFeedback("Ошибка — попробуйте ещё раз", "error");
    }
  }, [panelMode, trainingModeId, trainingVerses, trainingIndex, trainingSubsetFilter, setPreviewOverride, exitTrainingMode, showFeedback]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (deleteDialogOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (panelMode === "training") exitTrainingMode();
        else onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        if (panelMode === "training") jumpToAdjacentTrainingVerse(1);
        else navigatePreviewTo("next");
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        if (panelMode === "training") jumpToAdjacentTrainingVerse(-1);
        else navigatePreviewTo("prev");
        return;
      }
      if (e.key === "Tab" && dialogRef.current) trapFocus(dialogRef.current, e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteDialogOpen, panelMode, onClose, exitTrainingMode, jumpToAdjacentTrainingVerse, navigatePreviewTo]);

  if (!displayVerse) return null;

  const galleryBodyKey = `${panelMode}-${getVerseIdentity(displayVerse)}`;

  const previewStatusAction = panelMode === "preview" && previewActiveVerse
    ? getGalleryStatusAction(normalizeVerseStatus(previewActiveVerse.status))
    : null;

  const handlePreviewStatusAction = async () => {
    if (!previewStatusAction || !previewActiveVerse || actionPending) return;
    try {
      setActionPending(true);
      setPreviewOverride(previewActiveVerse, { status: previewStatusAction.nextStatus });
      await onStatusChange(previewActiveVerse, previewStatusAction.nextStatus);
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

  const displayTotal = panelMode === "training" ? Math.max(trainingEligibleIndices.length, 1) : Math.max(verses.length, 1);
  const displayActive = panelMode === "training"
    ? Math.max(0, trainingEligibleIndices.indexOf(trainingIndex))
    : Math.max(0, activeIndex);

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={panelMode === "training" ? "Режим обучения" : "Просмотр стиха"} className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-md">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{feedback?.message ?? ""}</div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{slideAnnouncement}</div>

      <div className="shrink-0 backdrop-blur-xl bg-background/80 border-b border-border/50 z-40" style={{ paddingTop: `${topInset}px` }}>
        {panelMode === "preview" ? (
          <div className="flex items-center justify-center p-4 w-full">
            <Badge variant="outline">cfdvfd</Badge>
            {/* <Badge className="absolute right-0 top-[65px]" variant="outline">{Math.min(activeIndex + 1, verses.length)} / {verses.length}</Badge> */}
            <Badge className="absolute right-4 top-[65px]" variant="outline">{Math.min(activeIndex + 1, verses.length)} / {verses.length}</Badge>

            {!isInTelegram && (
              <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть галерею">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-start justify-between gap-4 relative">
              <div className="min-w-0 flex-1">
                <div className="flex justify-center items-center gap-3">
                  {!isInTelegram ? (
                    <Button variant="ghost" size="sm" onClick={handleTrainingBackAction} className="gap-1">
                      <ChevronLeft className="w-4 h-4" />К стиху
                    </Button>
                  ) : (
                    <div className="h-9" aria-hidden="true" />
                  )}

                  <div className="w-full flex flex-col items-center justify-center max-w-[140px] space-y-1 ">
                    <Select
                      value={trainingSubsetFilter}
                      onValueChange={(value) => {
                        const nextFilter = value as TrainingSubsetFilter;
                        if (trainingSubsetFilter === nextFilter) return;
                        haptic("light");
                        setTrainingSubsetFilter(nextFilter);
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-full rounded-xl bg-background/80 backdrop-blur-lg"
                        aria-label="Фильтр тренировочных стихов"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_SUBSET_OPTIONS.map((option) => (
                          <SelectItem key={option.key} value={option.key}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Badge className="absolute right-0 top-[65px]" variant="outline">{Math.min(displayActive + 1, displayTotal)} / {displayTotal}</Badge>
              </div>
              {!isInTelegram && (
                <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть галерею">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 relative flex items-center justify-center px-4 sm:px-6" role="region" aria-roledescription="carousel" aria-label={panelMode === "training" ? "Карточки обучения" : "Карточки со стихами"}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={galleryBodyKey} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="w-full max-w-4xl focus-visible:outline-none" tabIndex={-1}>
            {panelMode === "preview" && previewActiveVerse ? (
              <VerseGalleryPreviewViewport
                verse={displayVerse}
                activeIndex={activeIndex}
                versesCount={verses.length}
                actionPending={actionPending}
                onNavigate={navigatePreviewTo}
                onStartTraining={() => {
                  void startTrainingFromActiveVerse();
                }}
                onTouchStart={handlePreviewTouchStart}
                onTouchEnd={handlePreviewTouchEnd}
              />
            ) : panelMode === "training" && trainingActiveVerse && trainingModeId ? (
              <VerseGalleryTrainingViewport
                trainingActiveVerse={trainingActiveVerse}
                trainingModeId={trainingModeId}
                trainingModeMeta={trainingModeMeta}
                trainingRendererRef={trainingRendererRef}
                onTouchStart={handleTrainingTouchStart}
                onTouchEnd={handleTrainingTouchEnd}
                onRate={handleTrainingRate}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {panelMode === "preview" && (
        <div className="shrink-0 px-4 sm:px-6 z-40">
          <div className="mx-auto w-full max-w-2xl flex items-center gap-3">
            {previewStatusAction && (
              <Button variant="secondary" className="flex-1 gap-2 backdrop-blur-xl rounded-2xl" onClick={() => void handlePreviewStatusAction()} disabled={actionPending} aria-label={previewStatusAction.label}>
                <previewStatusAction.icon className="h-4 w-4" />
                {previewStatusAction.label}
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
              <Trash2 className="h-4 w-4" />Удалить
            </Button>
          </div>
        </div>
      )}

      <div
        className="shrink-0 flex items-center justify-center gap-3 pt-3 z-40"
        style={{ paddingBottom: `${Math.max(bottomInset, 10)}px` }}
      >
        <Button
          variant="secondary"
          size="icon"
          onClick={() => (panelMode === "training" ? jumpToAdjacentTrainingVerse(-1) : navigatePreviewTo("prev"))}
          disabled={
            (panelMode === "training"
              ? displayActive <= 0 || trainingEligibleIndices.length <= 1
              : activeIndex === 0)
          }
          aria-label="Предыдущий стих"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <DotProgress total={displayTotal} active={Math.min(displayActive, Math.max(0, displayTotal - 1))} />

        <Button
          variant="secondary"
          size="icon"
          onClick={() => (panelMode === "training" ? jumpToAdjacentTrainingVerse(1) : navigatePreviewTo("next"))}
          disabled={
            (panelMode === "training"
              ? displayActive >= displayTotal - 1 || trainingEligibleIndices.length <= 1
              : activeIndex === verses.length - 1)
          }
          aria-label="Следующий стих"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <SwipeHint panelMode={panelMode} />

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
