/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse } from '../models/bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse';
import type { bible_memory_db_internal_domain_DashboardFriendsActivityResponse } from '../models/bible_memory_db_internal_domain_DashboardFriendsActivityResponse';
import type { bible_memory_db_internal_domain_FriendPlayersPageResponse } from '../models/bible_memory_db_internal_domain_FriendPlayersPageResponse';
import type { bible_memory_db_internal_domain_PlayerProfile } from '../models/bible_memory_db_internal_domain_PlayerProfile';
import type { bible_memory_db_internal_domain_UpsertUserInput } from '../models/bible_memory_db_internal_domain_UpsertUserInput';
import type { bible_memory_db_internal_domain_User } from '../models/bible_memory_db_internal_domain_User';
import type { bible_memory_db_internal_domain_UserDashboardStats } from '../models/bible_memory_db_internal_domain_UserDashboardStats';
import type { bible_memory_db_internal_domain_UserLeaderboardResponse } from '../models/bible_memory_db_internal_domain_UserLeaderboardResponse';
import type { bible_memory_db_internal_domain_UserWithVerses } from '../models/bible_memory_db_internal_domain_UserWithVerses';
import type { internal_api_ActionStatusResponse } from '../models/internal_api_ActionStatusResponse';
import type { internal_api_AddFriendRequest } from '../models/internal_api_AddFriendRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UsersService {
    /**
     * Create or update a user
     * @param request User payload
     * @returns bible_memory_db_internal_domain_User Created
     * @throws ApiError
     */
    public static upsertUser(
        request: bible_memory_db_internal_domain_UpsertUserInput,
    ): CancelablePromise<bible_memory_db_internal_domain_User> {
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
     * @param limit Max items
     * @param offset Pagination offset
     * @param aroundCurrent Center returned window around current user rank
     * @returns bible_memory_db_internal_domain_UserLeaderboardResponse OK
     * @throws ApiError
     */
    public static getLeaderboard(
        telegramId?: string,
        limit: number = 25,
        offset?: number,
        aroundCurrent?: boolean,
    ): CancelablePromise<bible_memory_db_internal_domain_UserLeaderboardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/leaderboard',
            query: {
                'telegramId': telegramId,
                'limit': limit,
                'offset': offset,
                'aroundCurrent': aroundCurrent,
            },
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create or refresh a Telegram user
     * @param request Telegram user payload
     * @returns bible_memory_db_internal_domain_User OK
     * @throws ApiError
     */
    public static upsertTelegramUser(
        request: bible_memory_db_internal_domain_UpsertUserInput,
    ): CancelablePromise<bible_memory_db_internal_domain_User> {
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
     * @returns bible_memory_db_internal_domain_UserWithVerses OK
     * @throws ApiError
     */
    public static getUserByTelegramId(
        telegramId: string,
    ): CancelablePromise<bible_memory_db_internal_domain_UserWithVerses> {
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
     * @returns bible_memory_db_internal_domain_FriendPlayersPageResponse OK
     * @throws ApiError
     */
    public static listFriends(
        telegramId: string,
        search?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<bible_memory_db_internal_domain_FriendPlayersPageResponse> {
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
     * @returns internal_api_ActionStatusResponse OK
     * @throws ApiError
     */
    public static addFriend(
        telegramId: string,
        request: internal_api_AddFriendRequest,
    ): CancelablePromise<internal_api_ActionStatusResponse> {
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
     * @returns bible_memory_db_internal_domain_DashboardFriendsActivityResponse OK
     * @throws ApiError
     */
    public static listFriendsActivity(
        telegramId: string,
        limit: number = 6,
    ): CancelablePromise<bible_memory_db_internal_domain_DashboardFriendsActivityResponse> {
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
     * Get compact friends activity
     * @param telegramId Telegram ID
     * @param limit Max items
     * @returns bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse OK
     * @throws ApiError
     */
    public static listFriendsActivityCompact(
        telegramId: string,
        limit: number = 12,
    ): CancelablePromise<bible_memory_db_internal_domain_DashboardCompactFriendsActivityResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/friends/activity/compact',
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
     * @returns internal_api_ActionStatusResponse OK
     * @throws ApiError
     */
    public static removeFriend(
        telegramId: string,
        friendTelegramId: string,
    ): CancelablePromise<internal_api_ActionStatusResponse> {
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
     * @returns bible_memory_db_internal_domain_FriendPlayersPageResponse OK
     * @throws ApiError
     */
    public static listPlayers(
        telegramId: string,
        search?: string,
        limit: number = 20,
        startWith?: number,
    ): CancelablePromise<bible_memory_db_internal_domain_FriendPlayersPageResponse> {
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
     * @returns bible_memory_db_internal_domain_PlayerProfile OK
     * @throws ApiError
     */
    public static getPlayerProfile(
        telegramId: string,
        targetTelegramId: string,
    ): CancelablePromise<bible_memory_db_internal_domain_PlayerProfile> {
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
     * @returns bible_memory_db_internal_domain_UserDashboardStats OK
     * @throws ApiError
     */
    public static getUserStats(
        telegramId: string,
    ): CancelablePromise<bible_memory_db_internal_domain_UserDashboardStats> {
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
