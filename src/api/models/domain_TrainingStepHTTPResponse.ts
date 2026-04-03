/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_UserVerse } from './domain_UserVerse';
export type domain_TrainingStepHTTPResponse = {
    graduatedToReview?: boolean;
    nextTrainingModeId?: number;
    /**
     * PromotedVerseIds contains externalVerseIds auto-promoted from queue when this step freed a slot.
     */
    promotedVerseIds?: Array<string>;
    reviewWasSuccessful?: boolean;
    userVerse?: domain_UserVerse;
};

