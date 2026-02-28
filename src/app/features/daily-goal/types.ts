export type DailyGoalPhase = 'learning' | 'review' | 'completed' | 'empty';
export type DailyGoalResumeMode = 'learning' | 'review';

export type DailyGoalTargetKind = 'my' | 'review';

export type DailyGoalReadinessResponse = {
  requested: {
    learning: number;
    review: number;
  };
  available: {
    learning: number;
    review: number;
  };
  effective: {
    learning: number;
    review: number;
  };
  phases: {
    learning: {
      enabled: boolean;
      canStart: boolean;
      missingCount: number;
      status: 'ready' | 'insufficient' | 'missing_required' | 'disabled';
      userAction: 'none' | 'create_or_move_to_learning';
      message: string | null;
    };
    review: {
      enabled: boolean;
      skipped: boolean;
      missingCount: number;
      status: 'ready' | 'insufficient' | 'skipped' | 'disabled';
      userAction: 'none';
      message: string | null;
    };
  };
  summary: {
    hasAnyUserVerses: boolean;
    canStartDailyGoal: boolean;
    reviewStageWillBeSkipped: boolean;
    hasAllCardsForRequestedGoal: boolean;
    mode: 'ready' | 'ready_with_review_skip' | 'blocked_no_learning' | 'empty';
  };
};

export interface DailyGoalPlan {
  dayKey: string;
  prefsSnapshot: { newVersesCount: number; reviewVersesCount: number };
  requestedCounts: { new: number; review: number };
  availableCounts: { new: number; review: number };
  shortages: {
    new: number;
    review: number;
  };
}

export interface DailyGoalProgress {
  completedVerseIds: {
    new: string[];
    review: string[];
  };
  skippedVerseIds?: {
    new: string[];
    review: string[];
  };
  startedAt: string | null;
  completedAt: string | null;
  completionCounterSyncedAt?: string | null;
  lastActivePhase: DailyGoalPhase;
  preferredResumeMode?: DailyGoalResumeMode | null;
}

export interface DailyGoalSession {
  version: 1;
  telegramId: string;
  dayKey: string;
  plan: DailyGoalPlan;
  progress: DailyGoalProgress;
}

export interface DailyGoalUiState {
  phase: DailyGoalPhase;
  nextTargetKind: DailyGoalTargetKind | null;
  progressCounts: {
    newDone: number;
    newTotal: number;
    reviewDone: number;
    reviewTotal: number;
  };
  isActive: boolean;
  isCompleted: boolean;
  isEmpty: boolean;
  hasShortages: boolean;
  preferredResumeMode: DailyGoalResumeMode | null;
  effectiveResumeMode: DailyGoalResumeMode | null;
  canStartDailyGoal: boolean;
  reviewStageWillBeSkipped: boolean;
  learningStageBlocked: boolean;
  phaseStates: {
    learning: {
      enabled: boolean;
      skipped: boolean;
      completed: boolean;
      currentPhase: boolean;
      preferred: boolean;
      total: number;
      done: number;
    };
    review: {
      enabled: boolean;
      skipped: boolean;
      completed: boolean;
      currentPhase: boolean;
      preferred: boolean;
      total: number;
      done: number;
    };
  };
}

export interface DashboardDailyGoalCardModel {
  ui: DailyGoalUiState;
  requestedCounts: { new: number; review: number };
  availableCounts: { new: number; review: number };
  shortageHints: string[];
  canStart: boolean;
  needsFirstVerse: boolean;
  onboardingPending: boolean;
  needsLearningVersesForGoal: boolean;
  reviewStageWillBeSkipped: boolean;
  readiness: DailyGoalReadinessResponse | null;
  isReadinessLoading: boolean;
}

export interface DailyGoalVerseListReminder {
  visible: boolean;
  phase: 'learning' | 'review';
  progressLabel: string;
  onResume: () => void;
  onShowHowToAddFirstVerse?: () => void;
}

export type DailyGoalTrainingStartDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; targetVerseId: string; phase: 'learning' | 'review'; message: string }
  | { kind: 'warn'; phase: 'learning' | 'review'; message: string };

export interface DailyGoalProgressEvent {
  source: 'verse-gallery' | 'training-session';
  externalVerseId: string;
  reference: string;
  targetKindHint: DailyGoalTargetKind | null;
  saved: boolean;
  rating?: number;
  trainingModeId?: number | null;
  before: {
    status: string;
    masteryLevel: number;
    repetitions: number;
    lastReviewedAt: string | null;
  };
  after: {
    status: string;
    masteryLevel: number;
    repetitions: number;
    lastReviewedAt: string | null;
  };
  occurredAt: string;
}

export interface DailyGoalGalleryContext {
  phase: 'learning' | 'review' | 'completed';
  completedVerseIdsByPhase: { learning: string[]; review: string[] };
  showGuideBanner: boolean;
  preferredResumeMode: DailyGoalResumeMode | null;
  effectiveResumeMode: DailyGoalResumeMode | null;
  reviewStageEnabled: boolean;
  reviewStageSkipped: boolean;
  canStartDailyGoal: boolean;
  learningStageBlocked: boolean;
  progressCounts: DailyGoalUiState['progressCounts'];
  phaseStates: DailyGoalUiState['phaseStates'];
}

export interface DailyGoalOnboardingSeen {
  dashboardIntro?: true;
  addFirstVerseIntro?: true;
  galleryIntro?: true;
  trainingIntro?: true;
  verseListReminderIntro?: true;
}
