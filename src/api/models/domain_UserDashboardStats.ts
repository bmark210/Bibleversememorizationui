/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type domain_UserDashboardStats = {
    dailyStreak?: number;
    /**
     * DueReviewVerses: повторение, следующее повторение уже «наступило» — nextReviewAt == nil или <= now (REVIEW_DUE).
     */
    dueReviewVerses?: number;
    /**
     * LearningVerses are in active learning (not yet at mastery threshold for review phase).
     */
    learningVerses?: number;
    masteredCount?: number;
    /**
     * ReviewVerses: все стихи в фазе повторения (REVIEW_DUE ∪ REVIEW_WAITING).
     */
    reviewVerses?: number;
    stoppedVerses?: number;
    telegramId?: string;
    versesCount?: number;
    /**
     * WaitingReviewVerses: повторение, но следующее повторение только впереди — nextReviewAt > now (REVIEW_WAITING).
     */
    waitingReviewVerses?: number;
    xp?: number;
};

