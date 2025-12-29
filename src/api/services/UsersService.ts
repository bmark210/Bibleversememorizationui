/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from '../models/User';
import type { UserWithVerses } from '../models/UserWithVerses';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Получить пользователя
     * @param id
     * @param email
     * @param username
     * @returns UserWithVerses OK
     * @throws ApiError
     */
    public static getApiUsers(
        id?: string,
        email?: string,
        username?: string,
    ): CancelablePromise<UserWithVerses> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users',
            query: {
                'id': id,
                'email': email,
                'username': username,
            },
            errors: {
                400: `Нужно передать id/email/username`,
                404: `Не найден`,
            },
        });
    }
    /**
     * Создать/обновить пользователя по email
     * @param requestBody
     * @returns User Создан/обновлён
     * @throws ApiError
     */
    public static postApiUsers(
        requestBody: {
            name: string;
            username: string;
            avatar: string;
            email: string;
        },
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Получить пользователя по id
     * @param id
     * @returns UserWithVerses OK
     * @throws ApiError
     */
    public static getApiUsers1(
        id: string,
    ): CancelablePromise<UserWithVerses> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `Не найден`,
            },
        });
    }
    /**
     * Обновить пользователя
     * @param id
     * @param requestBody
     * @returns User OK
     * @throws ApiError
     */
    public static patchApiUsers(
        id: string,
        requestBody: {
            name?: string;
            username?: string;
            avatar?: string;
        },
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/users/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
