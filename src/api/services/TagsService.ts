/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_Tag } from '../models/bible_memory_db_internal_domain_Tag';
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
}
