/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_Verse } from './domain_Verse';
import type { domain_VerseFlow } from './domain_VerseFlow';
import type { domain_VerseStatus } from './domain_VerseStatus';
export type domain_UserVerse = {
    contextPromptReference?: string;
    /**
     * Context: соседний стих для режима «Контекст» закрепления.
     */
    contextPromptText?: string;
    createdAt?: string;
    examConfirmed?: boolean;
    flow?: domain_VerseFlow;
    id?: number;
    lastReviewedAt?: string;
    lastTrainingModeId?: number;
    masteryLevel?: number;
    nextReviewAt?: string;
    queuePosition?: number;
    reference?: string;
    repetitions?: number;
    reviewLapseStreak?: number;
    status?: domain_VerseStatus;
    telegramId?: string;
    /**
     * Text/Reference подставляются при ответе API (Helloao), не из БД.
     */
    text?: string;
    updatedAt?: string;
    /**
     * Joined
     */
    verse?: domain_Verse;
    verseId?: string;
};

