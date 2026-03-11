/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserLeaderboardEntry = {
    rank: number;
    telegramId: string;
    name: string;
    avatarUrl: string | null;
    /**
     * Реактивный XP-рейтинг участника.
     */
    xp: number;
    streakDays: number;
    weeklyRepetitions: number;
    isCurrentUser: boolean;
};

