/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_VerseAction } from './domain_VerseAction';
import type { domain_VerseFlowAvailability } from './domain_VerseFlowAvailability';
import type { domain_VerseFlowCode } from './domain_VerseFlowCode';
import type { domain_VerseFlowGroup } from './domain_VerseFlowGroup';
import type { domain_VerseFlowPhase } from './domain_VerseFlowPhase';
export type domain_VerseFlow = {
    allowedActions?: Array<domain_VerseAction>;
    availability?: domain_VerseFlowAvailability;
    availableAt?: string;
    code?: domain_VerseFlowCode;
    group?: domain_VerseFlowGroup;
    phase?: domain_VerseFlowPhase;
    progressPercent?: number;
    remainingLearnings?: number;
    remainingReviews?: number;
};

