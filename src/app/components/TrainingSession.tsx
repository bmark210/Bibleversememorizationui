'use client'

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';

import { UserVersesService } from '@/api/services/UserVersesService';
import { VerseStatus } from '@/generated/prisma';
import type { Verse as LegacyVerse } from '../data/mockData';
import { TrainingModeRenderer, TrainingModeRendererKey } from './training-session/TrainingModeRenderer';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';
import {
  TrainingModeId,
  TRAINING_MODE_SHIFT_BY_RATING,
  chooseTrainingModeId,
  getRemainingTrainingModesCount,
  getTrainingModeByShiftInProgressOrder,
  isTrainingReviewRawMastery,
  normalizeRawMasteryLevel as normalizeSharedRawMasteryLevel,
  toTrainingStageMasteryLevel,
} from '@/shared/training/modeEngine';

type Rating = 0 | 1 | 2 | 3;
type SaveState = 'saving' | 'saved' | 'error' | 'skipped';

type ModeId = TrainingModeId;

type TrainingVerseInput = {
  id?: string | number | null;
  telegramId?: string | null;
  externalVerseId?: string | null;
  reference?: string | null;
  text?: string | null;
  translation?: string | null;
  status?: VerseStatus | string | null;
  masteryLevel?: number | null;
  repetitions?: number | null;
  lastReviewedAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
  nextReview?: string | Date | null; // mock fallback
};

interface TrainingSessionProps {
  verses: TrainingVerseInput[];
  allVerses?: TrainingVerseInput[];
  startFromVerseId?: string | null;
  onComplete: () => void;
  onExit: () => void;
}

interface SessionVerse {
  key: string;
  telegramId: string | null;
  externalVerseId: string;
  reference: string;
  text: string;
  translation: string;
  status: VerseStatus;
  rawMasteryLevel: number;
  masteryLevel: number;
  repetitions: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  lastModeId: ModeId | null;
}

interface ExerciseStep {
  attemptId: string;
  verseKey: string;
  modeId: ModeId;
  startedAt: number;
}

interface ReviewOutcome {
  attemptId: string;
  verseKey: string;
  modeId: ModeId;
  rating: Rating;
  score: number;
  threshold: number;
  passed: boolean;
  masteryBefore: number;
  masteryAfter: number;
  nextReviewAt: Date | null;
  durationMs: number;
  saveState: SaveState;
  saveError: string | null;
}

interface HistoryItem {
  attemptId: string;
  verseKey: string;
  reference: string;
  modeId: ModeId;
  score: number;
  passed: boolean;
  masteryBefore: number;
  masteryAfter: number;
  durationMs: number;
}

interface RuntimeState {
  verses: SessionVerse[];
  cursor: number;
  targetExercises: number;
  completedExercises: number;
  currentStep: ExerciseStep | null;
  lastOutcome: ReviewOutcome | null;
  history: HistoryItem[];
  finished: boolean;
}

const MODE_PIPELINE: Record<ModeId, { label: string; description: string; renderer: TrainingModeRendererKey; threshold: number; badgeClass: string }> = {
  [TrainingModeId.ClickChunks]: {
    label: 'Click Chunks',
    description: 'Stage 0. Нажимайте куски стиха в правильной последовательности.',
    renderer: TrainingModeRendererKey.ChunksOrder,
    threshold: 55,
    badgeClass: 'border-lime-500/30 bg-lime-500/10 text-lime-700',
  },
  [TrainingModeId.ClickWordsHinted]: {
    label: 'Click Words',
    description: 'Stage 1. Часть слов уже открыта: нажимайте скрытые слова стиха по порядку.',
    renderer: TrainingModeRendererKey.OrderHints,
    threshold: 70,
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
  },
  [TrainingModeId.ClickWordsNoHints]: {
    label: 'Click Words (No Hints)',
    description: 'Stage 2. Нажимайте слова стиха в правильной последовательности без подсказок.',
    renderer: TrainingModeRendererKey.Order,
    threshold: 60,
    badgeClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700',
  },
  [TrainingModeId.FirstLettersWithWordHints]: {
    label: 'First Letters With Word Hints',
    description: 'Stage 3. Часть слов уже открыта: нажимайте первые буквы скрытых слов по порядку.',
    renderer: TrainingModeRendererKey.LettersHints,
    threshold: 72,
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
  },
  [TrainingModeId.FirstLettersTapNoHints]: {
    label: 'Tap First Letters (No Hints)',
    description: 'Stage 4. Нажимайте первые буквы слов по порядку без подсказок.',
    renderer: TrainingModeRendererKey.LettersTap,
    threshold: 75,
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700',
  },
  [TrainingModeId.FirstLettersTyping]: {
    label: 'Typing First Letters',
    description: 'Stage 5. Введите первые буквы слов по порядку с клавиатуры.',
    renderer: TrainingModeRendererKey.LettersType,
    threshold: 78,
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700',
  },
  [TrainingModeId.FullRecall]: {
    label: 'Full Recall',
    description: 'Stage 6. Полный ввод стиха по памяти.',
    renderer: TrainingModeRendererKey.Typing,
    threshold: 85,
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-700',
  },
};

const SCORE_BY_RATING: Record<Rating, number> = {
  0: 35,
  1: 60,
  2: 84,
  3: 96,
};

const MASTERY_DELTA_BY_RATING: Record<Rating, number> = {
  0: -1, // Забыл
  1: 0,  // Сложно
  2: 1,  // Нормально
  3: 2,  // Отлично (перепрыгиваем один режим)
};

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeStatus(value: TrainingVerseInput['status']): VerseStatus {
  if (value === VerseStatus.STOPPED || value === 'STOPPED') return VerseStatus.STOPPED;
  if (value === VerseStatus.LEARNING || value === 'LEARNING') return VerseStatus.LEARNING;
  return VerseStatus.NEW;
}

function normalizeRawMasteryLevel(raw: number | null | undefined): number {
  return normalizeSharedRawMasteryLevel(raw);
}

function toStageMasteryLevel(rawMasteryLevel: number): number {
  return toTrainingStageMasteryLevel(rawMasteryLevel);
}

function masteryToProgress(masteryLevel: number) {
  return Math.round((clamp(masteryLevel, 0, TRAINING_STAGE_MASTERY_MAX) / TRAINING_STAGE_MASTERY_MAX) * 100);
}

function getVerseKey(verse: TrainingVerseInput, index: number) {
  return String(verse.externalVerseId ?? verse.id ?? verse.reference ?? `verse-${index}`);
}

function createSessionVerse(verse: TrainingVerseInput, index: number): SessionVerse | null {
  const text = typeof verse.text === 'string' ? verse.text.trim() : '';
  if (!text) return null;

  const externalVerseId = String(verse.externalVerseId ?? verse.id ?? '').trim();
  if (!externalVerseId) return null;

  const rawMasteryLevel = normalizeRawMasteryLevel(verse.masteryLevel ?? 0);

  return {
    key: getVerseKey(verse, index),
    telegramId: verse.telegramId ?? null,
    externalVerseId,
    reference: String(verse.reference ?? externalVerseId),
    text,
    translation: String(verse.translation ?? 'SYNOD'),
    status: normalizeStatus(verse.status),
    rawMasteryLevel,
    masteryLevel: toStageMasteryLevel(rawMasteryLevel),
    repetitions: Math.max(0, Math.round(verse.repetitions ?? 0)),
    lastReviewedAt: parseDate(verse.lastReviewedAt),
    nextReviewAt: parseDate(verse.nextReviewAt ?? verse.nextReview),
    lastModeId: null,
  };
}

function isReviewVerse(verse: Pick<SessionVerse, 'rawMasteryLevel'>) {
  return isTrainingReviewRawMastery(verse.rawMasteryLevel);
}

function getEligibleVerses(verses: SessionVerse[]) {
  return verses.filter((verse) =>
    verse.status !== VerseStatus.STOPPED
    && verse.rawMasteryLevel !== TRAINING_STAGE_MASTERY_MAX
  );
}

function isEligibleVerse(verse: SessionVerse) {
  return verse.status !== VerseStatus.STOPPED && verse.rawMasteryLevel !== TRAINING_STAGE_MASTERY_MAX;
}

function getModeByShiftInProgressOrder(modeId: ModeId, shift: number): ModeId | null {
  return getTrainingModeByShiftInProgressOrder(modeId, shift);
}

function getRemainingModesCountForVerse(verse: SessionVerse) {
  return getRemainingTrainingModesCount({
    rawMasteryLevel: verse.rawMasteryLevel,
    stageMasteryLevel: verse.masteryLevel,
  });
}

function chooseVerseIndex(verses: SessionVerse[], cursor: number): { index: number; nextCursor: number } | null {
  const candidates = verses
    .map((verse, index) => ({ verse, index, rand: Math.random() }))
    .filter(({ verse }) => isEligibleVerse(verse));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.verse.masteryLevel !== b.verse.masteryLevel) {
      return a.verse.masteryLevel - b.verse.masteryLevel;
    }
    const aTime = a.verse.lastReviewedAt?.getTime() ?? 0;
    const bTime = b.verse.lastReviewedAt?.getTime() ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    return a.rand - b.rand;
  });

  const picked = candidates[cursor % candidates.length];
  return { index: picked.index, nextCursor: cursor + 1 };
}

function chooseModeId(verse: SessionVerse): ModeId {
  return chooseTrainingModeId({
    rawMasteryLevel: verse.rawMasteryLevel,
    stageMasteryLevel: verse.masteryLevel,
    lastModeId: verse.lastModeId,
  });
}

function buildExerciseStep(runtime: RuntimeState): Pick<RuntimeState, 'cursor' | 'currentStep' | 'finished'> {
  const picked = chooseVerseIndex(runtime.verses, runtime.cursor);
  if (!picked) {
    return { cursor: runtime.cursor, currentStep: null, finished: true };
  }
  const verse = runtime.verses[picked.index];
  const modeId = chooseModeId(verse);
  return {
    cursor: picked.nextCursor,
    currentStep: {
      attemptId: `${verse.key}-${runtime.completedExercises}-${Date.now()}`,
      verseKey: verse.key,
      modeId,
      startedAt: Date.now(),
    },
    finished: false,
  };
}

function createStepForVerse(
  runtime: RuntimeState,
  verseIndex: number,
  modeId: ModeId
): ExerciseStep {
  const verse = runtime.verses[verseIndex];
  return {
    attemptId: `${verse.key}-${runtime.completedExercises}-${Date.now()}`,
    verseKey: verse.key,
    modeId,
    startedAt: Date.now(),
  };
}

function findRequestedStartVerseIndex(verses: SessionVerse[], startFromVerseId: string | null | undefined) {
  if (!startFromVerseId) return -1;
  return verses.findIndex((verse) =>
    isEligibleVerse(verse)
    && (
      verse.externalVerseId === startFromVerseId
      || verse.key === startFromVerseId
    )
  );
}

function buildNextModeStepForSameVerse(runtime: RuntimeState): ExerciseStep | null {
  const lastOutcome = runtime.lastOutcome;
  if (!lastOutcome) return null;

  const verseIndex = runtime.verses.findIndex((verse) => verse.key === lastOutcome.verseKey);
  if (verseIndex < 0) return null;

  const verse = runtime.verses[verseIndex];
  // Continue chaining modes only while the verse is still in training.
  if (!isEligibleVerse(verse)) return null;
  if (isReviewVerse(verse)) return null;

  const modeShift = MODE_SHIFT_BY_RATING[lastOutcome.rating] ?? 1;
  const nextModeId = getModeByShiftInProgressOrder(lastOutcome.modeId, modeShift);
  if (!nextModeId) return null;

  return createStepForVerse(runtime, verseIndex, nextModeId);
}

function advanceRuntimeAfterOutcome(prev: RuntimeState): RuntimeState {
  const nextModeForSameVerse = buildNextModeStepForSameVerse(prev);
  if (nextModeForSameVerse) {
    return {
      ...prev,
      currentStep: nextModeForSameVerse,
      lastOutcome: null,
      finished: false,
    };
  }

  const next = buildExerciseStep(prev);
  return {
    ...prev,
    ...next,
    lastOutcome: null,
  };
}

function createInitialRuntime(
  inputVerses: TrainingVerseInput[],
  startFromVerseId?: string | null
): RuntimeState {
  const verses = inputVerses
    .map((verse, index) => createSessionVerse(verse, index))
    .filter((verse): verse is SessionVerse => verse !== null);

  const eligibleVerses = getEligibleVerses(verses);
  const eligibleCount = eligibleVerses.length;
  const targetExercises = eligibleVerses.reduce(
    (sum, verse) => sum + getRemainingModesCountForVerse(verse),
    0
  );

  if (eligibleCount === 0) {
    return {
      verses,
      cursor: 0,
      targetExercises: 0,
      completedExercises: 0,
      currentStep: null,
      lastOutcome: null,
      history: [],
      finished: true,
    };
  }

  const seed: RuntimeState = {
    verses,
    cursor: 0,
    targetExercises,
    completedExercises: 0,
    currentStep: null,
    lastOutcome: null,
    history: [],
    finished: false,
  };

  const requestedStartVerseIndex = findRequestedStartVerseIndex(verses, startFromVerseId);
  if (requestedStartVerseIndex >= 0) {
    const requestedVerse = verses[requestedStartVerseIndex];
    return {
      ...seed,
      currentStep: createStepForVerse(seed, requestedStartVerseIndex, chooseModeId(requestedVerse)),
      finished: false,
    };
  }

  const next = buildExerciseStep(seed);
  return { ...seed, ...next };
}

function calcNextReviewAt(masteryLevel: number, score: number): Date {
  const base = SPACED_REPETITION_MS[clamp(masteryLevel, 0, TRAINING_STAGE_MASTERY_MAX)] ?? SPACED_REPETITION_MS[0];
  const multiplier = score >= 92 ? 1.25 : score >= 80 ? 1 : score >= 65 ? 0.75 : 0.5;
  return new Date(Date.now() + Math.round(base * multiplier));
}

function getTelegramId(): string | null {
  if (typeof window === 'undefined') return null;
  const fromStorage = localStorage.getItem('telegramId');
  if (fromStorage) return fromStorage;
  const tgUserId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return tgUserId ? String(tgUserId) : null;
}

function patchStatusForVerse(verse: SessionVerse): 'NEW' | 'LEARNING' | 'STOPPED' {
  if (verse.status === VerseStatus.STOPPED) return 'STOPPED';
  return verse.rawMasteryLevel > 0 ? 'LEARNING' : 'NEW';
}

async function persistVerseProgress(verse: SessionVerse) {
  const telegramId = verse.telegramId ?? getTelegramId();
  if (!telegramId) return false;

  await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, {
    masteryLevel: verse.rawMasteryLevel,
    repetitions: verse.repetitions,
    lastReviewedAt: verse.lastReviewedAt?.toISOString(),
    nextReviewAt: verse.nextReviewAt?.toISOString(),
    status: patchStatusForVerse(verse),
  });

  return true;
}

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function asLegacyVerse(verse: SessionVerse): LegacyVerse {
  const progress = masteryToProgress(verse.masteryLevel);
  return {
    id: verse.key,
    reference: verse.reference,
    text: verse.text,
    translation: verse.translation,
    testament: 'NT',
    tags: [],
    masteryLevel: progress,
    nextReview: verse.nextReviewAt ?? new Date(),
    totalReviews: verse.repetitions,
    correctReviews: Math.round((progress / 100) * Math.max(1, verse.repetitions)),
  };
}

function getCurrentVerse(runtime: RuntimeState): SessionVerse | null {
  if (!runtime.currentStep) return null;
  return runtime.verses.find((verse) => verse.key === runtime.currentStep?.verseKey) ?? null;
}

export function TrainingSession({
  verses,
  allVerses: _allVerses = [],
  startFromVerseId = null,
  onComplete,
  onExit,
}: TrainingSessionProps) {
  const [runtime, setRuntime] = useState<RuntimeState>(() => createInitialRuntime(verses, startFromVerseId));
  const touchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  useEffect(() => {
    setRuntime(createInitialRuntime(verses, startFromVerseId));
  }, [verses, startFromVerseId]);

  const currentVerse = getCurrentVerse(runtime);
  const currentMode = runtime.currentStep ? MODE_PIPELINE[runtime.currentStep.modeId] : null;
  const isCurrentVerseReview = currentVerse ? isReviewVerse(currentVerse) : false;

  const avgScore = runtime.history.length > 0
    ? Math.round(runtime.history.reduce((sum, item) => sum + item.score, 0) / runtime.history.length)
    : 0;
  const passedCount = runtime.history.filter((item) => item.passed).length;
  const gainedMastery = runtime.history.reduce((sum, item) => sum + Math.max(0, item.masteryAfter - item.masteryBefore), 0);

  const jumpToAdjacentVerse = (delta: -1 | 1) => {
    setRuntime((prev) => {
      if (!prev.currentStep || prev.lastOutcome) return prev;

      const eligibleIndices = prev.verses
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) =>
          verse.status !== VerseStatus.STOPPED
          && (isEligibleVerse(verse) || verse.key === prev.currentStep?.verseKey)
        )
        .map(({ index }) => index);

      if (eligibleIndices.length <= 1) return prev;

      const currentVerseIndex = prev.verses.findIndex(
        (verse) => verse.key === prev.currentStep?.verseKey
      );
      const currentEligiblePos = eligibleIndices.indexOf(currentVerseIndex);
      if (currentEligiblePos < 0) return prev;

      const nextPos = currentEligiblePos + delta;
      if (nextPos < 0 || nextPos >= eligibleIndices.length) return prev;

      const nextVerseIndex = eligibleIndices[nextPos];
      const nextVerse = prev.verses[nextVerseIndex];
      const nextModeId = chooseModeId(nextVerse);

      return {
        ...prev,
        currentStep: createStepForVerse(prev, nextVerseIndex, nextModeId),
        lastOutcome: null,
      };
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const ignore = Boolean(target?.closest('input, textarea, [contenteditable=\"true\"]'));
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, ignore };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || start.ignore) return;
    if (runtime.lastOutcome) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDy < 70) return;
    if (absDy < absDx * 1.2) return;

    if (dy < 0) {
      jumpToAdjacentVerse(1);
    } else {
      jumpToAdjacentVerse(-1);
    }
  };

  const handleRate = async (rating: Rating) => {
    if (!runtime.currentStep) return;

    const step = runtime.currentStep;
    const verseIndex = runtime.verses.findIndex((verse) => verse.key === step.verseKey);
    if (verseIndex < 0) return;

    const baseVerse = runtime.verses[verseIndex];
    const modeMeta = MODE_PIPELINE[step.modeId];
    const score = SCORE_BY_RATING[rating];
    const rawMasteryBefore = baseVerse.rawMasteryLevel;
    const masteryBefore = baseVerse.masteryLevel;
    const masteryDelta = MASTERY_DELTA_BY_RATING[rating] ?? 0;
    const rawMasteryAfter = Math.max(0, Math.round(rawMasteryBefore + masteryDelta));
    const masteryAfter = toStageMasteryLevel(rawMasteryAfter);
    const passed = masteryDelta > 0;
    const becameLearned = masteryBefore < TRAINING_STAGE_MASTERY_MAX && masteryAfter >= TRAINING_STAGE_MASTERY_MAX;
    const durationMs = Date.now() - step.startedAt;
    const now = new Date();
    const nextReviewAt = calcNextReviewAt(masteryAfter, score);

    const updatedVerse: SessionVerse = {
      ...baseVerse,
      rawMasteryLevel: rawMasteryAfter,
      masteryLevel: masteryAfter,
      repetitions: baseVerse.repetitions + 1,
      lastReviewedAt: now,
      nextReviewAt,
      lastModeId: step.modeId,
      status: baseVerse.status === VerseStatus.STOPPED
        ? VerseStatus.STOPPED
        : (rawMasteryAfter > 0 ? VerseStatus.LEARNING : VerseStatus.NEW),
    };

    const updatedVerses = [...runtime.verses];
    updatedVerses[verseIndex] = updatedVerse;

    const saveState: SaveState = (updatedVerse.telegramId ?? getTelegramId()) ? 'saving' : 'skipped';

    const nextRuntime: RuntimeState = {
      ...runtime,
      verses: updatedVerses,
      completedExercises: runtime.completedExercises + 1,
      lastOutcome: {
        attemptId: step.attemptId,
        verseKey: step.verseKey,
        modeId: step.modeId,
        rating,
        score,
        threshold: modeMeta.threshold,
        passed,
        masteryBefore,
        masteryAfter,
        nextReviewAt,
        durationMs,
        saveState,
        saveError: null,
      },
      history: [
        ...runtime.history,
        {
          attemptId: step.attemptId,
          verseKey: step.verseKey,
          reference: baseVerse.reference,
          modeId: step.modeId,
          score,
          passed,
          masteryBefore,
          masteryAfter,
          durationMs,
        },
      ],
    };

    setRuntime(advanceRuntimeAfterOutcome(nextRuntime));

    if (becameLearned) {
      toast.success('Стих выучен', {
        description: baseVerse.reference,
      });
    }

    if (saveState === 'saving') {
      try {
        await persistVerseProgress(updatedVerse);
      } catch (error) {
        console.error('Failed to persist training progress', error);
        toast.error('Не удалось сохранить прогресс по стиху');
      }
    }
  };

  const handleNextStep = () => {
    setRuntime((prev) => {
      if (prev.lastOutcome) return advanceRuntimeAfterOutcome(prev);
      const next = buildExerciseStep(prev);
      return { ...prev, ...next, lastOutcome: null };
    });
  };

  if (runtime.finished) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Trophy className="w-5 h-5 text-primary" />
                  {runtime.targetExercises > 0 ? 'Сессия завершена' : 'На сейчас упражнений нет'}
                </CardTitle>
                <CardDescription>
                  {runtime.targetExercises > 0
                    ? 'TrainingSession переработан под engine-подход: авто-режим, round-robin, spaced repetition.'
                    : `Для сессии нужны стихи со статусом не STOPPED и masteryLevel != ${TRAINING_STAGE_MASTERY_MAX} (изучение или повторение).`}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onExit}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {runtime.targetExercises > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatTile label="Упражнений" value={`${runtime.completedExercises}`} />
                  <StatTile label="Зачтено" value={`${passedCount}/${runtime.history.length}`} />
                  <StatTile label="Средний score" value={`${avgScore}%`} />
                  <StatTile label="Рост mastery" value={`+${gainedMastery}`} />
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="text-sm text-muted-foreground">Последние результаты</div>
                  {runtime.history.slice(-5).reverse().map((item) => (
                    <div key={item.attemptId} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.reference}</div>
                        <div className="text-xs text-muted-foreground">Режим {item.modeId} · {formatDuration(item.durationMs)}</div>
                      </div>
                      <Badge variant={item.passed ? 'secondary' : 'outline'}>{item.score}%</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Нет активных стихов для тренировки</AlertTitle>
                <AlertDescription>
                  Сессия берёт стихи по правилам движка: `status != STOPPED` и `masteryLevel != ${TRAINING_STAGE_MASTERY_MAX}`.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onExit}>Закрыть</Button>
            <Button onClick={onComplete}>Завершить тренировку</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!runtime.currentStep || !currentVerse || !currentMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Подготовка упражнения</CardTitle>
            <CardDescription>Собирается следующий шаг сессии...</CardDescription>
          </CardHeader>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={onExit}>Выйти</Button>
            <Button onClick={handleNextStep}>Продолжить</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const legacyVerse = asLegacyVerse(currentVerse);

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4 pt-20 md:pt-0 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={onExit} className="gap-1">
                  <ChevronLeft className="w-4 h-4" />
                  Выход
                </Button>
                <Badge className={currentMode.badgeClass}>Режим {runtime.currentStep.modeId}</Badge>
                {isCurrentVerseReview && (
                  <Badge variant="outline" className="border-violet-500/40 bg-violet-500/10 text-violet-700">
                    Повторение
                  </Badge>
                )}
              </div>
              {/* <div className="text-base sm:text-lg font-semibold truncate">{currentVerse.reference}</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">{currentMode.label}</div>
              <div className="text-[11px] text-muted-foreground/80 mt-1">
                Свайп ↑↓: переключить стих · После завершения режима — следующий режим этого же стиха
              </div> */}
            </div>
            <Button variant="ghost" size="icon" onClick={onExit} aria-label="Закрыть тренировку">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
            <MetaPill label="Уровень" value={`${currentVerse.masteryLevel}/${TRAINING_STAGE_MASTERY_MAX}`} />
            <MetaPill label="Повторы" value={`${currentVerse.repetitions}`} />
            </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
              <TrainingModeRenderer
                renderer={currentMode.renderer}
                verse={legacyVerse}
                onRate={handleRate}
              />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <span className="text-xl font-semibold">{'Уровень: '}{value}</span>
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-sm font-medium truncate">{'Повторы: '}{value}</span>
    </div>
  );
}

