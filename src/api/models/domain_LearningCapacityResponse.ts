/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type domain_LearningCapacityResponse = {
    activeLearning?: number;
    base?: number;
    canAddMore?: boolean;
    capacity?: number;
    examConfirmedCount?: number;
    /**
     * PromotedVerseIds contains externalVerseIds of verses auto-promoted from queue since last check.
     */
    promotedVerseIds?: Array<string>;
    queueCount?: number;
};

