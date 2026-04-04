/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { internal_api_generateExerciseRequest } from '../models/internal_api_generateExerciseRequest';
import type { internal_api_generateExerciseResponse } from '../models/internal_api_generateExerciseResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExercisesService {
    /**
     * Generate an AI-powered exercise
     * Uses AI (Gemini/Groq/Grok with fallback) to generate an impostor-word exercise.
     * @param request Exercise generation request
     * @returns internal_api_generateExerciseResponse Generated exercise
     * @throws ApiError
     */
    public static generateExercise(
        request: internal_api_generateExerciseRequest,
    ): CancelablePromise<internal_api_generateExerciseResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/generate-exercise',
            body: request,
            errors: {
                400: `Invalid request`,
                502: `All AI providers failed`,
            },
        });
    }
}
