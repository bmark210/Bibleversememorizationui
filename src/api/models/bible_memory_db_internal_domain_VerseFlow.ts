/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_VerseAction } from './bible_memory_db_internal_domain_VerseAction';
import type { bible_memory_db_internal_domain_VerseFlowAvailability } from './bible_memory_db_internal_domain_VerseFlowAvailability';
import type { bible_memory_db_internal_domain_VerseFlowCode } from './bible_memory_db_internal_domain_VerseFlowCode';
import type { bible_memory_db_internal_domain_VerseFlowGroup } from './bible_memory_db_internal_domain_VerseFlowGroup';
import type { bible_memory_db_internal_domain_VerseFlowPhase } from './bible_memory_db_internal_domain_VerseFlowPhase';
export type bible_memory_db_internal_domain_VerseFlow = {
    allowedActions?: Array<bible_memory_db_internal_domain_VerseAction>;
    availability?: bible_memory_db_internal_domain_VerseFlowAvailability;
    availableAt?: string;
    code?: bible_memory_db_internal_domain_VerseFlowCode;
    group?: bible_memory_db_internal_domain_VerseFlowGroup;
    phase?: bible_memory_db_internal_domain_VerseFlowPhase;
    progressPercent?: number;
    remainingLearnings?: number;
    remainingReviews?: number;
};

