/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_BooleanOKResponse } from '../models/api_BooleanOKResponse';
import type { api_CreateTagRequest } from '../models/api_CreateTagRequest';
import type { api_UpdateTagRequest } from '../models/api_UpdateTagRequest';
import type { api_VerseTagMutationRequest } from '../models/api_VerseTagMutationRequest';
import type { api_VerseTagsPutRequest } from '../models/api_VerseTagsPutRequest';
import type { domain_Tag } from '../models/domain_Tag';
import type { domain_VerseTagLinkResponse } from '../models/domain_VerseTagLinkResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TagsService {
    /**
     * List tags
     * @returns domain_Tag OK
     * @throws ApiError
     */
    public static listTags(): CancelablePromise<Array<domain_Tag>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tags',
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create tag
     * @param request Tag payload
     * @param telegramId Admin Telegram ID
     * @param xTelegramId Admin Telegram ID
     * @returns domain_Tag Created
     * @throws ApiError
     */
    public static createTag(
        request: api_CreateTagRequest,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<domain_Tag> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/tags',
            headers: {
                'X-Telegram-Id': xTelegramId,
            },
            query: {
                'telegramId': telegramId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                403: `Forbidden`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Delete tag
     * @param telegramId Admin Telegram ID
     * @param id Tag ID
     * @param xTelegramId Admin Telegram ID
     * @returns api_BooleanOKResponse OK
     * @throws ApiError
     */
    public static deleteTag(
        telegramId: string,
        id: string,
        xTelegramId?: string,
    ): CancelablePromise<api_BooleanOKResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/tags/{id}',
            path: {
                'id': id,
            },
            headers: {
                'X-Telegram-Id': xTelegramId,
            },
            query: {
                'telegramId': telegramId,
            },
            errors: {
                400: `Bad Request`,
                403: `Forbidden`,
                404: `Not Found`,
                409: `Conflict`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Update tag title
     * @param id Tag ID
     * @param request Tag title payload
     * @param telegramId Admin Telegram ID
     * @param xTelegramId Admin Telegram ID
     * @returns domain_Tag OK
     * @throws ApiError
     */
    public static updateTag(
        id: string,
        request: api_UpdateTagRequest,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<domain_Tag> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/tags/{id}',
            path: {
                'id': id,
            },
            headers: {
                'X-Telegram-Id': xTelegramId,
            },
            query: {
                'telegramId': telegramId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                403: `Forbidden`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * List verse tags
     * @param externalVerseId External verse ID
     * @returns domain_Tag OK
     * @throws ApiError
     */
    public static listVerseTags(
        externalVerseId: string,
    ): CancelablePromise<Array<domain_Tag>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/verses/{externalVerseId}/tags',
            path: {
                'externalVerseId': externalVerseId,
            },
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Replace verse tags (full sync)
     * @param externalVerseId External verse ID
     * @param request Tag slugs (empty clears all)
     * @returns domain_Tag OK
     * @throws ApiError
     */
    public static replaceVerseTags(
        externalVerseId: string,
        request: api_VerseTagsPutRequest,
    ): CancelablePromise<Array<domain_Tag>> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/verses/{externalVerseId}/tags',
            path: {
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
    /**
     * Attach tag to verse
     * @param externalVerseId External verse ID
     * @param request Verse-tag payload
     * @returns domain_VerseTagLinkResponse Created
     * @throws ApiError
     */
    public static attachTagToVerse(
        externalVerseId: string,
        request: api_VerseTagMutationRequest,
    ): CancelablePromise<domain_VerseTagLinkResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/verses/{externalVerseId}/tags',
            path: {
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
    /**
     * Remove tag from verse
     * @param externalVerseId External verse ID
     * @param request Verse-tag payload
     * @returns api_BooleanOKResponse OK
     * @throws ApiError
     */
    public static removeTagFromVerse(
        externalVerseId: string,
        request: api_VerseTagMutationRequest,
    ): CancelablePromise<api_BooleanOKResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/verses/{externalVerseId}/tags',
            path: {
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
