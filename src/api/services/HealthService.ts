/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { internal_api_HealthResponse } from '../models/internal_api_HealthResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * Health check
     * @returns internal_api_HealthResponse OK
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<internal_api_HealthResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }
}
