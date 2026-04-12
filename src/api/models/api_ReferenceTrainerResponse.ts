/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_UserVerse } from './domain_UserVerse';
export type api_ReferenceTrainerResponse = {
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
    verses?: Array<domain_UserVerse>;
};

