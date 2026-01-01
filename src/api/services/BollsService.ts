/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
}
