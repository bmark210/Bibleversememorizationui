/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserLeaderboardCurrentUser = {
    telegramId: string;
    name: string;
    avatarUrl: string | null;
    rank: number | null;
    /**
     * Реактивный XP-рейтинг пользователя.
     */
    xp: number;
    streakDays: number;
    weeklyRepetitions: number;
};

