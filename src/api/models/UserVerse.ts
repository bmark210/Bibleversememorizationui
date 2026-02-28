/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

// Matches VerseCardDto returned by GET /verses, PATCH /verses/{id}, and GET /verses/review.
// Note: POST /verses returns a raw Prisma record — its response is not stored by the frontend.
export type UserVerse = {
    externalVerseId: string;
    status: 'MY' | 'LEARNING' | 'STOPPED' | 'REVIEW' | 'MASTERED';
    masteryLevel: number;
    repetitions: number;
    lastReviewedAt?: string | null;
    nextReviewAt?: string | null;
    lastTrainingModeId?: number | null;
    tags?: Array<{ id: string; slug: string; title: string }>;
    text?: string;
    reference?: string;
};
