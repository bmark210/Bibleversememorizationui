/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OpenApiDoc } from '../models/OpenApiDoc';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DocsService {
    /**
     * Получить открытый Swagger-документ
     * @returns OpenApiDoc Спецификация в JSON
     * @throws ApiError
     */
    public static getApiDocs(): CancelablePromise<OpenApiDoc> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/docs',
        });
    }
}
