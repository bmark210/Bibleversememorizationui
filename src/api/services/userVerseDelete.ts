import type { bible_memory_db_internal_domain_DeleteUserVerseResult } from "@/api/models/bible_memory_db_internal_domain_DeleteUserVerseResult";
import { UserVersesService } from "@/api/services/UserVersesService";

export function deleteUserVerseWithXp(
  telegramId: string,
  externalVerseId: string
): Promise<bible_memory_db_internal_domain_DeleteUserVerseResult> {
  return UserVersesService.deleteUserVerse(telegramId, externalVerseId);
}
