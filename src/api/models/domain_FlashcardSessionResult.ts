/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type domain_FlashcardSessionResult = {
    /**
     * ExternalVerseID identifies the verse being trained.
     */
    externalVerseId?: string;
    /**
     * Mode is the flashcard mode used: "reference" (show text→recall ref) or "verse" (show ref→recall text).
     */
    mode?: string;
    /**
     * Remembered indicates whether the user recalled the answer.
     */
    remembered?: boolean;
};

