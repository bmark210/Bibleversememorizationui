import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DashboardDailyGoalCardModel,
  DailyGoalGalleryContext,
  DailyGoalOnboardingSeen,
  DailyGoalPhase,
  DailyGoalProgress,
  DailyGoalProgressEvent,
  DailyGoalReadinessResponse,
  DailyGoalResumeMode,
  DailyGoalSession,
  DailyGoalTargetKind,
  DailyGoalTrainingStartDecision,
  DailyGoalUiState,
} from './types';
import { buildDailyGoalPlan, getVerseId, type DailyGoalVerseSource } from './planner';
import { TrainingModeId } from '@/shared/training/modeEngine';
import {
  getLocalDayKey,
  readDailyGoalOnboardingSeen,
  readDailyGoalSession,
  writeDailyGoalOnboardingSeen,
  writeDailyGoalSession,
} from './storage';

type TrainingBatchPreferencesLike = {
  newVersesCount: number;
  reviewVersesCount: number;
};

type UseDailyGoalControllerParams<TVerse extends DailyGoalVerseSource> = {
  telegramId: string | null;
  trainingBatchPreferences: TrainingBatchPreferencesLike | null;
  todayVerses: TVerse[];
  hasAnyUserVerses?: boolean;
  dailyGoalReadiness?: DailyGoalReadinessResponse | null;
  isDailyGoalReadinessLoading?: boolean;
};

type DailyGoalReminderModel = {
  visible: boolean;
  phase: 'learning' | 'review';
  progressLabel: string;
  nextTargetReference: string | null;
  needsFirstVerse: boolean;
};

type UseDailyGoalControllerResult = {
  session: DailyGoalSession | null;
  ui: DailyGoalUiState;
  dashboardCard: DashboardDailyGoalCardModel;
  reminder: DailyGoalReminderModel | null;
  galleryContext: DailyGoalGalleryContext | null;
  onboardingSeen: DailyGoalOnboardingSeen;
  markOnboardingSeen: (key: keyof DailyGoalOnboardingSeen) => void;
  ensureSessionForToday: () => DailyGoalSession | null;
  markDailyGoalStarted: () => void;
  markDailyGoalCompleted: () => void;
  setPreferredResumeMode: (mode: DailyGoalResumeMode) => void;
  getNextTargetVerseId: () => string | null;
  getNextTargetReference: () => string | null;
  decideStartFromVerse: (verseId: string) => DailyGoalTrainingStartDecision;
  applyProgressEvent: (event: DailyGoalProgressEvent) => { completedNow: boolean };
  markTargetSkipped: (externalVerseId: string) => void;
  hasUnsyncedCompletionCounter: boolean;
  markCompletionCounterSynced: () => void;
};

function toUniqueSet(list: string[] | undefined): Set<string> {
  return new Set((list ?? []).filter(Boolean));
}

function uniqueList(list: Iterable<string>) {
  return Array.from(new Set(Array.from(list).filter(Boolean)));
}

function normalizeGoalStatus(value: unknown): string {
  return String(value ?? '').toUpperCase();
}

function normalizePreferredResumeMode(
  value: unknown
): DailyGoalResumeMode | null {
  if (value === 'learning' || value === 'review') return value;
  return null;
}

function createEmptyProgress(): DailyGoalProgress {
  return {
    completedVerseIds: { new: [], review: [] },
    skippedVerseIds: { new: [], review: [] },
    startedAt: null,
    completedAt: null,
    completionCounterSyncedAt: null,
    lastActivePhase: 'empty',
    lastSuggestedVerseId: null,
    preferredResumeMode: null,
  };
}

function normalizeProgressAgainstPlan(progress: DailyGoalProgress, _session: DailyGoalSession): DailyGoalProgress {
  // Phase-based daily goal progress is not tied to a frozen target list anymore.
  // Keep saved IDs (deduped) so progress survives plan recalculation and status changes.
  return {
    ...progress,
    completedVerseIds: {
      new: uniqueList(progress.completedVerseIds.new ?? []),
      review: uniqueList(progress.completedVerseIds.review ?? []),
    },
    skippedVerseIds: {
      new: uniqueList(progress.skippedVerseIds?.new ?? []),
      review: uniqueList(progress.skippedVerseIds?.review ?? []),
    },
    preferredResumeMode: normalizePreferredResumeMode(progress.preferredResumeMode),
  };
}

function computeUiState(
  session: DailyGoalSession | null,
  readiness?: DailyGoalReadinessResponse | null
): DailyGoalUiState {
  if (!session) {
    return {
      phase: 'empty',
      nextTargetKind: null,
      nextTargetVerseId: null,
      progressCounts: { newDone: 0, newTotal: 0, reviewDone: 0, reviewTotal: 0 },
      isActive: false,
      isCompleted: false,
      isEmpty: true,
      hasShortages: false,
      preferredResumeMode: null,
      effectiveResumeMode: null,
      canStartDailyGoal: false,
      reviewStageWillBeSkipped: false,
      learningStageBlocked: false,
      phaseStates: {
        learning: {
          enabled: false,
          skipped: false,
          completed: false,
          currentPhase: false,
          preferred: false,
          total: 0,
          done: 0,
        },
        review: {
          enabled: false,
          skipped: false,
          completed: false,
          currentPhase: false,
          preferred: false,
          total: 0,
          done: 0,
        },
      },
    };
  }

  const completedNew = toUniqueSet(session.progress.completedVerseIds.new);
  const completedReview = toUniqueSet(session.progress.completedVerseIds.review);
  const skippedNew = toUniqueSet(session.progress.skippedVerseIds?.new);
  const skippedReview = toUniqueSet(session.progress.skippedVerseIds?.review);

  const requestedLearning = Math.max(
    0,
    readiness?.requested.learning ?? session.plan.requestedCounts.new
  );
  const requestedReview = Math.max(
    0,
    readiness?.requested.review ?? session.plan.requestedCounts.review
  );
  const availableLearning = Math.max(
    0,
    readiness?.available.learning ?? session.plan.availableCounts.new
  );
  const availableReview = Math.max(
    0,
    readiness?.available.review ?? session.plan.availableCounts.review
  );
  const reviewStageWillBeSkipped =
    readiness?.summary.reviewStageWillBeSkipped ??
    (requestedReview > 0 && availableReview === 0);
  const learningStageBlocked =
    readiness?.summary.mode === 'blocked_no_learning' ||
    (requestedLearning > 0 && availableLearning === 0);

  const newTotal = Math.max(
    0,
    readiness?.effective.learning ?? Math.min(requestedLearning, availableLearning)
  );
  const reviewTotal = Math.max(
    0,
    readiness?.effective.review ??
      (reviewStageWillBeSkipped ? 0 : Math.min(requestedReview, availableReview))
  );

  const newDone = Math.min(newTotal, new Set([...completedNew, ...skippedNew]).size);
  const reviewDone = Math.min(reviewTotal, new Set([...completedReview, ...skippedReview]).size);

  const nextNew = null;
  const nextReview = null;

  const isEmpty = newTotal + reviewTotal === 0;
  const learningPhaseDone = newDone >= newTotal;
  const reviewPhaseDone = reviewDone >= reviewTotal;
  const learningRequired = requestedLearning > 0;
  const reviewRequired = requestedReview > 0;
  const hasLearningTargets = newTotal > 0;
  const hasReviewTargets = reviewTotal > 0;

  let phase: DailyGoalPhase = 'empty';
  let nextTargetKind: DailyGoalTargetKind | null = null;
  let nextTargetVerseId: string | null = null;

  if (!isEmpty) {
    if (learningRequired && learningStageBlocked) {
      phase = 'learning';
      nextTargetKind = 'new';
      nextTargetVerseId = null;
    } else if (!learningPhaseDone) {
      phase = 'learning';
      nextTargetKind = 'new';
      nextTargetVerseId = nextNew;
    } else if (reviewRequired && (reviewStageWillBeSkipped || !hasReviewTargets)) {
      // Lax behavior: if there are no REVIEW verses today, the goal is considered complete after learning stage.
      phase = 'completed';
    } else if (!reviewPhaseDone) {
      phase = 'review';
      nextTargetKind = 'review';
      nextTargetVerseId = nextReview;
    } else {
      phase = 'completed';
    }
  }

  const preferredResumeMode = normalizePreferredResumeMode(session.progress.preferredResumeMode);
  const reviewEnabled = reviewRequired && !reviewStageWillBeSkipped && hasReviewTargets;
  const learningEnabled = learningRequired;

  const firstUnfinishedMode: DailyGoalResumeMode | null =
    learningEnabled && !learningPhaseDone
      ? 'learning'
      : reviewEnabled && !reviewPhaseDone
        ? 'review'
        : null;

  const effectiveResumeMode: DailyGoalResumeMode | null =
    preferredResumeMode &&
    ((preferredResumeMode === 'learning' &&
      learningEnabled &&
      !learningPhaseDone &&
      !learningStageBlocked) ||
      (preferredResumeMode === 'review' && reviewEnabled && !reviewPhaseDone))
      ? preferredResumeMode
      : firstUnfinishedMode;

  const canStartDailyGoal =
    readiness?.summary.canStartDailyGoal ??
    (!learningStageBlocked && (learningEnabled || reviewEnabled || !isEmpty));

  const learningCurrentPhase = phase === 'learning';
  const reviewCurrentPhase = phase === 'review';

  return {
    phase,
    nextTargetKind,
    nextTargetVerseId,
    progressCounts: { newDone, newTotal, reviewDone, reviewTotal },
    isActive: Boolean(session.progress.startedAt) && phase !== 'completed' && phase !== 'empty',
    isCompleted: phase === 'completed',
    isEmpty,
    hasShortages:
      (readiness?.phases.learning.missingCount ?? session.plan.shortages.new) > 0 ||
      (readiness?.phases.review.missingCount ?? session.plan.shortages.review) > 0,
    preferredResumeMode,
    effectiveResumeMode,
    canStartDailyGoal,
    reviewStageWillBeSkipped,
    learningStageBlocked,
    phaseStates: {
      learning: {
        enabled: learningEnabled,
        skipped: false,
        completed: learningEnabled ? learningPhaseDone : true,
        currentPhase: learningCurrentPhase,
        preferred: effectiveResumeMode === 'learning',
        total: newTotal,
        done: newDone,
      },
      review: {
        enabled: reviewEnabled,
        skipped: reviewStageWillBeSkipped,
        completed: reviewStageWillBeSkipped || !reviewEnabled ? true : reviewPhaseDone,
        currentPhase: reviewCurrentPhase,
        preferred: effectiveResumeMode === 'review',
        total: reviewTotal,
        done: reviewDone,
      },
    },
  };
}

function createSession(
  telegramId: string,
  dayKey: string,
  prefs: TrainingBatchPreferencesLike,
  todayVerses: DailyGoalVerseSource[]
): DailyGoalSession {
  const plan = buildDailyGoalPlan(todayVerses, prefs, { dayKey });
  return {
    version: 1,
    telegramId,
    dayKey,
    plan,
    progress: createEmptyProgress(),
  };
}

export function useDailyGoalController<TVerse extends DailyGoalVerseSource>({
  telegramId,
  trainingBatchPreferences,
  todayVerses,
  hasAnyUserVerses,
  dailyGoalReadiness,
  isDailyGoalReadinessLoading = false,
}: UseDailyGoalControllerParams<TVerse>): UseDailyGoalControllerResult {
  const [session, setSession] = useState<DailyGoalSession | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<DailyGoalOnboardingSeen>({});

  useEffect(() => {
    setOnboardingSeen(readDailyGoalOnboardingSeen());
  }, []);

  const persistSession = useCallback((next: DailyGoalSession | null) => {
    setSession(next);
    writeDailyGoalSession(next);
  }, []);

  useEffect(() => {
    if (!telegramId || !trainingBatchPreferences) {
      persistSession(null);
      return;
    }

    const dayKey = getLocalDayKey();
    const stored = readDailyGoalSession();
    const isStoredValid =
      stored &&
      stored.version === 1 &&
      stored.telegramId === telegramId &&
      stored.dayKey === dayKey;

    if (!isStoredValid) {
      persistSession(createSession(telegramId, dayKey, trainingBatchPreferences, todayVerses));
      return;
    }

    const normalizedStored: DailyGoalSession = {
      ...stored,
      progress: normalizeProgressAgainstPlan(stored.progress, stored),
    };

    const hasStarted = Boolean(normalizedStored.progress.startedAt) || Boolean(normalizedStored.progress.completedAt);
    if (hasStarted) {
      const reconciledPlan = buildDailyGoalPlan(todayVerses, trainingBatchPreferences, {
        dayKey,
      });
      const reconciledSessionBase: DailyGoalSession = {
        ...normalizedStored,
        plan: reconciledPlan,
      };
      const reconciledSession: DailyGoalSession = {
        ...reconciledSessionBase,
        progress: normalizeProgressAgainstPlan(reconciledSessionBase.progress, reconciledSessionBase),
      };
      persistSession(reconciledSession);
      return;
    }

    const rebuilt = createSession(
      telegramId,
      dayKey,
      trainingBatchPreferences,
      todayVerses
    );
    persistSession(rebuilt);
  }, [telegramId, trainingBatchPreferences, todayVerses, persistSession]);

  const ui = useMemo(() => computeUiState(session, dailyGoalReadiness), [session, dailyGoalReadiness]);

  const findVerseById = useCallback(
    (verseId: string | null) => {
      if (!verseId) return null;
      return todayVerses.find((verse) => getVerseId(verse) === verseId) ?? null;
    },
    [todayVerses]
  );

  const getNextTargetVerseId = useCallback(() => ui.nextTargetVerseId, [ui.nextTargetVerseId]);

  const getNextTargetReference = useCallback(() => {
    const verse = findVerseById(ui.nextTargetVerseId);
    return verse && typeof (verse as { reference?: unknown }).reference === 'string'
      ? ((verse as { reference?: string }).reference ?? null)
      : null;
  }, [findVerseById, ui.nextTargetVerseId]);

  const markOnboardingSeen = useCallback((key: keyof DailyGoalOnboardingSeen) => {
    setOnboardingSeen((prev) => {
      const next = { ...prev, [key]: true } as DailyGoalOnboardingSeen;
      writeDailyGoalOnboardingSeen(next);
      return next;
    });
  }, []);

  const ensureSessionForToday = useCallback(() => {
    if (!telegramId || !trainingBatchPreferences) return null;
    if (session) return session;
    const next = createSession(telegramId, getLocalDayKey(), trainingBatchPreferences, todayVerses);
    persistSession(next);
    return next;
  }, [telegramId, trainingBatchPreferences, session, todayVerses, persistSession]);

  const markDailyGoalStarted = useCallback(() => {
    const current = ensureSessionForToday();
    if (!current) return;
    if (current.progress.startedAt) return;
    const next: DailyGoalSession = {
      ...current,
      progress: {
        ...current.progress,
        startedAt: new Date().toISOString(),
        lastActivePhase: computeUiState(current, dailyGoalReadiness).phase,
      },
    };
    persistSession(next);
  }, [ensureSessionForToday, persistSession, dailyGoalReadiness]);

  const markDailyGoalCompleted = useCallback(() => {
    if (!session) return;
    if (session.progress.completedAt) return;
    const next: DailyGoalSession = {
      ...session,
      progress: {
        ...session.progress,
        completedAt: new Date().toISOString(),
        lastActivePhase: 'completed',
      },
    };
    persistSession(next);
  }, [session, persistSession]);

  const setPreferredResumeMode = useCallback(
    (mode: DailyGoalResumeMode) => {
      const current = ensureSessionForToday();
      if (!current) return;
      const currentUi = computeUiState(current, dailyGoalReadiness);
      if (mode === 'learning' && (!currentUi.phaseStates.learning.enabled || currentUi.learningStageBlocked)) {
        return;
      }
      if (mode === 'review' && !currentUi.phaseStates.review.enabled) {
        return;
      }
      if (current.progress.preferredResumeMode === mode) return;
      persistSession({
        ...current,
        progress: {
          ...current.progress,
          preferredResumeMode: mode,
        },
      });
    },
    [ensureSessionForToday, persistSession, dailyGoalReadiness]
  );

  const applyProgressEvent = useCallback(
    (event: DailyGoalProgressEvent) => {
      if (!event.saved) return { completedNow: false };
      const current = ensureSessionForToday();
      if (!current) return { completedNow: false };
      const currentUiBefore = computeUiState(current, dailyGoalReadiness);
      if (currentUiBefore.phase !== 'learning' && currentUiBefore.phase !== 'review') {
        return { completedNow: false };
      }

      const targetId = String(event.externalVerseId);
      const beforeStatus = normalizeGoalStatus(event.before.status);
      const afterStatus = normalizeGoalStatus(event.after.status);
      const isLearningLike = beforeStatus === 'LEARNING' || afterStatus === 'LEARNING';
      const isReviewLike =
        beforeStatus === 'REVIEW' ||
        afterStatus === 'REVIEW' ||
        beforeStatus === 'MASTERED' ||
        afterStatus === 'MASTERED';
      const isWaitingLike = beforeStatus === 'WAITING' || afterStatus === 'WAITING';

      let targetKind: DailyGoalTargetKind | null = null;
      if (isReviewLike && !isLearningLike) {
        targetKind = 'review';
      } else if (isLearningLike || isWaitingLike) {
        targetKind = 'new';
      } else if (isReviewLike) {
        targetKind = 'review';
      }
      if (!targetKind) return { completedNow: false };

      // Daily goal progress is intentionally stricter than generic training progress:
      // - learning counts only after masteryLevel becomes > 7
      // - review counts only after completing "typing first letters" mode
      if (targetKind === 'new') {
        if (!(Number(event.after.masteryLevel ?? 0) > 7)) {
          return { completedNow: false };
        }
      } else {
        if (Number(event.trainingModeId ?? 0) !== TrainingModeId.FirstLettersTyping) {
          return { completedNow: false };
        }
      }

      const completedNew = toUniqueSet(current.progress.completedVerseIds.new);
      const completedReview = toUniqueSet(current.progress.completedVerseIds.review);
      const skippedNew = toUniqueSet(current.progress.skippedVerseIds?.new);
      const skippedReview = toUniqueSet(current.progress.skippedVerseIds?.review);

      const wasAlreadyCompleted =
        targetKind === 'new' ? completedNew.has(targetId) : completedReview.has(targetId);
      if (wasAlreadyCompleted) {
        return { completedNow: false };
      }

      if (targetKind === 'new') {
        completedNew.add(targetId);
        skippedNew.delete(targetId);
      } else {
        completedReview.add(targetId);
        skippedReview.delete(targetId);
      }

      const nextProgress: DailyGoalProgress = {
        ...current.progress,
        startedAt: current.progress.startedAt ?? event.occurredAt ?? new Date().toISOString(),
        completedVerseIds: {
          new: uniqueList(completedNew),
          review: uniqueList(completedReview),
        },
        skippedVerseIds: {
          new: uniqueList(skippedNew),
          review: uniqueList(skippedReview),
        },
        lastSuggestedVerseId: targetId,
      };

      let nextSession: DailyGoalSession = {
        ...current,
        progress: nextProgress,
      };

      const nextUi = computeUiState(nextSession, dailyGoalReadiness);
      const completedNow = nextUi.phase === 'completed' && current.progress.completedAt == null;
      nextSession = {
        ...nextSession,
        progress: {
          ...nextSession.progress,
          lastActivePhase: nextUi.phase,
          lastSuggestedVerseId: nextUi.nextTargetVerseId ?? targetId,
          completedAt:
            nextUi.phase === 'completed'
              ? (nextSession.progress.completedAt ?? new Date().toISOString())
              : nextSession.progress.completedAt,
        },
      };

      persistSession(nextSession);
      return { completedNow };
    },
    [ensureSessionForToday, persistSession, dailyGoalReadiness]
  );

  const markCompletionCounterSynced = useCallback(() => {
    if (!session || !session.progress.completedAt) return;
    if (session.progress.completionCounterSyncedAt) return;
    persistSession({
      ...session,
      progress: {
        ...session.progress,
        completionCounterSyncedAt: new Date().toISOString(),
      },
    });
  }, [session, persistSession]);

  const markTargetSkipped = useCallback(
    (externalVerseId: string) => {
      const current = ensureSessionForToday();
      if (!current) return;
      const targetId = String(externalVerseId);
      const newTargets = new Set(current.plan.targetVerseIds.new);
      const reviewTargets = new Set(current.plan.targetVerseIds.review);
      if (!newTargets.has(targetId) && !reviewTargets.has(targetId)) return;

      const skippedNew = toUniqueSet(current.progress.skippedVerseIds?.new);
      const skippedReview = toUniqueSet(current.progress.skippedVerseIds?.review);

      if (newTargets.has(targetId)) skippedNew.add(targetId);
      if (reviewTargets.has(targetId)) skippedReview.add(targetId);

      let nextSession: DailyGoalSession = {
        ...current,
        progress: {
          ...current.progress,
          skippedVerseIds: {
            new: uniqueList(skippedNew),
            review: uniqueList(skippedReview),
          },
        },
      };
      const nextUi = computeUiState(nextSession, dailyGoalReadiness);
      nextSession = {
        ...nextSession,
        progress: {
          ...nextSession.progress,
          lastActivePhase: nextUi.phase,
          lastSuggestedVerseId: nextUi.nextTargetVerseId ?? nextSession.progress.lastSuggestedVerseId,
          completedAt:
            nextUi.phase === 'completed'
              ? (nextSession.progress.completedAt ?? new Date().toISOString())
              : nextSession.progress.completedAt,
        },
      };
      persistSession(nextSession);
    },
    [ensureSessionForToday, persistSession, dailyGoalReadiness]
  );

  const decideStartFromVerse = useCallback(
    (verseId: string): DailyGoalTrainingStartDecision => {
      if (!session) return { kind: 'allow' };
      const currentUi = computeUiState(session, dailyGoalReadiness);
      if (currentUi.phase !== 'learning' && currentUi.phase !== 'review') return { kind: 'allow' };
      const selectedVerse = todayVerses.find((verse) => getVerseId(verse) === String(verseId));
      const selectedStatus = normalizeGoalStatus((selectedVerse as { status?: unknown } | undefined)?.status);

      if (currentUi.phase === 'learning') {
        if (currentUi.learningStageBlocked) {
          return {
            kind: 'warn',
            phase: 'learning',
            message: 'Для выполнения цели добавьте стих или переведите существующий в статус LEARNING.',
          };
        }
        // Soft guidance: user is allowed to start with repetition first even during learning phase.
        if (selectedVerse && (selectedStatus === 'REVIEW' || selectedStatus === 'MASTERED')) {
          return { kind: 'allow' };
        }
        if (selectedVerse && selectedStatus !== 'LEARNING') {
          return {
            kind: 'warn',
            phase: 'learning',
            message: 'Сейчас этап «Изучение». В режиме training будет выбран фильтр «Изучение».',
          };
        }
        return { kind: 'allow' };
      }

      if (currentUi.phase === 'review') {
        // Symmetric soft guidance: allow user to start with learning first if they want.
        if (selectedVerse && selectedStatus === 'LEARNING') {
          return { kind: 'allow' };
        }
        if (selectedVerse && selectedStatus !== 'REVIEW' && selectedStatus !== 'MASTERED') {
          return {
            kind: 'warn',
            phase: 'review',
            message: 'Сейчас этап «Повторение». В режиме training будет выбран фильтр «Повторение».',
          };
        }
      }

      return { kind: 'allow' };
    },
    [session, todayVerses, dailyGoalReadiness]
  );

  const shortageHints = useMemo(() => {
    if (!session && !dailyGoalReadiness) return [] as string[];
    const hints: string[] = [];
    const learningMissing =
      dailyGoalReadiness?.phases.learning.missingCount ?? session?.plan.shortages.new ?? 0;
    const reviewMissing =
      dailyGoalReadiness?.phases.review.missingCount ?? session?.plan.shortages.review ?? 0;
    const reviewAvailable =
      dailyGoalReadiness?.available.review ?? session?.plan.availableCounts.review ?? 0;
    if (learningMissing > 0) {
      hints.push(`Не хватает стихов в изучении: ${learningMissing}`);
    }
    if (
      reviewMissing > 0 &&
      reviewAvailable > 0 &&
      !Boolean(dailyGoalReadiness?.summary.reviewStageWillBeSkipped)
    ) {
      hints.push(`Не хватает стихов для повторения: ${reviewMissing}`);
    }
    return hints;
  }, [session, dailyGoalReadiness]);

  const dashboardCard = useMemo<DashboardDailyGoalCardModel>(() => {
    const requestedCounts = dailyGoalReadiness
      ? {
          new: dailyGoalReadiness.requested.learning,
          review: dailyGoalReadiness.requested.review,
        }
      : session?.plan.requestedCounts ?? {
          new: Math.max(0, Math.round(trainingBatchPreferences?.newVersesCount ?? 0)),
          review: Math.max(0, Math.round(trainingBatchPreferences?.reviewVersesCount ?? 0)),
        };
    const availableCounts = dailyGoalReadiness
      ? {
          new: dailyGoalReadiness.available.learning,
          review: dailyGoalReadiness.available.review,
        }
      : session?.plan.availableCounts ?? { new: 0, review: 0 };
    const needsLearningVersesForGoal =
      dailyGoalReadiness?.summary.mode === 'blocked_no_learning' ||
      (requestedCounts.new > 0 && availableCounts.new === 0);
    const reviewStageWillBeSkipped =
      dailyGoalReadiness?.summary.reviewStageWillBeSkipped ??
      (requestedCounts.review > 0 && availableCounts.review === 0);
    const needsFirstVerse = hasAnyUserVerses === false || (hasAnyUserVerses == null && todayVerses.length === 0);
    return {
      ui,
      requestedCounts,
      availableCounts,
      nextTargetReference: getNextTargetReference(),
      shortageHints,
      canStart: Boolean(telegramId && trainingBatchPreferences) && ui.canStartDailyGoal && !ui.isEmpty,
      needsFirstVerse,
      onboardingPending: !onboardingSeen.dashboardIntro,
      needsLearningVersesForGoal,
      reviewStageWillBeSkipped,
      readiness: dailyGoalReadiness ?? null,
      isReadinessLoading: isDailyGoalReadinessLoading,
    };
  }, [
    session,
    trainingBatchPreferences,
    ui,
    getNextTargetReference,
    shortageHints,
    telegramId,
    hasAnyUserVerses,
    todayVerses.length,
    onboardingSeen.dashboardIntro,
    dailyGoalReadiness,
    isDailyGoalReadinessLoading,
  ]);

  const reminder = useMemo<DailyGoalReminderModel | null>(() => {
    if (ui.phase !== 'learning' && ui.phase !== 'review') return null;
    const progressLabel = ui.phaseStates.review.enabled
      ? `Изучение ${ui.progressCounts.newDone}/${ui.progressCounts.newTotal} · Повторение ${ui.progressCounts.reviewDone}/${ui.progressCounts.reviewTotal}`
      : `Изучение ${ui.progressCounts.newDone}/${ui.progressCounts.newTotal}`;
    return {
      visible: true,
      phase: ui.effectiveResumeMode ?? ui.phase,
      progressLabel,
      nextTargetReference: getNextTargetReference(),
      needsFirstVerse: hasAnyUserVerses === false || (hasAnyUserVerses == null && todayVerses.length === 0),
    };
  }, [ui, getNextTargetReference, hasAnyUserVerses, todayVerses.length]);

  const galleryContext = useMemo<DailyGoalGalleryContext | null>(() => {
    if (!session) return null;
    if (ui.phase === 'empty') return null;
    const phase = ui.phase === 'learning' || ui.phase === 'review' || ui.phase === 'completed' ? ui.phase : 'completed';
    return {
      phase,
      targetVerseIdsByPhase: {
        learning: session.plan.targetVerseIds.new,
        review: session.plan.targetVerseIds.review,
      },
      completedVerseIdsByPhase: {
        learning: session.progress.completedVerseIds.new,
        review: session.progress.completedVerseIds.review,
      },
      nextTargetVerseId: ui.nextTargetVerseId,
      showGuideBanner: ui.phase === 'learning' || ui.phase === 'review',
      preferredResumeMode: ui.preferredResumeMode,
      effectiveResumeMode: ui.effectiveResumeMode,
      reviewStageEnabled: ui.phaseStates.review.enabled,
      reviewStageSkipped: ui.phaseStates.review.skipped,
      canStartDailyGoal: ui.canStartDailyGoal,
      learningStageBlocked: ui.learningStageBlocked,
      progressCounts: ui.progressCounts,
      phaseStates: ui.phaseStates,
    };
  }, [session, ui]);

  const hasUnsyncedCompletionCounter = useMemo(
    () => Boolean(session?.progress.completedAt && !session?.progress.completionCounterSyncedAt),
    [session?.progress.completedAt, session?.progress.completionCounterSyncedAt]
  );

  return {
    session,
    ui,
    dashboardCard,
    reminder,
    galleryContext,
    onboardingSeen,
    markOnboardingSeen,
    ensureSessionForToday,
    markDailyGoalStarted,
    markDailyGoalCompleted,
    setPreferredResumeMode,
    getNextTargetVerseId,
    getNextTargetReference,
    decideStartFromVerse,
    applyProgressEvent,
    markTargetSkipped,
    hasUnsyncedCompletionCounter,
    markCompletionCounterSynced,
  };
}
