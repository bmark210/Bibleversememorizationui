/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type bible_memory_db_internal_domain_TrainingStepHTTPRequest = {
    isLearningVerse?: boolean;
    /**
     * "learning" | "review"
     */
    phase?: string;
    rating?: number;
    trainingModeId?: number;
};

