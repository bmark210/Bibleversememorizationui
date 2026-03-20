/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_VerseDifficultyLevel } from './domain_VerseDifficultyLevel';
import type { domain_VerseDisplayStatus } from './domain_VerseDisplayStatus';
import type { domain_VerseFlow } from './domain_VerseFlow';
import type { domain_VerseListTag } from './domain_VerseListTag';
import type { domain_VersePopularityPreviewUser } from './domain_VersePopularityPreviewUser';
import type { domain_VersePopularityScope } from './domain_VersePopularityScope';
export type domain_VerseListItem = {
    contextPromptReference?: string;
    contextPromptText?: string;
    contextScore?: number;
    createdAt?: string;
    difficultyLevel?: domain_VerseDifficultyLevel;
    externalVerseId?: string;
    flow?: domain_VerseFlow;
    incipitScore?: number;
    lastReviewedAt?: string;
    lastTrainingModeId?: number;
    masteryLevel?: number;
    nextReviewAt?: string;
    popularityPreviewUsers?: Array<domain_VersePopularityPreviewUser>;
    popularityScope?: domain_VersePopularityScope;
    popularityValue?: number;
    reference?: string;
    referenceScore?: number;
    repetitions?: number;
    reviewLapseStreak?: number;
    status?: domain_VerseDisplayStatus;
    tags?: Array<domain_VerseListTag>;
    text?: string;
    updatedAt?: string;
};

