/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { domain_QueueVerseItem } from './domain_QueueVerseItem';
export type domain_QueueResponse = {
    freeSlots?: number;
    items?: Array<domain_QueueVerseItem>;
    /**
     * PromotedVerseIds contains any externalVerseIds auto-promoted during this request.
     */
    promotedVerseIds?: Array<string>;
    totalCount?: number;
};

