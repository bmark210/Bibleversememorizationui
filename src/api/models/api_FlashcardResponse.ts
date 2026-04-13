/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_UserVerse } from './domain_UserVerse';
export type api_FlashcardResponse = {
    /**
     * TotalCount is the number of verses returned.
     */
    totalCount?: number;
    /**
     * Verses is the pool of user verses for flashcard training.
     */
    verses?: Array<domain_UserVerse>;
};

