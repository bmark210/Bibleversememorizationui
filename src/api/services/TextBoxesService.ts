/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_AddVerseToTextBoxRequest } from '../models/api_AddVerseToTextBoxRequest';
import type { api_AnchorTrainingSessionResponse } from '../models/api_AnchorTrainingSessionResponse';
import type { api_BooleanOKResponse } from '../models/api_BooleanOKResponse';
import type { api_CreateTextBoxRequest } from '../models/api_CreateTextBoxRequest';
import type { api_FlashcardResponse } from '../models/api_FlashcardResponse';
import type { api_FlashcardSessionResponse } from '../models/api_FlashcardSessionResponse';
import type { api_ReferenceTrainerResponse } from '../models/api_ReferenceTrainerResponse';
import type { api_ReplaceLearningVerseRequest } from '../models/api_ReplaceLearningVerseRequest';
import type { api_ReplaceLearningVerseResponse } from '../models/api_ReplaceLearningVerseResponse';
import type { api_UpdateTextBoxRequest } from '../models/api_UpdateTextBoxRequest';
import type { domain_AddVerseToTextBoxResult } from '../models/domain_AddVerseToTextBoxResult';
import type { domain_AnchorTrainingSessionInput } from '../models/domain_AnchorTrainingSessionInput';
import type { domain_FlashcardSessionInput } from '../models/domain_FlashcardSessionInput';
import type { domain_PublicTextBoxDetailResponse } from '../models/domain_PublicTextBoxDetailResponse';
import type { domain_PublicTextBoxesPageResponse } from '../models/domain_PublicTextBoxesPageResponse';
import type { domain_RemoveTextBoxVerseResult } from '../models/domain_RemoveTextBoxVerseResult';
import type { domain_TextBoxSummary } from '../models/domain_TextBoxSummary';
import type { domain_TextBoxVersesResponse } from '../models/domain_TextBoxVersesResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TextBoxesService {
    /**
     * List public text boxes
     * @param translation Bible translation (NRT, SYNOD, RBS2, BTI)
     * @param limit Max items
     * @param offset Offset
     * @returns domain_PublicTextBoxesPageResponse OK
     * @throws ApiError
     */
    public static listPublicTextBoxes(
        translation?: string,
        limit: number = 24,
        offset?: number,
    ): CancelablePromise<domain_PublicTextBoxesPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/text-boxes/public',
            query: {
                'translation': translation,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * List boxes visible from followed users
     * @param telegramId Telegram ID
     * @param translation Bible translation (NRT, SYNOD, RBS2, BTI)
     * @param limit Max items
     * @param offset Offset
     * @returns domain_PublicTextBoxesPageResponse OK
     * @throws ApiError
     */
    public static listFriendTextBoxes(
        telegramId: string,
        translation?: string,
        limit: number = 24,
        offset?: number,
    ): CancelablePromise<domain_PublicTextBoxesPageResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/text-boxes/friends',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'translation': translation,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Get a public text box with its verses
     * @param boxId Box ID
     * @param translation Bible translation
     * @returns domain_PublicTextBoxDetailResponse OK
     * @throws ApiError
     */
    public static getPublicTextBox(
        boxId: string,
        telegramId?: string,
        translation?: string,
    ): CancelablePromise<domain_PublicTextBoxDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/text-boxes/public/{boxId}',
            path: {
                'boxId': boxId,
            },
            query: {
                'telegramId': telegramId,
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * List user's text boxes
     * @param telegramId Telegram ID
     * @param translation Bible translation (NRT, SYNOD, RBS2, BTI)
     * @returns domain_TextBoxSummary OK
     * @throws ApiError
     */
    public static listTextBoxes(
        telegramId: string,
        translation?: string,
    ): CancelablePromise<Array<domain_TextBoxSummary>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/text-boxes',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Create a new text box
     * @param telegramId Telegram ID
     * @param request Text box payload
     * @param translation Bible translation
     * @returns domain_TextBoxSummary Created
     * @throws ApiError
     */
    public static createTextBox(
        telegramId: string,
        request: api_CreateTextBoxRequest,
        translation?: string,
    ): CancelablePromise<domain_TextBoxSummary> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/text-boxes',
            path: {
                'telegramId': telegramId,
            },
            query: {
                'translation': translation,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * Import a public text box into user's library
     * @param telegramId Telegram ID
     * @param boxId Source public box ID
     * @param translation Bible translation
     * @returns domain_TextBoxSummary Created
     * @throws ApiError
     */
    public static importPublicTextBox(
        telegramId: string,
        boxId: string,
        translation?: string,
    ): CancelablePromise<domain_TextBoxSummary> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/text-boxes/import-public/{boxId}',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            query: {
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Get a single text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param translation Bible translation
     * @returns domain_TextBoxSummary OK
     * @throws ApiError
     */
    public static getTextBox(
        telegramId: string,
        boxId: string,
        translation?: string,
    ): CancelablePromise<domain_TextBoxSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/text-boxes/{boxId}',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            query: {
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Delete a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @returns api_BooleanOKResponse OK
     * @throws ApiError
     */
    public static deleteTextBox(
        telegramId: string,
        boxId: string,
    ): CancelablePromise<api_BooleanOKResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{telegramId}/text-boxes/{boxId}',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Update a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param request Update payload
     * @param translation Bible translation
     * @returns domain_TextBoxSummary OK
     * @throws ApiError
     */
    public static updateTextBox(
        telegramId: string,
        boxId: string,
        request: api_UpdateTextBoxRequest,
        translation?: string,
    ): CancelablePromise<domain_TextBoxSummary> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/users/{telegramId}/text-boxes/{boxId}',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            query: {
                'translation': translation,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Atomically swap a learning verse in a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param request Activate/pause verse IDs
     * @returns api_ReplaceLearningVerseResponse OK
     * @throws ApiError
     */
    public static replaceLearningVerseInTextBox(
        telegramId: string,
        boxId: string,
        request: api_ReplaceLearningVerseRequest,
    ): CancelablePromise<api_ReplaceLearningVerseResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/replace-learning',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                409: `Conflict`,
            },
        });
    }
    /**
     * Get flashcard verse pool for a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param limit Max verses
     * @param translation Bible translation
     * @returns api_FlashcardResponse OK
     * @throws ApiError
     */
    public static getTextBoxFlashcard(
        telegramId: string,
        boxId: string,
        limit: number = 20,
        translation?: string,
    ): CancelablePromise<api_FlashcardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/training/flashcard',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            query: {
                'limit': limit,
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Submit flashcard session results for a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param request Session results
     * @returns api_FlashcardSessionResponse OK
     * @throws ApiError
     */
    public static textBoxFlashcardSession(
        telegramId: string,
        boxId: string,
        request: domain_FlashcardSessionInput,
    ): CancelablePromise<api_FlashcardSessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/training/flashcard/session',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Get reference trainer verse pool for a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param limit Max verses
     * @param translation Bible translation
     * @returns api_ReferenceTrainerResponse OK
     * @throws ApiError
     */
    public static getTextBoxReferenceTrainer(
        telegramId: string,
        boxId: string,
        limit: number = 12,
        translation?: string,
    ): CancelablePromise<api_ReferenceTrainerResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/training/reference-trainer',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            query: {
                'limit': limit,
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Submit reference trainer session results for a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param request Session results
     * @returns api_AnchorTrainingSessionResponse OK
     * @throws ApiError
     */
    public static textBoxReferenceTrainerSession(
        telegramId: string,
        boxId: string,
        request: domain_AnchorTrainingSessionInput,
    ): CancelablePromise<api_AnchorTrainingSessionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/training/reference-trainer/session',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * List verses in a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param translation Bible translation
     * @returns domain_TextBoxVersesResponse OK
     * @throws ApiError
     */
    public static listTextBoxVerses(
        telegramId: string,
        boxId: string,
        translation?: string,
    ): CancelablePromise<domain_TextBoxVersesResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/verses',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            query: {
                'translation': translation,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Add a verse to a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param request Verse to add
     * @param translation Bible translation
     * @returns domain_AddVerseToTextBoxResult OK
     * @throws ApiError
     */
    public static addVerseToTextBox(
        telegramId: string,
        boxId: string,
        request: api_AddVerseToTextBoxRequest,
        translation?: string,
    ): CancelablePromise<domain_AddVerseToTextBoxResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/verses',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
            },
            query: {
                'translation': translation,
            },
            body: request,
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * Remove a verse from a text box
     * @param telegramId Telegram ID
     * @param boxId Box ID
     * @param externalVerseId External verse ID
     * @returns domain_RemoveTextBoxVerseResult OK
     * @throws ApiError
     */
    public static removeVerseFromTextBox(
        telegramId: string,
        boxId: string,
        externalVerseId: string,
    ): CancelablePromise<domain_RemoveTextBoxVerseResult> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/users/{telegramId}/text-boxes/{boxId}/verses/{externalVerseId}',
            path: {
                'telegramId': telegramId,
                'boxId': boxId,
                'externalVerseId': externalVerseId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
}
