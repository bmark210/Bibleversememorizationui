/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { bible_memory_db_internal_domain_QueueVerseItem } from './bible_memory_db_internal_domain_QueueVerseItem';
export type bible_memory_db_internal_domain_QueueResponse = {
    freeSlots?: number;
    items?: Array<bible_memory_db_internal_domain_QueueVerseItem>;
    /**
     * PromotedVerseIds contains any externalVerseIds auto-promoted during this request.
     */
    promotedVerseIds?: Array<string>;
    totalCount?: number;
};

