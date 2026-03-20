/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_PatchUserVerseRequest } from '../models/api_PatchUserVerseRequest';
import type { api_ReferenceTrainerResponse } from '../models/api_ReferenceTrainerResponse';
import type { api_ReferenceTrainerSessionResponse } from '../models/api_ReferenceTrainerSessionResponse';
import type { api_UpsertUserVerseRequest } from '../models/api_UpsertUserVerseRequest';
import type { domain_DeleteUserVerseResult } from '../models/domain_DeleteUserVerseResult';
import type { domain_ReferenceTrainerSessionInput } from '../models/domain_ReferenceTrainerSessionInput';
import type { domain_SocialPlayersPageResponse } from '../models/domain_SocialPlayersPageResponse';
import type { domain_TrainingStepHTTPRequest } from '../models/domain_TrainingStepHTTPRequest';
import type { domain_TrainingStepHTTPResponse } from '../models/domain_TrainingStepHTTPResponse';
import type { domain_UserVerse } from '../models/domain_UserVerse';
import type { domain_UserVersesPageResponse } from '../models/domain_UserVersesPageResponse';
import type { domain_VerseListItem } from '../models/domain_VerseListItem';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserVersesService {
    /**
     * List verse owners
     * @param telegramId Viewer Telegram ID
     * @param externalVerseId External verse ID
     * @param scope Scope
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns domain_SocialPlayersPageResponse OK
     * @throws ApiError
     */
    public static listVerseOwners(
        telegramId: string,
        externalVerseId: string,
        scope?: 'friends' | 'players',
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<domain_SocialPlayersPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/verse-owners/{externalVerseId}',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            query: {
                'scope': scope,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * List a user's verses
     * @param telegramId Telegram ID
     * @param status Verse status
     * @param orderBy Sort field
     * @param order Sort direction
     * @param filter Semantic list filter
     * @param bookId Bible book number filter
     * @param search Search in verse text or reference
     * @param tagSlugs Comma-separated tag slugs
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns domain_UserVersesPageResponse OK
     * @throws ApiError
     */
    public static listUserVerses(
        telegramId: string,
        status?: 'MY' | 'LEARNING' | 'STOPPED',
        orderBy?: 'createdAt' | 'updatedAt' | 'bible' | 'popularity',
        order?: 'asc' | 'desc',
        filter?: 'catalog' | 'friends' | 'my' | 'learning' | 'review' | 'mastered' | 'stopped',
        bookId?: number,
        search?: string,
        tagSlugs?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<domain_UserVersesPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/verses',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'status': status,
                'orderBy': orderBy,
                'order': order,
                'filter': filter,
                'bookId': bookId,
                'search': search,
                'tagSlugs': tagSlugs,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Add verse to My verses or update progress
     * If no User row exists for telegramId yet, creates a minimal user (same defaults as user upsert) so the verse can be linked. Body must include externalVerseId; other fields are optional.
     * @param telegramId Telegram ID
     * @param request Verse progress payload
     * @returns domain_UserVerse Created
     * @throws ApiError
     */
    public static upsertUserVerse(
        telegramId: string,
        request: api_UpsertUserVerseRequest,
    ): CancelablePromise<domain_UserVerse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/verses',
            path: {
                'telegramId': telegramId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get verses for the reference trainer
     * @param telegramId Telegram ID
     * @param limit Max items
     * @returns api_ReferenceTrainerResponse OK
     * @throws ApiError
     */
    public static getReferenceTrainer(
        telegramId: string,
        limit: number = 12,
        translation?: 'NRT' | 'SYNOD' | 'RBS2' | 'BTI',
    ): CancelablePromise<api_ReferenceTrainerResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/verses/reference-trainer',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'limit': limit,
                ...(translation ? { translation } : {}),
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Save a reference trainer session
     * @param telegramId Telegram ID
     * @param request Session payload
     * @returns api_ReferenceTrainerSessionResponse OK
     * @throws ApiError
     */
    public static saveReferenceTrainerSession(
        telegramId: string,
        request: domain_ReferenceTrainerSessionInput,
    ): CancelablePromise<api_ReferenceTrainerSessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/verses/reference-trainer/session',
            path: {
                'telegramId': telegramId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * List verses in review stage
     * Same selection as GET /api/users/{telegramId}/verses?filter=review; returns a flat array (legacy OpenAPI contract).
     * @param telegramId Telegram ID
     * @param orderBy Sort field
     * @param order Sort direction
     * @returns domain_VerseListItem OK
     * @throws ApiError
     */
    public static listUserVersesReview(
        telegramId: string,
        orderBy?: 'createdAt' | 'updatedAt',
        order?: 'asc' | 'desc',
    ): CancelablePromise<Array<domain_VerseListItem>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/verses/review',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'orderBy': orderBy,
                'order': order,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Delete verse progress
     * @param telegramId Telegram ID
     * @param externalVerseId External verse ID
     * @returns domain_DeleteUserVerseResult OK
     * @throws ApiError
     */
    public static deleteUserVerse(
        telegramId: string,
        externalVerseId: string,
    ): CancelablePromise<domain_DeleteUserVerseResult> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{telegramId}/verses/{externalVerseId}',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Partially update verse progress
     * @param telegramId Telegram ID
     * @param externalVerseId External verse ID
     * @param request Patch payload
     * @returns domain_UserVerse OK
     * @throws ApiError
     */
    public static patchUserVerse(
        telegramId: string,
        externalVerseId: string,
        request: api_PatchUserVerseRequest,
    ): CancelablePromise<domain_UserVerse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/users/{telegramId}/verses/{externalVerseId}',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Apply one training rating (server-side progress)
     * Computes mastery, repetitions, next review, and next training mode from rating (SSOT).
     * @param telegramId Telegram ID
     * @param externalVerseId External verse ID
     * @param request Training step payload
     * @returns domain_TrainingStepHTTPResponse OK
     * @throws ApiError
     */
    public static postUserVerseTrainingStep(
        telegramId: string,
        externalVerseId: string,
        request: domain_TrainingStepHTTPRequest,
    ): CancelablePromise<domain_TrainingStepHTTPResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/verses/{externalVerseId}/training-step',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }
}
