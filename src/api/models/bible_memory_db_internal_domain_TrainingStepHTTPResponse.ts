/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_UserVerse } from './bible_memory_db_internal_domain_UserVerse';
export type bible_memory_db_internal_domain_TrainingStepHTTPResponse = {
    graduatedToReview?: boolean;
    nextTrainingModeId?: number;
    /**
     * PromotedVerseIds contains externalVerseIds auto-promoted from queue when this step freed a slot.
     */
    promotedVerseIds?: Array<string>;
    reviewWasSuccessful?: boolean;
    userVerse?: bible_memory_db_internal_domain_UserVerse;
};

