"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { MasteryBadge } from "./MasteryBadge";
import { Verse } from "@/app/App";
import { UserVersesService } from "@/api/services/UserVersesService";
import { VerseStatus } from "@/generated/prisma";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";
import { VerseCard } from "./VerseCard";
import type { Verse as LegacyVerse } from "../data/mockData";
import { TrainingModeRenderer, TrainingModeRendererKey } from "./training-session/TrainingModeRenderer";
import type { TrainingModeRating } from "./training-session/modes/types";

type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onDelete: (verse: Verse) => Promise<void>;
  onStartTraining?: (verse: Verse) => void | Promise<void>;
};

type HapticStyle = "light" | "medium" | "heavy" | "success" | "error" | "warning";
type PanelMode = "preview" | "training";
type Rating = TrainingModeRating;

type GalleryStatusAction = {
  nextStatus: VerseStatus;
  label: string;
  icon: typeof Plus;
  successMessage: string;
};

type VersePreviewOverride = Partial<Pick<Verse, "status" | "masteryLevel" | "repetitions">>;

const MAX_MASTERY_LEVEL = 8;

enum TrainingModeId {
  ClickChunks = 1,
  ClickWordsHinted = 2,
  ClickWordsNoHints = 3,
  FirstLettersWithWordHints = 4,
  FirstLettersTapNoHints = 5,
  FirstLettersTyping = 6,
  FullRecall = 7,
}

type ModeId = TrainingModeId;

type TrainingVerseState = {
  raw: Verse;
  key: string;
  telegramId: string | null;
  externalVerseId: string;
  status: VerseStatus;
  masteryLevel: number;
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

const MODE_PROGRESS_ORDER: ModeId[] = [
  TrainingModeId.ClickChunks,
  TrainingModeId.ClickWordsHinted,
  TrainingModeId.ClickWordsNoHints,
  TrainingModeId.FirstLettersWithWordHints,
  TrainingModeId.FirstLettersTapNoHints,
  TrainingModeId.FirstLettersTyping,
  TrainingModeId.FullRecall,
];

const SCORE_BY_RATING: Record<Rating, number> = { 0: 35, 1: 60, 2: 84, 3: 96 };
const MASTERY_DELTA_BY_RATING: Record<Rating, number> = { 0: -1, 1: 0, 2: 1, 3: 2 };
const MODE_SHIFT_BY_RATING: Record<Rating, number> = { 0: -1, 1: 0, 2: 1, 3: 2 };
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

function normalizeMasteryLevel(raw: number | null | undefined): number {
  if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
  if (raw <= MAX_MASTERY_LEVEL) return clamp(Math.round(raw), 0, MAX_MASTERY_LEVEL);
  return clamp(Math.round((raw / 100) * MAX_MASTERY_LEVEL), 0, MAX_MASTERY_LEVEL);
}

function masteryToProgress(masteryLevel: number) {
  return Math.round((clamp(masteryLevel, 0, MAX_MASTERY_LEVEL) / MAX_MASTERY_LEVEL) * 100);
}

function getVerseIdentity(verse: Pick<Verse, "id" | "externalVerseId">) {
  return String(verse.externalVerseId ?? verse.id);
}

function toTrainingVerseState(verse: Verse): TrainingVerseState | null {
  const externalVerseId = String(verse.externalVerseId ?? verse.id ?? "").trim();
  const text = String(verse.text ?? "").trim();
  if (!externalVerseId || !text) return null;
  return {
    raw: verse,
    key: getVerseIdentity(verse),
    telegramId: (verse as any).telegramId ? String((verse as any).telegramId) : null,
    externalVerseId,
    status: normalizeVerseStatus(verse.status),
    masteryLevel: normalizeMasteryLevel(verse.masteryLevel),
    repetitions: Math.max(0, Math.round(verse.repetitions ?? 0)),
    lastModeId: null,
    lastReviewedAt: parseDate((verse as any).lastReviewedAt),
    nextReviewAt: parseDate((verse as any).nextReviewAt ?? (verse as any).nextReview),
  };
}
function isTrainingEligibleVerse(verse: TrainingVerseState) {
  return verse.status === VerseStatus.LEARNING && verse.masteryLevel < MAX_MASTERY_LEVEL;
}

function getBaseModeForMastery(masteryLevel: number): ModeId {
  const map: Record<number, ModeId> = {
    0: TrainingModeId.ClickChunks,
    1: TrainingModeId.ClickWordsHinted,
    2: TrainingModeId.ClickWordsNoHints,
    3: TrainingModeId.FirstLettersWithWordHints,
    4: TrainingModeId.FirstLettersTapNoHints,
    5: TrainingModeId.FirstLettersTyping,
    6: TrainingModeId.FullRecall,
    7: TrainingModeId.FullRecall,
    8: TrainingModeId.FullRecall,
  };
  return map[clamp(masteryLevel, 0, MAX_MASTERY_LEVEL)] ?? TrainingModeId.ClickChunks;
}

function chooseModeId(verse: TrainingVerseState): ModeId {
  const base = getBaseModeForMastery(verse.masteryLevel);
  const baseIndex = MODE_PROGRESS_ORDER.indexOf(base);
  if (baseIndex < 0) return base;

  const candidates: ModeId[] = [];
  for (let distance = 0; distance < MODE_PROGRESS_ORDER.length; distance += 1) {
    const left = baseIndex - distance;
    const right = baseIndex + distance;
    if (left >= 0) {
      const leftMode = MODE_PROGRESS_ORDER[left];
      if (!candidates.includes(leftMode)) candidates.push(leftMode);
    }
    if (distance > 0 && right < MODE_PROGRESS_ORDER.length) {
      const rightMode = MODE_PROGRESS_ORDER[right];
      if (!candidates.includes(rightMode)) candidates.push(rightMode);
    }
  }
  return candidates.find((id) => id !== verse.lastModeId) ?? base;
}

function getModeByShiftInProgressOrder(modeId: ModeId, shift: number): ModeId | null {
  const index = MODE_PROGRESS_ORDER.indexOf(modeId);
  if (index < 0) return null;
  if (shift === 0) return modeId;
  if (shift > 0) {
    const nextIndex = index + shift;
    if (nextIndex >= MODE_PROGRESS_ORDER.length) {
      if (index < MODE_PROGRESS_ORDER.length - 1) return MODE_PROGRESS_ORDER[MODE_PROGRESS_ORDER.length - 1];
      return null;
    }
    return MODE_PROGRESS_ORDER[nextIndex];
  }
  return MODE_PROGRESS_ORDER[Math.max(0, index + shift)];
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
  return verse.masteryLevel > 0 ? "LEARNING" : "NEW";
}

async function persistTrainingVerseProgress(verse: TrainingVerseState) {
  const telegramId = verse.telegramId ?? getTelegramId();
  if (!telegramId) return false;
  await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, {
    masteryLevel: verse.masteryLevel,
    repetitions: verse.repetitions,
    lastReviewedAt: verse.lastReviewedAt?.toISOString(),
    nextReviewAt: verse.nextReviewAt?.toISOString(),
    status: patchStatusForTrainingVerse(verse),
  });
  return true;
}

function asLegacyVerse(verse: TrainingVerseState): LegacyVerse {
  const progress = masteryToProgress(verse.masteryLevel);
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
function TrainingMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.88 }),
  center: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 32 } as const },
  exit: (dir: number) => ({ y: dir > 0 ? "-18%" : "18%", opacity: 0, scale: 0.86, transition: { duration: 0.2, ease: "easeIn" } as const }),
};

export function VerseGallery({
  verses,
  initialIndex,
  onClose,
  onStatusChange,
  onDelete,
  onStartTraining: _onStartTraining,
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
  const trainingTouchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { contentSafeAreaInset, isInTelegram } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom + 10;
  const [slideAnnouncement, setSlideAnnouncement] = useState("");

  useBodyScrollLock();

  const previewActiveVerseBase = verses[activeIndex] ?? null;
  const previewActiveVerse = previewActiveVerseBase ? mergePreviewOverrides(previewActiveVerseBase, previewOverrides) : null;

  const trainingEligibleIndices = useMemo(
    () => trainingVerses.map((verse, index) => ({ verse, index })).filter(({ verse }) => isTrainingEligibleVerse(verse)).map(({ index }) => index),
    [trainingVerses]
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

  useEffect(() => {
    if (!isInTelegram || typeof window === "undefined" || panelMode === "training") return;

    const backButton = (window as any).Telegram?.WebApp?.BackButton;
    if (!backButton) return;

    const handleBackButton = () => {
      if (deleteDialogOpen) {
        setDeleteDialogOpen(false);
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
  }, [isInTelegram, deleteDialogOpen, panelMode, onClose]);

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
      const response = (await UserVersesService.getApiUsersVerses(telegramId, {
        status: VerseStatus.LEARNING,
        orderBy: "createdAt",
        order: "desc",
      })) as Array<Verse>;
      const filtered = response.filter((v) => normalizeVerseStatus(v.status) === VerseStatus.LEARNING);
      return sortByCreatedAtDesc(filtered);
    } catch (error) {
      console.error("Не удалось загрузить стихи LEARNING:", error);
      return sortByCreatedAtDesc(verses.filter((v) => normalizeVerseStatus(v.status) === VerseStatus.LEARNING));
    }
  }, [verses]);

  const startTrainingFromActiveVerse = useCallback(async () => {
    if (actionPending || !previewActiveVerse) return;
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
        return;
      }
      const startIndex = Math.max(0, normalized.findIndex((v) => v.key === startKey));
      const startState = normalized[startIndex] ?? normalized[0];
      setTrainingVerses(normalized);
      setTrainingIndex(startIndex);
      setTrainingModeId(chooseModeId(startState));
      setPanelMode("training");
      setDirection(0);
      haptic("medium");
    } catch {
      haptic("error");
      showFeedback("Ошибка — попробуйте ещё раз", "error");
    } finally {
      setActionPending(false);
    }
  }, [actionPending, previewActiveVerse, onStatusChange, setPreviewOverride, fetchLearningVersesForTraining, showFeedback]);

  const handleTrainingTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "training") return;
    const target = e.target as HTMLElement | null;
    const ignore = Boolean(target?.closest('input, textarea, [contenteditable="true"]'));
    const touch = e.touches[0];
    if (!touch) return;
    trainingTouchStartRef.current = { x: touch.clientX, y: touch.clientY, ignore };
  };

  const handleTrainingTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (panelMode !== "training") return;
    const start = trainingTouchStartRef.current;
    trainingTouchStartRef.current = null;
    if (!start || start.ignore) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDy < 70 || absDy < absDx * 1.2) return;
    if (dy < 0) jumpToAdjacentTrainingVerse(1);
    else jumpToAdjacentTrainingVerse(-1);
  };
  const handleTrainingRate = useCallback(async (rating: Rating) => {
    if (panelMode !== "training" || trainingModeId === null) return;
    const current = trainingVerses[trainingIndex];
    if (!current) return;

    const masteryBefore = current.masteryLevel;
    const masteryAfter = clamp(masteryBefore + (MASTERY_DELTA_BY_RATING[rating] ?? 0), 0, MAX_MASTERY_LEVEL);
    const now = new Date();
    const score = SCORE_BY_RATING[rating];
    const nextReviewAt = calcNextReviewAt(masteryAfter, score);
    const becameLearned = masteryBefore < MAX_MASTERY_LEVEL && masteryAfter >= MAX_MASTERY_LEVEL;

    const updated: TrainingVerseState = {
      ...current,
      raw: {
        ...current.raw,
        masteryLevel: masteryAfter,
        repetitions: current.repetitions + 1,
        status: current.status === VerseStatus.STOPPED ? VerseStatus.STOPPED : (masteryAfter > 0 ? VerseStatus.LEARNING : VerseStatus.NEW),
      } as Verse,
      masteryLevel: masteryAfter,
      repetitions: current.repetitions + 1,
      status: current.status === VerseStatus.STOPPED ? VerseStatus.STOPPED : (masteryAfter > 0 ? VerseStatus.LEARNING : VerseStatus.NEW),
      lastModeId: trainingModeId,
      lastReviewedAt: now,
      nextReviewAt,
    };

    const updatedList = [...trainingVerses];
    updatedList[trainingIndex] = updated;
    setTrainingVerses(updatedList);
    setPreviewOverride(current.raw, {
      status: updated.status,
      masteryLevel: masteryAfter,
      repetitions: updated.repetitions,
    });

    if (becameLearned) {
      haptic("success");
      showFeedback("Стих выучен", "success");
    }

    const nextMode = getModeByShiftInProgressOrder(trainingModeId, MODE_SHIFT_BY_RATING[rating] ?? 1);
    if (isTrainingEligibleVerse(updated) && nextMode) {
      setTrainingModeId(nextMode);
    } else {
      const eligibleIndices = updatedList
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => isTrainingEligibleVerse(verse))
        .map(({ index }) => index);

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
  }, [panelMode, trainingModeId, trainingVerses, trainingIndex, setPreviewOverride, exitTrainingMode, showFeedback]);

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
            <Badge variant="outline">{activeIndex + 1} / {verses.length}</Badge>
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
                <div className="flex flex-wrap items-center gap-2">
                  {!isInTelegram ? (
                    <Button variant="ghost" size="sm" onClick={() => exitTrainingMode()} className="gap-1">
                      <ChevronLeft className="w-4 h-4" />К стиху
                    </Button>
                  ) : (
                    <div className="h-9" aria-hidden="true" />
                  )}
                  <Badge className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2" variant="outline">{Math.min(displayActive + 1, displayTotal)} / {displayTotal}</Badge>
                </div>
                {/* <div className="text-base sm:text-lg font-semibold truncate">{displayVerse.reference}</div>
                {trainingModeMeta && (
                  <>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">{trainingModeMeta.label}</div>
                    <div className="text-xs text-muted-foreground">{trainingModeMeta.description}</div>
                  </>
                )} */}
              </div>
              {!isInTelegram && (
                <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть галерею">
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
            {/* {trainingActiveVerse && (
              <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
                <TrainingMetaPill label="Уровень" value={`${trainingActiveVerse.masteryLevel}/${MAX_MASTERY_LEVEL}`} />
                <TrainingMetaPill label="Повторы" value={`${trainingActiveVerse.repetitions}`} />
              </div>
            )} */}
          </div>
        )}
      </div>
      <div className="flex-1 relative flex items-center justify-center px-4 sm:px-6" role="region" aria-roledescription="carousel" aria-label={panelMode === "training" ? "Карточки обучения" : "Карточки со стихами"}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={`${panelMode}-${getVerseIdentity(displayVerse)}`} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="w-full max-w-4xl focus-visible:outline-none" tabIndex={-1}>
            {panelMode === "preview" && previewActiveVerse ? (
              <VerseCard
                verse={displayVerse}
                isActive
                isFirst={activeIndex === 0}
                isLast={activeIndex === verses.length - 1}
                onNavigate={navigatePreviewTo}
                onHaptic={haptic}
                topBadge={<MasteryBadge status={normalizeVerseStatus(displayVerse.status)} />}
                centerAction={
                  <Button className="gap-2 min-w-[180px] shadow-lg" onClick={() => void startTrainingFromActiveVerse()} disabled={actionPending} aria-label="Учить этот стих">
                    <Play className="h-4 w-4" />УЧИТЬ
                  </Button>
                }
              />
            ) : panelMode === "training" && trainingActiveVerse && trainingModeId ? (
              <div onTouchStart={handleTrainingTouchStart} onTouchEnd={handleTrainingTouchEnd} className="w-full">
                <TrainingModeRenderer
                  renderer={MODE_PIPELINE[trainingModeId].renderer}
                  verse={asLegacyVerse(trainingActiveVerse)}
                  onRate={handleTrainingRate}
                  onBack={() => exitTrainingMode()}
                  topBadge={
                    trainingModeMeta ? (
                      <Badge className={`${trainingModeMeta.badgeClass} shadow-sm`}>
                        {trainingModeMeta.label}
                      </Badge>
                    ) : null
                  }
                />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {panelMode === "preview" && (
        <div className="shrink-0 px-4 sm:px-6 z-40">
          <div className="mx-auto w-full max-w-2xl flex items-center gap-3">
            {previewStatusAction && (
              <Button variant="secondary" className="flex-1 gap-2" onClick={() => void handlePreviewStatusAction()} disabled={actionPending} aria-label={previewStatusAction.label}>
                <previewStatusAction.icon className="h-4 w-4" />
                {previewStatusAction.label}
              </Button>
            )}
            <Button
              variant="outline"
              className={`gap-2 text-destructive hover:text-destructive ${previewStatusAction ? "" : "flex-1"}`}
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

      <div className="shrink-0 flex items-center justify-center gap-3 pt-3" style={{ paddingBottom: `${Math.max(20, bottomInset)}px` }}>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => (panelMode === "training" ? jumpToAdjacentTrainingVerse(-1) : navigatePreviewTo("prev"))}
          disabled={panelMode === "training" ? displayActive <= 0 || trainingEligibleIndices.length <= 1 : activeIndex === 0}
          aria-label="Предыдущий стих"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <DotProgress total={displayTotal} active={Math.min(displayActive, Math.max(0, displayTotal - 1))} />

        <Button
          variant="secondary"
          size="icon"
          onClick={() => (panelMode === "training" ? jumpToAdjacentTrainingVerse(1) : navigatePreviewTo("next"))}
          disabled={panelMode === "training" ? displayActive >= displayTotal - 1 || trainingEligibleIndices.length <= 1 : activeIndex === verses.length - 1}
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
