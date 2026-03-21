/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_CreateFeedbackInput } from '../models/bible_memory_db_internal_domain_CreateFeedbackInput';
import type { bible_memory_db_internal_domain_Feedback } from '../models/bible_memory_db_internal_domain_Feedback';
import type { bible_memory_db_internal_domain_FeedbackPageResponse } from '../models/bible_memory_db_internal_domain_FeedbackPageResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeedbackService {
    /**
     * List feedback
     * @param telegramId Optional Telegram ID filter
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns bible_memory_db_internal_domain_FeedbackPageResponse OK
     * @throws ApiError
     */
    public static listFeedback(
        telegramId?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<bible_memory_db_internal_domain_FeedbackPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/feedback',
            query: {
                'telegramId': telegramId,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create feedback
     * @param request Feedback payload
     * @returns bible_memory_db_internal_domain_Feedback Created
     * @throws ApiError
     */
    public static createFeedback(
        request: bible_memory_db_internal_domain_CreateFeedbackInput,
    ): CancelablePromise<bible_memory_db_internal_domain_Feedback> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/feedback',
            body: request,
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
}
