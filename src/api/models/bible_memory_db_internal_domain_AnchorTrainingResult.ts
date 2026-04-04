/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type bible_memory_db_internal_domain_AnchorTrainingResult = {
    /**
     * ExternalVerseID identifies the verse being trained.
     */
    externalVerseId?: string;
    /**
     * ModeId is the training mode used: "reference-choice", "broken-mirror", "impostor-word", etc.
     */
    modeId?: string;
    /**
     * Outcome of the answer: "correct_first", "correct_retry", or "wrong".
     */
    outcome?: string;
};

