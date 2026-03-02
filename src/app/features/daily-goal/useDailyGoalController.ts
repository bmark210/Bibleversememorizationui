import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DashboardDailyGoalCardModel,
  DailyGoalGalleryContext,
  DailyGoalOnboardingSeen,
  DailyGoalReadinessResponse,
  DailyGoalResumeMode,
  DailyGoalServerStateV2,
  DailyGoalTrainingStartDecision,
  DailyGoalUiState,
} from "./types";
import { computeDailyGoalUiState } from "./projection";
import {
  readDailyGoalOnboardingSeen,
  writeDailyGoalOnboardingSeen,
} from "./storage";

type TrainingBatchPreferencesLike = {
  newVersesCount: number;
  reviewVersesCount: number;
};

type DailyGoalVerseSource = {
  id?: string | number | null;
  externalVerseId?: string | null;
  status?: string | null;
};

type UseDailyGoalControllerParams<TVerse extends DailyGoalVerseSource> = {
  telegramId: string | null;
  trainingBatchPreferences: TrainingBatchPreferencesLike | null;
  todayVerses: TVerse[];
  hasAnyUserVerses?: boolean;
  dailyGoalServerState?: DailyGoalServerStateV2 | null;
  dailyGoalReadiness?: DailyGoalReadinessResponse | null;
  isDailyGoalReadinessLoading?: boolean;
};

type DailyGoalReminderModel = {
  visible: boolean;
  phase: "learning" | "review";
  progressLabel: string;
  needsFirstVerse: boolean;
};

type UseDailyGoalControllerResult = {
  ui: DailyGoalUiState;
  dashboardCard: DashboardDailyGoalCardModel;
  reminder: DailyGoalReminderModel | null;
  galleryContext: DailyGoalGalleryContext | null;
  onboardingSeen: DailyGoalOnboardingSeen;
  markOnboardingSeen: (key: keyof DailyGoalOnboardingSeen) => void;
  setPreferredResumeMode: (mode: DailyGoalResumeMode) => void;
  decideStartFromVerse: (verseId: string) => DailyGoalTrainingStartDecision;
};

function getVerseIdentity(verse: DailyGoalVerseSource): string {
  return String(verse.externalVerseId ?? verse.id ?? "");
}

function normalizeGoalStatus(value: unknown): string {
  return String(value ?? "").toUpperCase();
}

export function useDailyGoalController<TVerse extends DailyGoalVerseSource>({
  telegramId,
  trainingBatchPreferences,
  todayVerses,
  hasAnyUserVerses,
  dailyGoalServerState,
  dailyGoalReadiness,
  isDailyGoalReadinessLoading = false,
}: UseDailyGoalControllerParams<TVerse>): UseDailyGoalControllerResult {
  const [onboardingSeen, setOnboardingSeen] = useState<DailyGoalOnboardingSeen>(
    {}
  );
  const [optimisticPreferredResumeMode, setOptimisticPreferredResumeMode] =
    useState<DailyGoalResumeMode | null | undefined>(undefined);

  useEffect(() => {
    setOnboardingSeen(readDailyGoalOnboardingSeen());
  }, []);

  useEffect(() => {
    // Server snapshot is the source of truth; optimistic override lives only until next snapshot.
    setOptimisticPreferredResumeMode(undefined);
  }, [
    dailyGoalServerState?.dayKey,
    dailyGoalServerState?.meta.updatedAt,
    dailyGoalServerState?.progress.preferredResumeMode,
  ]);

  const projectedState = useMemo<DailyGoalServerStateV2 | null>(() => {
    if (!dailyGoalServerState) return null;
    if (optimisticPreferredResumeMode === undefined) return dailyGoalServerState;
    return {
      ...dailyGoalServerState,
      progress: {
        ...dailyGoalServerState.progress,
        preferredResumeMode: optimisticPreferredResumeMode,
      },
    };
  }, [dailyGoalServerState, optimisticPreferredResumeMode]);

  const ui = useMemo(
    () =>
      computeDailyGoalUiState({
        state: projectedState,
        readiness: dailyGoalReadiness,
      }),
    [projectedState, dailyGoalReadiness]
  );

  const markOnboardingSeen = useCallback((key: keyof DailyGoalOnboardingSeen) => {
    setOnboardingSeen((prev) => {
      const next = { ...prev, [key]: true } as DailyGoalOnboardingSeen;
      writeDailyGoalOnboardingSeen(next);
      return next;
    });
  }, []);

  const setPreferredResumeMode = useCallback(
    (mode: DailyGoalResumeMode) => {
      if (
        mode === "learning" &&
        (!ui.phaseStates.learning.enabled || ui.learningStageBlocked)
      ) {
        return;
      }
      if (mode === "review" && !ui.phaseStates.review.enabled) {
        return;
      }
      setOptimisticPreferredResumeMode(mode);
    },
    [ui.phaseStates.learning.enabled, ui.phaseStates.review.enabled, ui.learningStageBlocked]
  );

  const shortageHints = useMemo(() => {
    const hints: string[] = [];
    if (!dailyGoalReadiness) return hints;
    if (dailyGoalReadiness.phases.learning.missingCount > 0) {
      hints.push(
        `Не хватает стихов в изучении: ${dailyGoalReadiness.phases.learning.missingCount}`
      );
    }
    if (
      dailyGoalReadiness.phases.review.missingCount > 0 &&
      !dailyGoalReadiness.summary.reviewStageWillBeSkipped
    ) {
      hints.push(
        `Не хватает стихов для повторения: ${dailyGoalReadiness.phases.review.missingCount}`
      );
    }
    return hints;
  }, [dailyGoalReadiness]);

  const dashboardCard = useMemo<DashboardDailyGoalCardModel>(() => {
    const resolvedHasAnyUserVerses =
      dailyGoalReadiness?.summary.hasAnyUserVerses ?? hasAnyUserVerses;
    const requestedCounts = dailyGoalReadiness
      ? {
          new: dailyGoalReadiness.requested.learning,
          review: dailyGoalReadiness.requested.review,
        }
      : projectedState
        ? {
            new: projectedState.plan.requestedCounts.new,
            review: projectedState.plan.requestedCounts.review,
          }
        : {
            new: Math.max(
              0,
              Math.round(trainingBatchPreferences?.newVersesCount ?? 0)
            ),
            review: Math.max(
              0,
              Math.round(trainingBatchPreferences?.reviewVersesCount ?? 0)
            ),
          };

    const availableCounts = dailyGoalReadiness
      ? {
          new: dailyGoalReadiness.available.learning,
          review: dailyGoalReadiness.available.review,
        }
      : { new: 0, review: 0 };

    const needsFirstVerse =
      resolvedHasAnyUserVerses === false ||
      (resolvedHasAnyUserVerses == null && todayVerses.length === 0);
    const needsLearningVersesForGoal =
      dailyGoalReadiness?.summary.mode === "blocked_no_learning" ||
      (requestedCounts.new > 0 && availableCounts.new === 0);
    const reviewStageWillBeSkipped =
      dailyGoalReadiness?.summary.reviewStageWillBeSkipped ??
      (requestedCounts.review > 0 && availableCounts.review === 0);
    const reviewStagePendingNotDue =
      dailyGoalReadiness?.summary.reviewStagePendingNotDue ?? false;

    return {
      ui,
      requestedCounts,
      availableCounts,
      shortageHints,
      canStart:
        Boolean(telegramId && trainingBatchPreferences) &&
        ui.canStartDailyGoal &&
        !ui.isEmpty &&
        !needsFirstVerse,
      needsFirstVerse,
      onboardingPending: !onboardingSeen.dashboardIntro,
      needsLearningVersesForGoal,
      reviewStageWillBeSkipped,
      reviewStagePendingNotDue,
      readiness: dailyGoalReadiness ?? null,
      isReadinessLoading: isDailyGoalReadinessLoading,
    };
  }, [
    dailyGoalReadiness,
    projectedState,
    trainingBatchPreferences,
    hasAnyUserVerses,
    todayVerses.length,
    ui,
    shortageHints,
    telegramId,
    onboardingSeen.dashboardIntro,
    isDailyGoalReadinessLoading,
  ]);

  const reminder = useMemo<DailyGoalReminderModel | null>(() => {
    if ((ui.phase !== "learning" && ui.phase !== "review") || !ui.canStartDailyGoal) {
      return null;
    }
    const resolvedHasAnyUserVerses =
      dailyGoalReadiness?.summary.hasAnyUserVerses ?? hasAnyUserVerses;
    const needsFirstVerse =
      resolvedHasAnyUserVerses === false ||
      (resolvedHasAnyUserVerses == null && todayVerses.length === 0);
    const progressLabel = ui.phaseStates.review.enabled
      ? `Изучение ${ui.progressCounts.newDone}/${ui.progressCounts.newTotal} · Повторение ${ui.progressCounts.reviewDone}/${ui.progressCounts.reviewTotal}`
      : `Изучение ${ui.progressCounts.newDone}/${ui.progressCounts.newTotal}`;
    return {
      visible: true,
      phase: ui.effectiveResumeMode ?? ui.phase,
      progressLabel,
      needsFirstVerse,
    };
  }, [ui, hasAnyUserVerses, todayVerses.length]);

  const galleryContext = useMemo<DailyGoalGalleryContext | null>(() => {
    if (!projectedState) return null;
    if (ui.phase === "empty") return null;
    const phase =
      ui.phase === "learning" || ui.phase === "review" || ui.phase === "completed"
        ? ui.phase
        : "completed";
    return {
      phase,
      completedVerseIdsByPhase: {
        learning: projectedState.progress.completedVerseIds.new,
        review: projectedState.progress.completedVerseIds.review,
      },
      showGuideBanner: ui.phase === "learning" || ui.phase === "review",
      preferredResumeMode: ui.preferredResumeMode,
      effectiveResumeMode: ui.effectiveResumeMode,
      reviewStageEnabled: ui.phaseStates.review.enabled,
      reviewStageSkipped: ui.phaseStates.review.skipped,
      canStartDailyGoal: ui.canStartDailyGoal,
      learningStageBlocked: ui.learningStageBlocked,
      progressCounts: ui.progressCounts,
      phaseStates: ui.phaseStates,
    };
  }, [projectedState, ui]);

  const decideStartFromVerse = useCallback(
    (verseId: string): DailyGoalTrainingStartDecision => {
      if (ui.learningStageBlocked) {
        return {
          kind: "warn",
          phase: "learning",
          message:
            "Для выполнения ежедневной цели нужны стихи в статусе LEARNING. Добавьте новый стих или переведите существующий в изучение.",
        };
      }
      if (ui.phase !== "learning" && ui.phase !== "review") {
        return { kind: "allow" };
      }

      const selectedVerse = todayVerses.find(
        (verse) => getVerseIdentity(verse) === String(verseId)
      );
      if (!selectedVerse) return { kind: "allow" };

      const selectedStatus = normalizeGoalStatus(selectedVerse.status);

      if (ui.phase === "learning") {
        if (selectedStatus !== "LEARNING") {
          return {
            kind: "warn",
            phase: "learning",
            message:
              "Сейчас этап «Изучение». В режиме training будет выбран фильтр «Изучение».",
          };
        }
        return { kind: "allow" };
      }

      if (selectedStatus !== "REVIEW" && selectedStatus !== "MASTERED") {
        return {
          kind: "warn",
          phase: "review",
          message:
            "Сейчас этап «Повторение». В режиме training будет выбран фильтр «Повторение».",
        };
      }

      return { kind: "allow" };
    },
    [ui.learningStageBlocked, ui.phase, todayVerses]
  );

  return {
    ui,
    dashboardCard,
    reminder,
    galleryContext,
    onboardingSeen,
    markOnboardingSeen,
    setPreferredResumeMode,
    decideStartFromVerse,
  };
}
