import type { bible_memory_db_internal_domain_Tag } from "../models/bible_memory_db_internal_domain_Tag";
import { OpenAPI } from "../core/OpenAPI";
import { request as apiRequest } from "../core/request";
import type { CancelablePromise } from "../core/CancelablePromise";

/** Нет в swagger — вызов к бэкенду, если маршрут появится. */
export function postTag(body: {
  slug: string;
  title: string;
}): CancelablePromise<bible_memory_db_internal_domain_Tag> {
  return apiRequest(OpenAPI, {
    method: "POST",
    url: "/api/tags",
    body,
    mediaType: "application/json",
  });
}

/** Нет в swagger — GET тегов стиха. */
export function listVerseTags(
  externalVerseId: string
): CancelablePromise<Array<bible_memory_db_internal_domain_Tag>> {
  return apiRequest(OpenAPI, {
    method: "GET",
    url: "/api/verses/{externalVerseId}/tags",
    path: { externalVerseId },
  });
}
