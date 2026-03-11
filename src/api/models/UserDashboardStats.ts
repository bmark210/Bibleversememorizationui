/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserDashboardStats = {
    totalVerses: number;
    learningStatusVerses: number;
    learningVerses: number;
    reviewVerses: number;
    masteredVerses: number;
    stoppedVerses: number;
    dueReviewVerses: number;
    totalRepetitions: number;
    /**
     * Реактивный XP-рейтинг пользователя.
     */
    xp: number;
    bestVerseReference: string | null;
    dailyStreak: number;
};

