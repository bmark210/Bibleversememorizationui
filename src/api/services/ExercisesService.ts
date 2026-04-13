/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { api_generateExerciseRequest } from '../models/api_generateExerciseRequest';
import type { api_generateExerciseResponse } from '../models/api_generateExerciseResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ExercisesService {
    /**
     * Generate an AI-powered exercise
     * Uses AI (Gemini/Groq/Grok with fallback) to generate an impostor-word exercise.
     * @param request Exercise generation request
     * @returns api_generateExerciseResponse Generated exercise
     * @throws ApiError
     */
    public static generateExercise(
        request: api_generateExerciseRequest,
    ): CancelablePromise<api_generateExerciseResponse> {
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
