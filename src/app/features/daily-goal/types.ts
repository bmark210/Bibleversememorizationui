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
      status: 'ready' | 'insufficient' | 'skipped' | 'pending' | 'disabled';
      userAction: 'none';
      message: string | null;
    };
  };
  summary: {
    hasAnyUserVerses: boolean;
    canStartDailyGoal: boolean;
    reviewStageWillBeSkipped: boolean;
    reviewStagePendingNotDue: boolean;
    hasAllCardsForRequestedGoal: boolean;
    mode: 'ready' | 'ready_with_review_skip' | 'ready_with_review_pending' | 'blocked_no_learning' | 'empty';
  };
};

export interface DailyGoalServerStateV2 {
  version: 2;
  dayKey: string;
  timezone: string;
  plan: {
    requestedCounts: {
      new: number;
      review: number;
    };
  };
  progress: {
    completedVerseIds: {
      new: string[];
      review: string[];
    };
    skippedVerseIds: {
      new: string[];
      review: string[];
    };
    startedAt: string | null;
    completedAt: string | null;
    lastActivePhase: DailyGoalPhase;
    preferredResumeMode: DailyGoalResumeMode | null;
  };
  meta: {
    updatedAt: string;
  };
}

export interface DailyGoalStateResponse {
  dayKey: string;
  timezone: string;
  stateRev: number;
  state: DailyGoalServerStateV2;
  readiness: DailyGoalReadinessResponse;
}

export type DailyGoalEventAction =
  | {
      kind: 'progress_event';
      event: DailyGoalProgressEvent;
    }
  | {
      kind: 'mark_started';
      startedAt?: string | null;
    }
  | {
      kind: 'set_preferred_resume_mode';
      mode: DailyGoalResumeMode | null;
    }
  | {
      kind: 'mark_completed';
      completedAt?: string | null;
    };

export interface DailyGoalEventRequest {
  expectedStateRev: number;
  newVersesCount: number;
  reviewVersesCount: number;
  timezone?: string;
  dayKey?: string;
  action: DailyGoalEventAction;
}

export interface DailyGoalSkipRequest {
  expectedStateRev: number;
  newVersesCount: number;
  reviewVersesCount: number;
  timezone?: string;
  dayKey?: string;
  externalVerseId: string;
  targetKind: DailyGoalTargetKind;
}

export interface DailyGoalMutationInfo {
  applied: boolean;
  conflict: boolean;
  completedNow: boolean;
  completionCounterIncremented: boolean;
}

export interface DailyGoalMutationResponse extends DailyGoalStateResponse {
  mutation: DailyGoalMutationInfo;
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
  reviewStagePendingNotDue: boolean;
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
  reviewStagePendingNotDue: boolean;
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
  source: 'verse-gallery';
  externalVerseId: string;
  reference: string;
  saved: boolean;
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
