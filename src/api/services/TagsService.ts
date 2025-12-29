/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Tag } from '../models/Tag';
import type { VerseTag } from '../models/VerseTag';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TagsService {
    /**
     * Список тегов
     * @returns Tag OK
     * @throws ApiError
     */
    public static getApiTags(): CancelablePromise<Array<Tag>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tags',
        });
    }
    /**
     * Создать тег
     * @param requestBody
     * @returns Tag Создан
     * @throws ApiError
     */
    public static postApiTags(
        requestBody: {
            slug: string;
            title: string;
        },
    ): CancelablePromise<Tag> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/tags',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `slug и title обязательны`,
            },
        });
    }
    /**
     * Получить теги, привязанные к стиху
     * @param externalVerseId
     * @returns Tag OK
     * @throws ApiError
     */
    public static getApiVersesTags(
        externalVerseId: string,
    ): CancelablePromise<Array<Tag>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/verses/{externalVerseId}/tags',
            path: {
                'externalVerseId': externalVerseId,
            },
        });
    }
    /**
     * Привязать тег к стиху
     * @param externalVerseId
     * @param requestBody
     * @returns VerseTag Связь создана
     * @throws ApiError
     */
    public static postApiVersesTags(
        externalVerseId: string,
        requestBody: {
            tagId?: string;
            tagSlug?: string;
        },
    ): CancelablePromise<VerseTag> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/verses/{externalVerseId}/tags',
            path: {
                'externalVerseId': externalVerseId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Нужен tagId или tagSlug`,
            },
        });
    }
    /**
     * Отвязать тег от стиха
     * @param externalVerseId
     * @param requestBody
     * @returns any Связь удалена
     * @throws ApiError
     */
    public static deleteApiVersesTags(
        externalVerseId: string,
        requestBody: {
            tagId?: string;
            tagSlug?: string;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/verses/{externalVerseId}/tags',
            path: {
                'externalVerseId': externalVerseId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Нужен tagId или tagSlug`,
            },
        });
    }
}
