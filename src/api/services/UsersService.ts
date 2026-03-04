/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from '../models/User';
import type { UserDashboardStats } from '../models/UserDashboardStats';
import type { UserLeaderboardResponse } from '../models/UserLeaderboardResponse';
import type { UserWithVerses } from '../models/UserWithVerses';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Создать/обновить пользователя по telegramId
     * @param requestBody
     * @returns User Создан/обновлён
     * @throws ApiError
     */
    public static postApiUsers(
        requestBody: {
            telegramId: string;
            translation?: string;
            name?: string;
            nickname?: string;
            avatarUrl?: string;
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
     * Получить пользователя по telegramId
     * @param telegramId
     * @returns UserWithVerses OK
     * @throws ApiError
     */
    public static getApiUsers(
        telegramId: string,
    ): CancelablePromise<UserWithVerses> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}',
            path: {
                'telegramId': telegramId,
            },
            errors: {
                404: `Не найден`,
            },
        });
    }
    /**
     * Персональная статистика пользователя для дашборда
     * @param telegramId
     * @returns UserDashboardStats OK
     * @throws ApiError
     */
    public static getApiUsersStats(
        telegramId: string,
    ): CancelablePromise<UserDashboardStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/stats',
            path: {
                'telegramId': telegramId,
            },
            errors: {
                404: `Не найден`,
            },
        });
    }
    /**
     * Таблица лидеров для главной страницы
     * @param telegramId
     * @param limit
     * @returns UserLeaderboardResponse OK
     * @throws ApiError
     */
    public static getApiUsersLeaderboard(
        telegramId?: string,
        limit?: number,
    ): CancelablePromise<UserLeaderboardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/leaderboard',
            query: {
                'telegramId': telegramId,
                'limit': limit,
            },
        });
    }
    /**
     * Инициализация пользователя через Telegram
     * @param requestBody
     * @returns User Пользователь уже существует
     * @throws ApiError
     */
    public static postApiUsersTelegram(
        requestBody: {
            telegramId: string;
            translation?: string;
            name?: string;
            nickname?: string;
            avatarUrl?: string;
        },
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/telegram',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
