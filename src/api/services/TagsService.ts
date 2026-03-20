/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_Tag } from '../models/bible_memory_db_internal_domain_Tag';
import type { bible_memory_db_internal_domain_VerseTagLinkResponse } from '../models/bible_memory_db_internal_domain_VerseTagLinkResponse';
import type { internal_api_BooleanOKResponse } from '../models/internal_api_BooleanOKResponse';
import type { internal_api_CreateTagRequest } from '../models/internal_api_CreateTagRequest';
import type { internal_api_UpdateTagRequest } from '../models/internal_api_UpdateTagRequest';
import type { internal_api_VerseTagMutationRequest } from '../models/internal_api_VerseTagMutationRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TagsService {
    /**
     * List tags
     * @returns bible_memory_db_internal_domain_Tag OK
     * @throws ApiError
     */
    public static listTags(): CancelablePromise<Array<bible_memory_db_internal_domain_Tag>> {
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
     * @returns bible_memory_db_internal_domain_Tag Created
     * @throws ApiError
     */
    public static createTag(
        request: internal_api_CreateTagRequest,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<bible_memory_db_internal_domain_Tag> {
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
     * @returns internal_api_BooleanOKResponse OK
     * @throws ApiError
     */
    public static deleteTag(
        telegramId: string,
        id: string,
        xTelegramId?: string,
    ): CancelablePromise<internal_api_BooleanOKResponse> {
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
     * @returns bible_memory_db_internal_domain_Tag OK
     * @throws ApiError
     */
    public static updateTag(
        id: string,
        request: internal_api_UpdateTagRequest,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<bible_memory_db_internal_domain_Tag> {
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
     * @returns bible_memory_db_internal_domain_Tag OK
     * @throws ApiError
     */
    public static listVerseTags(
        externalVerseId: string,
    ): CancelablePromise<Array<bible_memory_db_internal_domain_Tag>> {
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
     * Attach tag to verse
     * @param externalVerseId External verse ID
     * @param request Verse-tag payload
     * @returns bible_memory_db_internal_domain_VerseTagLinkResponse Created
     * @throws ApiError
     */
    public static attachTagToVerse(
        externalVerseId: string,
        request: internal_api_VerseTagMutationRequest,
    ): CancelablePromise<bible_memory_db_internal_domain_VerseTagLinkResponse> {
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
     * @returns internal_api_BooleanOKResponse OK
     * @throws ApiError
     */
    public static removeTagFromVerse(
        externalVerseId: string,
        request: internal_api_VerseTagMutationRequest,
    ): CancelablePromise<internal_api_BooleanOKResponse> {
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
