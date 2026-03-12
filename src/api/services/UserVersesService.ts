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
        orderBy?: 'createdAt' | 'updatedAt' | 'bible' | 'popularity',
        order?: 'asc' | 'desc',
        filter?: 'catalog' | 'friends' | 'my' | 'learning' | 'review' | 'mastered' | 'stopped',
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
     * Пул стихов для раздела «Якоря»
     * @param telegramId
     * @param limit
     * @returns any OK
     * @throws ApiError
     */
    public static getApiUsersVersesReferenceTrainer(
        telegramId: string,
        limit?: number,
    ): CancelablePromise<{
        verses: Array<UserVerse>;
        totalCount: number;
        minRequired: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/verses/reference-trainer',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'limit': limit,
            },
        });
    }
    /**
     * Сохранить skill-score по итогам сессии раздела «Якоря»
     * @param telegramId
     * @param requestBody
     * @returns any OK
     * @throws ApiError
     */
    public static postApiUsersVersesReferenceTrainerSession(
        telegramId: string,
        requestBody: {
            sessionTrack: 'reference' | 'incipit' | 'ending' | 'context' | 'mixed';
            updates: Array<{
                /**
                 * ID стиха: "book-chapter-verse" или диапазон в пределах главы "book-chapter-verseStart-verseEnd" (максимум 5 стихов в диапазоне).
                 */
                externalVerseId: string;
                track: 'reference' | 'incipit' | 'ending' | 'context';
                outcome: 'correct_first' | 'correct_retry' | 'wrong';
            }>;
        },
    ): CancelablePromise<{
        updated: Array<{
            /**
             * ID стиха: "book-chapter-verse" или диапазон в пределах главы "book-chapter-verseStart-verseEnd" (максимум 5 стихов в диапазоне).
             */
            externalVerseId: string;
            referenceScore: number;
            incipitScore: number;
            contextScore: number;
        }>;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/verses/reference-trainer/session',
            path: {
                'telegramId': telegramId,
            },
            body: requestBody,
            mediaType: 'application/json',
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
            reviewLapseStreak?: number;
            reviewRating?: 0 | 1 | 2 | 3;
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
    /**
     * Каталог стихов с пагинацией и контекстной популярностью
     * @param telegramId
     * @param translation
     * @param tagSlugs
     * @param orderBy
     * @param order
     * @param limit
     * @param startWith
     * @returns UserVersesPageResponse OK
     * @throws ApiError
     */
    public static getApiVerses(
        telegramId?: string,
        translation?: string,
        tagSlugs?: string,
        orderBy?: 'createdAt' | 'bible' | 'popularity',
        order?: 'asc' | 'desc',
        limit?: number,
        startWith?: number,
    ): CancelablePromise<UserVersesPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/verses',
            query: {
                'telegramId': telegramId,
                'translation': translation,
                'tagSlugs': tagSlugs,
                'orderBy': orderBy,
                'order': order,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                400: `Некорректные query-параметры`,
            },
        });
    }
}
