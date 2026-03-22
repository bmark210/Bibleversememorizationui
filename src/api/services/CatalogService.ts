/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_CatalogVerseDeleteResponse } from '../models/bible_memory_db_internal_domain_CatalogVerseDeleteResponse';
import type { bible_memory_db_internal_domain_CatalogVersesPageResponse } from '../models/bible_memory_db_internal_domain_CatalogVersesPageResponse';
import type { bible_memory_db_internal_domain_VerseAdminSummary } from '../models/bible_memory_db_internal_domain_VerseAdminSummary';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CatalogService {
    /**
     * List catalog verses
     * Semantically same as GET /api/users/{telegramId}/verses with filter=catalog; response shape is catalog-only (items + totalCount).
     * @param telegramId Optional current user Telegram ID
     * @param translation Bible translation
     * @param bookId Bible book number filter
     * @param tagSlugs Comma-separated tag slugs
     * @param orderBy Sort field
     * @param order Sort direction
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns bible_memory_db_internal_domain_CatalogVersesPageResponse OK
     * @throws ApiError
     */
    public static listCatalogVerses(
        telegramId?: string,
        translation?: 'NRT' | 'SYNOD' | 'RBS2' | 'BTI',
        bookId?: number,
        tagSlugs?: string,
        orderBy: string = 'createdAt',
        order: string = 'desc',
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<bible_memory_db_internal_domain_CatalogVersesPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/verses',
            query: {
                'telegramId': telegramId,
                'translation': translation,
                'bookId': bookId,
                'tagSlugs': tagSlugs,
                'orderBy': orderBy,
                'order': order,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get verse admin summary
     * @param externalVerseId External verse ID
     * @param telegramId Admin Telegram ID
     * @param xTelegramId Admin Telegram ID
     * @returns bible_memory_db_internal_domain_VerseAdminSummary OK
     * @throws ApiError
     */
    public static getVerseAdminSummary(
        externalVerseId: string,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<bible_memory_db_internal_domain_VerseAdminSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/verses/{externalVerseId}/admin',
            path: {
                'externalVerseId': externalVerseId,
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
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Delete verse from catalog
     * @param externalVerseId External verse ID
     * @param telegramId Admin Telegram ID
     * @param xTelegramId Admin Telegram ID
     * @returns bible_memory_db_internal_domain_CatalogVerseDeleteResponse OK
     * @throws ApiError
     */
    public static deleteCatalogVerse(
        externalVerseId: string,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<bible_memory_db_internal_domain_CatalogVerseDeleteResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/verses/{externalVerseId}/admin',
            path: {
                'externalVerseId': externalVerseId,
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
}
