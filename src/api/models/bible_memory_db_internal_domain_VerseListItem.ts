/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_VerseDifficultyLevel } from './bible_memory_db_internal_domain_VerseDifficultyLevel';
import type { bible_memory_db_internal_domain_VerseDisplayStatus } from './bible_memory_db_internal_domain_VerseDisplayStatus';
import type { bible_memory_db_internal_domain_VerseFlow } from './bible_memory_db_internal_domain_VerseFlow';
import type { bible_memory_db_internal_domain_VerseListTag } from './bible_memory_db_internal_domain_VerseListTag';
import type { bible_memory_db_internal_domain_VersePopularityPreviewUser } from './bible_memory_db_internal_domain_VersePopularityPreviewUser';
import type { bible_memory_db_internal_domain_VersePopularityScope } from './bible_memory_db_internal_domain_VersePopularityScope';
export type bible_memory_db_internal_domain_VerseListItem = {
    contextPromptReference?: string;
    contextPromptText?: string;
    contextScore?: number;
    createdAt?: string;
    difficultyLevel?: bible_memory_db_internal_domain_VerseDifficultyLevel;
    externalVerseId?: string;
    flow?: bible_memory_db_internal_domain_VerseFlow;
    incipitScore?: number;
    lastReviewedAt?: string;
    lastTrainingModeId?: number;
    masteryLevel?: number;
    nextReviewAt?: string;
    popularityPreviewUsers?: Array<bible_memory_db_internal_domain_VersePopularityPreviewUser>;
    popularityScope?: bible_memory_db_internal_domain_VersePopularityScope;
    popularityValue?: number;
    reference?: string;
    referenceScore?: number;
    repetitions?: number;
    reviewLapseStreak?: number;
    status?: bible_memory_db_internal_domain_VerseDisplayStatus;
    tags?: Array<bible_memory_db_internal_domain_VerseListTag>;
    text?: string;
    updatedAt?: string;
};

