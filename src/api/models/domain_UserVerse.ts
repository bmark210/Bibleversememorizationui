/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_Verse } from './domain_Verse';
import type { domain_VerseFlow } from './domain_VerseFlow';
import type { domain_VerseStatus } from './domain_VerseStatus';
export type domain_UserVerse = {
    contextScore?: number;
    createdAt?: string;
    flow?: domain_VerseFlow;
    id?: number;
    incipitScore?: number;
    lastReviewedAt?: string;
    lastTrainingModeId?: number;
    masteryLevel?: number;
    nextReviewAt?: string;
    referenceScore?: number;
    repetitions?: number;
    reviewLapseStreak?: number;
    status?: domain_VerseStatus;
    telegramId?: string;
    updatedAt?: string;
    /**
     * Joined
     */
    verse?: domain_Verse;
    verseId?: string;
};

