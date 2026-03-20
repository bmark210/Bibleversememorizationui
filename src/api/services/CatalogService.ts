/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_UserVersesPageResponse } from '../models/bible_memory_db_internal_domain_UserVersesPageResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CatalogService {
    /**
     * List catalog verses
     * @param telegramId Optional current user Telegram ID
     * @param translation Bible translation
     * @param tagSlugs Comma-separated tag slugs
     * @param orderBy Sort field
     * @param order Sort direction
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns bible_memory_db_internal_domain_UserVersesPageResponse OK
     * @throws ApiError
     */
    public static listCatalogVerses(
        telegramId?: string,
        translation?: 'NRT' | 'SYNOD' | 'RBS2' | 'BTI',
        tagSlugs?: string,
        orderBy: string = 'popularity',
        order: string = 'desc',
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<bible_memory_db_internal_domain_UserVersesPageResponse> {
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
                500: `Internal Server Error`,
            },
        });
    }
}
