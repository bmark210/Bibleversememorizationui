/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_UserVerse } from './bible_memory_db_internal_domain_UserVerse';
export type internal_api_ReferenceTrainerResponse = {
    /**
     * MinRequired is the minimum number of verses recommended for a session.
     */
    minRequired?: number;
    /**
     * TotalCount is the total number of verses available in the pool.
     */
    totalCount?: number;
    /**
     * Verses is the pool of user verses available for training.
     */
    verses?: Array<bible_memory_db_internal_domain_UserVerse>;
};

