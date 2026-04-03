/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_ExamEligibleVersesResponse } from '../models/domain_ExamEligibleVersesResponse';
import type { domain_ExamSessionInput } from '../models/domain_ExamSessionInput';
import type { domain_ExamSessionOutput } from '../models/domain_ExamSessionOutput';
import type { domain_LearningCapacityResponse } from '../models/domain_LearningCapacityResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExamService {
    /**
     * Get learning capacity
     * Returns the user's active learning count, total capacity, and whether they can add more verses.
     * @param telegramId Telegram ID
     * @returns domain_LearningCapacityResponse OK
     * @throws ApiError
     */
    public static getLearningCapacity(
        telegramId: string,
    ): CancelablePromise<domain_LearningCapacityResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/exam/capacity',
            path: {
                'telegramId': telegramId,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get exam-eligible verses
     * Returns verses that qualify for the exam (masteryLevel>=7, repetitions>=2). Includes canStart flag and cooldown info.
     * @param telegramId Telegram ID
     * @param translation Bible translation
     * @returns domain_ExamEligibleVersesResponse OK
     * @throws ApiError
     */
    public static getExamEligibleVerses(
        telegramId: string,
        translation?: 'NRT' | 'SYNOD' | 'RBS2' | 'BTI',
    ): CancelablePromise<domain_ExamEligibleVersesResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/exam/eligible',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Submit exam session results
     * Saves exam results, marks confirmed verses, and updates learning capacity.
     * @param telegramId Telegram ID
     * @param request Exam results
     * @returns domain_ExamSessionOutput OK
     * @throws ApiError
     */
    public static submitExamSession(
        telegramId: string,
        request: domain_ExamSessionInput,
    ): CancelablePromise<domain_ExamSessionOutput> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/exam/session',
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
}
