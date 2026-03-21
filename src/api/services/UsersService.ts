/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_ActionStatusResponse } from '../models/api_ActionStatusResponse';
import type { api_AddFriendRequest } from '../models/api_AddFriendRequest';
import type { domain_DashboardFriendsActivityResponse } from '../models/domain_DashboardFriendsActivityResponse';
import type { domain_FriendPlayersPageResponse } from '../models/domain_FriendPlayersPageResponse';
import type { domain_PlayerProfile } from '../models/domain_PlayerProfile';
import type { domain_UpsertUserInput } from '../models/domain_UpsertUserInput';
import type { domain_User } from '../models/domain_User';
import type { domain_UserDashboardStats } from '../models/domain_UserDashboardStats';
import type { domain_UserLeaderboardResponse } from '../models/domain_UserLeaderboardResponse';
import type { domain_UserWithVerses } from '../models/domain_UserWithVerses';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Create or update a user
     * @param request User payload
     * @returns domain_User Created
     * @throws ApiError
     */
    public static upsertUser(
        request: domain_UpsertUserInput,
    ): CancelablePromise<domain_User> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users',
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get users leaderboard
     * @param telegramId Optional current user Telegram ID
     * @param limit Legacy max items (deprecated)
     * @param page 1-based page; omit to anchor on current user’s page when telegramId is set
     * @param pageSize Items per page (default 5 on server)
     * @returns domain_UserLeaderboardResponse OK
     * @throws ApiError
     */
    public static getLeaderboard(
        telegramId?: string,
        limit?: number,
        page?: number,
        pageSize?: number,
    ): CancelablePromise<domain_UserLeaderboardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/leaderboard',
            query: {
                'telegramId': telegramId,
                'limit': limit,
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create or refresh a Telegram user
     * @param request Telegram user payload
     * @returns domain_User OK
     * @throws ApiError
     */
    public static upsertTelegramUser(
        request: domain_UpsertUserInput,
    ): CancelablePromise<domain_User> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/telegram',
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get user by Telegram ID
     * @param telegramId Telegram ID
     * @returns domain_UserWithVerses OK
     * @throws ApiError
     */
    public static getUserByTelegramId(
        telegramId: string,
    ): CancelablePromise<domain_UserWithVerses> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}',
            path: {
                'telegramId': telegramId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * List friends
     * @param telegramId Telegram ID
     * @param search Search by name or nickname
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns domain_FriendPlayersPageResponse OK
     * @throws ApiError
     */
    public static listFriends(
        telegramId: string,
        search?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<domain_FriendPlayersPageResponse> {
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
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Add a friend
     * @param telegramId Telegram ID
     * @param request Friend payload
     * @returns api_ActionStatusResponse OK
     * @throws ApiError
     */
    public static addFriend(
        telegramId: string,
        request: api_AddFriendRequest,
    ): CancelablePromise<api_ActionStatusResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/friends',
            path: {
                'telegramId': telegramId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get friends activity
     * @param telegramId Telegram ID
     * @param limit Max items
     * @returns domain_DashboardFriendsActivityResponse OK
     * @throws ApiError
     */
    public static listFriendsActivity(
        telegramId: string,
        limit: number = 6,
    ): CancelablePromise<domain_DashboardFriendsActivityResponse> {
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
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Remove a friend
     * @param telegramId Telegram ID
     * @param friendTelegramId Friend Telegram ID
     * @returns api_ActionStatusResponse OK
     * @throws ApiError
     */
    public static removeFriend(
        telegramId: string,
        friendTelegramId: string,
    ): CancelablePromise<api_ActionStatusResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{telegramId}/friends/{friendTelegramId}',
            path: {
                'telegramId': telegramId,
                'friendTelegramId': friendTelegramId,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * List players
     * @param telegramId Telegram ID
     * @param search Search by name or nickname
     * @param limit Max items
     * @param startWith Pagination offset
     * @returns domain_FriendPlayersPageResponse OK
     * @throws ApiError
     */
    public static listPlayers(
        telegramId: string,
        search?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<domain_FriendPlayersPageResponse> {
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
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get player profile
     * @param telegramId Viewer Telegram ID
     * @param targetTelegramId Target Telegram ID
     * @returns domain_PlayerProfile OK
     * @throws ApiError
     */
    public static getPlayerProfile(
        telegramId: string,
        targetTelegramId: string,
    ): CancelablePromise<domain_PlayerProfile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/players/{targetTelegramId}',
            path: {
                'telegramId': telegramId,
                'targetTelegramId': targetTelegramId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get dashboard statistics
     * @param telegramId Telegram ID
     * @returns domain_UserDashboardStats OK
     * @throws ApiError
     */
    public static getUserStats(
        telegramId: string,
    ): CancelablePromise<domain_UserDashboardStats> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/stats',
            path: {
                'telegramId': telegramId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
}
