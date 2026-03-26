import type { bible_memory_db_internal_domain_UserLeaderboardResponse } from "./bible_memory_db_internal_domain_UserLeaderboardResponse";

/** Базовый ответ API + опциональные поля пагинации лидерборда */
export type domain_UserLeaderboardResponse =
  bible_memory_db_internal_domain_UserLeaderboardResponse & {
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
