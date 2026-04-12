/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_UserVerse } from './bible_memory_db_internal_domain_UserVerse';
export type internal_api_FlashcardResponse = {
    /**
     * TotalCount is the number of verses returned.
     */
    totalCount?: number;
    /**
     * Verses is the pool of user verses for flashcard training.
     */
    verses?: Array<bible_memory_db_internal_domain_UserVerse>;
};

