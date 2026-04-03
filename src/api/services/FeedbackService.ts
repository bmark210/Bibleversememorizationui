/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_CreateFeedbackInput } from '../models/domain_CreateFeedbackInput';
import type { domain_Feedback } from '../models/domain_Feedback';
import type { domain_FeedbackPageResponse } from '../models/domain_FeedbackPageResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeedbackService {
    /**
     * List feedback
     * @param telegramId Optional Telegram ID filter
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns domain_FeedbackPageResponse OK
     * @throws ApiError
     */
    public static listFeedback(
        telegramId?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<domain_FeedbackPageResponse> {
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
     * @returns domain_Feedback Created
     * @throws ApiError
     */
    public static createFeedback(
        request: domain_CreateFeedbackInput,
    ): CancelablePromise<domain_Feedback> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/feedback',
            body: request,
            errors: {
                400: `Bad Request`,
                429: `Too Many Requests`,
                500: `Internal Server Error`,
            },
        });
    }
}
