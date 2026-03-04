/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserLeaderboardCurrentUser } from './UserLeaderboardCurrentUser';
import type { UserLeaderboardEntry } from './UserLeaderboardEntry';
export type UserLeaderboardResponse = {
    generatedAt: string;
    totalParticipants: number;
    entries: Array<UserLeaderboardEntry>;
    currentUser: UserLeaderboardCurrentUser | null;
};

