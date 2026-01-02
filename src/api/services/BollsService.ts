/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BollsParallelVersesParams } from '../models/BollsParallelVersesParams';
import type { BollsVerse } from '../models/BollsVerse';
import type { BollsVersesRequest } from '../models/BollsVersesRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BollsService {
    /**
     * Прокси к переводам Bolls
     * @returns any Список переводов
     * @throws ApiError
     */
    public static getApiBollsTranslations(): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bolls/translations',
        });
    }
    /**
     * Сравнение стихов в разных переводах Bolls
     * @param requestBody
     * @returns BollsVerse Список параллелей по переводам
     * @throws ApiError
     */
    public static postApiBollsParallel(
        requestBody: BollsParallelVersesParams,
    ): CancelablePromise<Array<Array<BollsVerse>>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/bolls/parallel',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Неверный запрос`,
            },
        });
    }
    /**
     * Получить несколько стихов из разных мест
     * @param requestBody
     * @returns BollsVerse Список массивов стихов
     * @throws ApiError
     */
    public static postApiBollsVerses(
        requestBody: BollsVersesRequest,
    ): CancelablePromise<Array<Array<BollsVerse>>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/bolls/verses',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Неверный запрос`,
            },
        });
    }
}
