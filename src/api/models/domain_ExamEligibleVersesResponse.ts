/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_UserVerse } from './domain_UserVerse';
export type domain_ExamEligibleVersesResponse = {
    canStart?: boolean;
    /**
     * CooldownUntil is set when exam is on cooldown (not nil means canStart=false due to cooldown).
     */
    cooldownUntil?: string;
    minRequired?: number;
    totalCount?: number;
    verses?: Array<domain_UserVerse>;
};

