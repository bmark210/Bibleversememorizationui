/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserDashboardStats = {
    totalVerses: number;
    learningVerses: number;
    reviewVerses: number;
    masteredVerses: number;
    stoppedVerses: number;
    dueReviewVerses: number;
    totalRepetitions: number;
    /**
     * Композитный рейтинг пользователя (прогресс + навыки + регулярность).
     */
    averageProgressPercent: number;
    bestVerseReference: string | null;
    dailyStreak: number;
};

