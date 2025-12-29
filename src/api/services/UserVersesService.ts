/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserVerse } from '../models/UserVerse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserVersesService {
    /**
     * Список стихов пользователя
     * @param id
     * @returns UserVerse OK
     * @throws ApiError
     */
    public static getApiUsersVerses(
        id: string,
    ): CancelablePromise<Array<UserVerse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{id}/verses',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Upsert прогресса по стиху
     * @param id
     * @param requestBody
     * @returns UserVerse Создан/обновлён
     * @throws ApiError
     */
    public static postApiUsersVerses(
        id: string,
        requestBody: {
            externalVerseId: string;
            masteryLevel?: number;
            repetitions?: number;
            lastReviewedAt?: string;
            nextReviewAt?: string;
        },
    ): CancelablePromise<UserVerse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{id}/verses',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `externalVerseId обязателен`,
            },
        });
    }
    /**
     * Обновить прогресс по стиху
     * @param id
     * @param externalVerseId
     * @param requestBody
     * @returns UserVerse OK
     * @throws ApiError
     */
    public static patchApiUsersVerses(
        id: string,
        externalVerseId: string,
        requestBody: {
            masteryLevel?: number;
            repetitions?: number;
            lastReviewedAt?: string;
            nextReviewAt?: string;
        },
    ): CancelablePromise<UserVerse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/users/{id}/verses/{externalVerseId}',
            path: {
                'id': id,
                'externalVerseId': externalVerseId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Удалить прогресс по стиху
     * @param id
     * @param externalVerseId
     * @returns any Удалено
     * @throws ApiError
     */
    public static deleteApiUsersVerses(
        id: string,
        externalVerseId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{id}/verses/{externalVerseId}',
            path: {
                'id': id,
                'externalVerseId': externalVerseId,
            },
        });
    }
}
