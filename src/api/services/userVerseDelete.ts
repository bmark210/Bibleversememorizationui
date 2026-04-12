import type { bible_memory_db_internal_domain_DeleteUserVerseResult } from "../models/bible_memory_db_internal_domain_DeleteUserVerseResult";
import { UserVersesService } from "./UserVersesService";

export async function deleteUserVerse(
  telegramId: string,
  externalVerseId: string,
): Promise<bible_memory_db_internal_domain_DeleteUserVerseResult> {
  return UserVersesService.deleteUserVerse(telegramId, externalVerseId);
}
