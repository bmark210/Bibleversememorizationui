/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedbackEntry } from '../models/FeedbackEntry';
import type { FeedbackPageResponse } from '../models/FeedbackPageResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeedbackService {
    /**
     * Получить все отзывы с пагинацией (только для админов)
     * @param telegramId
     * @param limit
     * @param startWith
     * @returns FeedbackPageResponse OK
     * @throws ApiError
     */
    public static getApiFeedback(
        telegramId?: string,
        limit?: number,
        startWith?: number,
    ): CancelablePromise<FeedbackPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/feedback',
            query: {
                'telegramId': telegramId,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                403: `Только для админов`,
            },
        });
    }
    /**
     * Отправить отзыв
     * @param requestBody
     * @returns FeedbackEntry Создано
     * @throws ApiError
     */
    public static postApiFeedback(
        requestBody: {
            telegramId: string;
            text: string;
        },
    ): CancelablePromise<FeedbackEntry> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/feedback',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Некорректный запрос`,
                404: `Пользователь не найден`,
            },
        });
    }
}
