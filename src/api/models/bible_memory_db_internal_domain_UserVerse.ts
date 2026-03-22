/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_Verse } from './bible_memory_db_internal_domain_Verse';
import type { bible_memory_db_internal_domain_VerseFlow } from './bible_memory_db_internal_domain_VerseFlow';
import type { bible_memory_db_internal_domain_VerseStatus } from './bible_memory_db_internal_domain_VerseStatus';
export type bible_memory_db_internal_domain_UserVerse = {
    createdAt?: string;
    flow?: bible_memory_db_internal_domain_VerseFlow;
    id?: number;
    lastReviewedAt?: string;
    lastTrainingModeId?: number;
    masteryLevel?: number;
    nextReviewAt?: string;
    reference?: string;
    repetitions?: number;
    reviewLapseStreak?: number;
    status?: bible_memory_db_internal_domain_VerseStatus;
    telegramId?: string;
    /**
     * Text/Reference подставляются при ответе API (Helloao), не из БД.
     */
    text?: string;
    updatedAt?: string;
    /**
     * Joined
     */
    verse?: bible_memory_db_internal_domain_Verse;
    verseId?: string;
};

