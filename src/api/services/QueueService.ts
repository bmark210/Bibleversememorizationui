/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_AddToQueueBody } from '../models/api_AddToQueueBody';
import type { api_ReorderQueueBody } from '../models/api_ReorderQueueBody';
import type { domain_QueueResponse } from '../models/domain_QueueResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class QueueService {
    /**
     * Get verse queue
     * Returns all verses waiting in queue, ordered by position. Also auto-promotes from queue if slots are free.
     * @param telegramId Telegram ID
     * @param translation Bible translation
     * @returns domain_QueueResponse OK
     * @throws ApiError
     */
    public static getVerseQueue(
        telegramId: string,
        translation?: string,
    ): CancelablePromise<domain_QueueResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/verses/queue',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Add verse to queue (body form)
     * @param telegramId Telegram ID
     * @param request Verse ID
     * @returns string OK
     * @throws ApiError
     */
    public static addVerseToQueueBody(
        telegramId: string,
        request: api_AddToQueueBody,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/verses/queue',
            path: {
                'telegramId': telegramId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
            },
        });
    }
    /**
     * Add verse to queue
     * Moves a verse from MY status (or after a 422 capacity error) into the learning queue.
     * @param telegramId Telegram ID
     * @param externalVerseId External verse ID
     * @returns string OK
     * @throws ApiError
     */
    public static addVerseToQueue(
        telegramId: string,
        externalVerseId: string,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/verses/{externalVerseId}/queue',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Remove verse from queue
     * Moves a verse from QUEUE back to MY status.
     * @param telegramId Telegram ID
     * @param externalVerseId External verse ID
     * @returns string OK
     * @throws ApiError
     */
    public static removeVerseFromQueue(
        telegramId: string,
        externalVerseId: string,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{telegramId}/verses/{externalVerseId}/queue',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Reorder verse in queue
     * Moves a verse to a new queue position, shifting other items.
     * @param telegramId Telegram ID
     * @param externalVerseId External verse ID
     * @param request New position
     * @returns string OK
     * @throws ApiError
     */
    public static reorderVerseInQueue(
        telegramId: string,
        externalVerseId: string,
        request: api_ReorderQueueBody,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/users/{telegramId}/verses/{externalVerseId}/queue',
            path: {
                'telegramId': telegramId,
                'externalVerseId': externalVerseId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
}
