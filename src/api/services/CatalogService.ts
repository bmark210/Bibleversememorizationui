/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_LookupCatalogVersesRequest } from '../models/api_LookupCatalogVersesRequest';
import type { domain_CatalogVerseDeleteResponse } from '../models/domain_CatalogVerseDeleteResponse';
import type { domain_CatalogVerseLookupResponse } from '../models/domain_CatalogVerseLookupResponse';
import type { domain_CatalogVersesPageResponse } from '../models/domain_CatalogVersesPageResponse';
import type { domain_VerseAdminSummary } from '../models/domain_VerseAdminSummary';
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
     * @param popularOnly Only verses with tags
     * @param tagSlugs Comma-separated tag slugs
     * @param search Search in verse text or reference
     * @param orderBy Sort field
     * @param order Sort direction
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns domain_CatalogVersesPageResponse OK
     * @throws ApiError
     */
    public static listCatalogVerses(
        telegramId?: string,
        translation?: 'NRT' | 'SYNOD' | 'RBS2' | 'BTI',
        bookId?: number,
        popularOnly?: boolean,
        tagSlugs?: string,
        search?: string,
        orderBy: string = 'createdAt',
        order: string = 'desc',
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<domain_CatalogVersesPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/verses',
            query: {
                'telegramId': telegramId,
                'translation': translation,
                'bookId': bookId,
                'popularOnly': popularOnly,
                'tagSlugs': tagSlugs,
                'search': search,
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
     * Lookup catalog verses by external IDs
     * Batch enrichment endpoint for catalog cards. Returns only verses that exist in the catalog DB, preserving the requested order.
     * @param request Lookup payload
     * @returns domain_CatalogVerseLookupResponse OK
     * @throws ApiError
     */
    public static lookupCatalogVerses(
        request: api_LookupCatalogVersesRequest,
    ): CancelablePromise<domain_CatalogVerseLookupResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/verses/lookup',
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get verse admin summary
     * @param externalVerseId External verse ID
     * @param telegramId Admin Telegram ID
     * @param xTelegramId Admin Telegram ID
     * @returns domain_VerseAdminSummary OK
     * @throws ApiError
     */
    public static getVerseAdminSummary(
        externalVerseId: string,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<domain_VerseAdminSummary> {
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
     * @returns domain_CatalogVerseDeleteResponse OK
     * @throws ApiError
     */
    public static deleteCatalogVerse(
        externalVerseId: string,
        telegramId?: string,
        xTelegramId?: string,
    ): CancelablePromise<domain_CatalogVerseDeleteResponse> {
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
