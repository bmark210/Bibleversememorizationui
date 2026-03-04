/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserVerse = {
    /**
     * ID стиха: "book-chapter-verse" или диапазон в пределах главы "book-chapter-verseStart-verseEnd" (максимум 5 стихов в диапазоне).
     */
    externalVerseId: string;
    status: UserVerse.status;
    masteryLevel: number;
    repetitions: number;
    lastTrainingModeId?: number | null;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
    tags?: Array<{
        id: string;
        slug: string;
        title: string;
    }>;
    text?: string;
    reference?: string;
};
export namespace UserVerse {
    export enum status {
        MY = 'MY',
        LEARNING = 'LEARNING',
        STOPPED = 'STOPPED',
        REVIEW = 'REVIEW',
        MASTERED = 'MASTERED',
        CATALOG = 'CATALOG',
    }
}

