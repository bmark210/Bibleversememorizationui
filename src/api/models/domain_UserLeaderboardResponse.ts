/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_UserLeaderboardCurrentUser } from './domain_UserLeaderboardCurrentUser';
import type { domain_UserLeaderboardEntry } from './domain_UserLeaderboardEntry';
export type domain_UserLeaderboardResponse = {
    currentUser?: domain_UserLeaderboardCurrentUser;
    items?: Array<domain_UserLeaderboardEntry>;
    totalParticipants?: number;
};

