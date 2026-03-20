/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_ReferenceTrainerSessionInput } from '../models/bible_memory_db_internal_domain_ReferenceTrainerSessionInput';
import type { bible_memory_db_internal_domain_UserVerse } from '../models/bible_memory_db_internal_domain_UserVerse';
import type { bible_memory_db_internal_domain_UserVersesPageResponse } from '../models/bible_memory_db_internal_domain_UserVersesPageResponse';
import type { internal_api_ActionStatusResponse } from '../models/internal_api_ActionStatusResponse';
import type { internal_api_PatchUserVerseRequest } from '../models/internal_api_PatchUserVerseRequest';
import type { internal_api_ReferenceTrainerResponse } from '../models/internal_api_ReferenceTrainerResponse';
import type { internal_api_ReferenceTrainerSessionResponse } from '../models/internal_api_ReferenceTrainerSessionResponse';
import type { internal_api_UpsertUserVerseRequest } from '../models/internal_api_UpsertUserVerseRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserVersesService {
    /**
     * List a user's verses
     * @param telegramId Telegram ID
     * @param status Verse status
     * @param orderBy Sort field
     * @param order Sort direction
     * @param filter Search filter
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns bible_memory_db_internal_domain_UserVersesPageResponse OK
     * @throws ApiError
     */
    public static listUserVerses(
        telegramId: string,
        status?: 'MY' | 'LEARNING' | 'STOPPED',
        orderBy?: string,
        order?: string,
        filter?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<bible_memory_db_internal_domain_UserVersesPageResponse> {
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
     * Create or update verse progress
     * @param telegramId Telegram ID
     * @param request Verse progress payload
     * @returns bible_memory_db_internal_domain_UserVerse Created
     * @throws ApiError
     */
    public static upsertUserVerse(
        telegramId: string,
        request: internal_api_UpsertUserVerseRequest,
    ): CancelablePromise<bible_memory_db_internal_domain_UserVerse> {
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
     * @returns internal_api_ReferenceTrainerResponse OK
     * @throws ApiError
     */
    public static getReferenceTrainer(
        telegramId: string,
        limit: number = 12,
    ): CancelablePromise<internal_api_ReferenceTrainerResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/verses/reference-trainer',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'limit': limit,
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
     * @returns internal_api_ReferenceTrainerSessionResponse OK
     * @throws ApiError
     */
    public static saveReferenceTrainerSession(
        telegramId: string,
        request: bible_memory_db_internal_domain_ReferenceTrainerSessionInput,
    ): CancelablePromise<internal_api_ReferenceTrainerSessionResponse> {
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
     * List verses ready for review
     * @param telegramId Telegram ID
     * @param orderBy Sort field
     * @param order Sort direction
     * @returns bible_memory_db_internal_domain_UserVerse OK
     * @throws ApiError
     */
    public static listReviewVerses(
        telegramId: string,
        orderBy?: string,
        order?: string,
    ): CancelablePromise<Array<bible_memory_db_internal_domain_UserVerse>> {
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
     * @returns internal_api_ActionStatusResponse OK
     * @throws ApiError
     */
    public static deleteUserVerse(
        telegramId: string,
        externalVerseId: string,
    ): CancelablePromise<internal_api_ActionStatusResponse> {
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
     * @returns bible_memory_db_internal_domain_UserVerse OK
     * @throws ApiError
     */
    public static patchUserVerse(
        telegramId: string,
        externalVerseId: string,
        request: internal_api_PatchUserVerseRequest,
    ): CancelablePromise<bible_memory_db_internal_domain_UserVerse> {
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
}
