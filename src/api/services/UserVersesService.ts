/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserVerse } from '../models/UserVerse';
import type { UserVersesPageResponse } from '../models/UserVersesPageResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserVersesService {
    /**
     * Список стихов пользователя
     * @param telegramId
     * @param status
     * @param orderBy
     * @param order
     * @param filter
     * @param limit
     * @param startWith
     * @returns UserVersesPageResponse OK
     * @throws ApiError
     */
    public static getApiUsersVerses(
        telegramId: string,
        status?: 'MY' | 'LEARNING' | 'STOPPED',
        orderBy?: 'createdAt' | 'updatedAt',
        order?: 'asc' | 'desc',
        filter?: 'catalog' | 'my' | 'learning' | 'review' | 'mastered' | 'stopped',
        limit?: number,
        startWith?: number,
    ): CancelablePromise<UserVersesPageResponse> {
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
        });
    }
    /**
     * Создать или обновить прогресс по стиху
     * @param telegramId
     * @param requestBody
     * @returns UserVerse Создан/обновлён
     * @throws ApiError
     */
    public static postApiUsersVerses(
        telegramId: string,
        requestBody: {
            /**
             * ID стиха: "book-chapter-verse" или диапазон в пределах главы "book-chapter-verseStart-verseEnd" (максимум 5 стихов в диапазоне).
             */
            externalVerseId: string;
            masteryLevel?: number;
            repetitions?: number;
            lastTrainingModeId?: number | null;
            lastReviewedAt?: string;
            nextReviewAt?: string;
        },
    ): CancelablePromise<UserVerse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/verses',
            path: {
                'telegramId': telegramId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `externalVerseId обязателен или имеет неверный формат`,
            },
        });
    }
    /**
     * Список стихов пользователя на повторение (LEARNING, masteryLevel >= TRAINING_STAGE_MASTERY_MAX)
     * @param telegramId
     * @param orderBy
     * @param order
     * @returns UserVerse OK
     * @throws ApiError
     */
    public static getApiUsersVersesReview(
        telegramId: string,
        orderBy?: 'createdAt' | 'updatedAt',
        order?: 'asc' | 'desc',
    ): CancelablePromise<Array<UserVerse>> {
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
        });
    }
    /**
     * Обновить прогресс по стиху (сервер защищает инварианты mastery/review и валидирует lastTrainingModeId)
     * @param telegramId
     * @param externalVerseId
     * @param requestBody
     * @returns UserVerse OK
     * @throws ApiError
     */
    public static patchApiUsersVerses(
        telegramId: string,
        externalVerseId: string,
        requestBody: {
            masteryLevel?: number;
            repetitions?: number;
            lastTrainingModeId?: number | null;
            lastReviewedAt?: string;
            nextReviewAt?: string;
            status?: 'MY' | 'LEARNING' | 'STOPPED';
        },
    ): CancelablePromise<UserVerse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/users/{telegramId}/verses/{externalVerseId}',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Удалить прогресс по стиху
     * @param telegramId
     * @param externalVerseId
     * @returns any Удалено
     * @throws ApiError
     */
    public static deleteApiUsersVerses(
        telegramId: string,
        externalVerseId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{telegramId}/verses/{externalVerseId}',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
        });
    }
}
