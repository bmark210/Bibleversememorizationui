import type { bible_memory_db_internal_domain_UserVersesPageResponse } from "./bible_memory_db_internal_domain_UserVersesPageResponse";

/** Расширение ответа пагинации: фронт нормализует `total` → `totalCount`. */
export type UserVersesPageResponse = bible_memory_db_internal_domain_UserVersesPageResponse & {
  totalCount?: number;
};
