/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardFriendsActivityResponse } from '../models/DashboardFriendsActivityResponse';
import type { FriendPlayersPageResponse } from '../models/FriendPlayersPageResponse';
import type { FriendsMutationResponse } from '../models/FriendsMutationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FriendsService {
    /**
     * Список игроков для поиска друзей
     * @param telegramId
     * @param search
     * @param limit
     * @param startWith
     * @returns FriendPlayersPageResponse OK
     * @throws ApiError
     */
    public static getApiUsersPlayers(
        telegramId: string,
        search?: string,
        limit?: number,
        startWith?: number,
    ): CancelablePromise<FriendPlayersPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/players',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'search': search,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                404: `Пользователь не найден`,
            },
        });
    }
    /**
     * Список друзей (подписок пользователя)
     * @param telegramId
     * @param search
     * @param limit
     * @param startWith
     * @returns FriendPlayersPageResponse OK
     * @throws ApiError
     */
    public static getApiUsersFriends(
        telegramId: string,
        search?: string,
        limit?: number,
        startWith?: number,
    ): CancelablePromise<FriendPlayersPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/friends',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'search': search,
                'limit': limit,
                'startWith': startWith,
            },
            errors: {
                404: `Пользователь не найден`,
            },
        });
    }
    /**
     * Добавить пользователя в друзья (подписка)
     * @param telegramId
     * @param requestBody
     * @returns FriendsMutationResponse OK
     * @throws ApiError
     */
    public static postApiUsersFriends(
        telegramId: string,
        requestBody: {
            targetTelegramId: string;
        },
    ): CancelablePromise<FriendsMutationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/friends',
            path: {
                'telegramId': telegramId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Некорректный запрос`,
                404: `Пользователь не найден`,
            },
        });
    }
    /**
     * Удалить пользователя из друзей
     * @param telegramId
     * @param friendTelegramId
     * @returns FriendsMutationResponse OK
     * @throws ApiError
     */
    public static deleteApiUsersFriends(
        telegramId: string,
        friendTelegramId: string,
    ): CancelablePromise<FriendsMutationResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{telegramId}/friends/{friendTelegramId}',
            path: {
                'telegramId': telegramId,
                'friendTelegramId': friendTelegramId,
            },
            errors: {
                404: `Пользователь не найден`,
            },
        });
    }
    /**
     * Последняя активность друзей для дашборда (с композитным рейтингом)
     * @param telegramId
     * @param limit
     * @returns DashboardFriendsActivityResponse OK
     * @throws ApiError
     */
    public static getApiUsersFriendsActivity(
        telegramId: string,
        limit?: number,
    ): CancelablePromise<DashboardFriendsActivityResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/friends/activity',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'limit': limit,
            },
            errors: {
                404: `Пользователь не найден`,
            },
        });
    }
}
