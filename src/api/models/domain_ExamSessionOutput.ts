/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type domain_ExamSessionOutput = {
    failCount?: number;
    newCapacity?: number;
    newlyConfirmedCount?: number;
    passCount?: number;
    passed?: boolean;
    /**
     * PromotedVerseIds contains externalVerseIds of verses auto-promoted from queue after this session.
     */
    promotedVerseIds?: Array<string>;
    sessionId?: string;
    verseCount?: number;
};

