import type { bible_memory_db_internal_domain_DeleteUserVerseResult } from "@/api/models/bible_memory_db_internal_domain_DeleteUserVerseResult";
import { UserVersesService } from "./UserVersesService";

export type DeleteUserVerseResult =
  bible_memory_db_internal_domain_DeleteUserVerseResult & {
    promotedVerseIds?: string[];
  };

export async function deleteUserVerse(
  telegramId: string,
  externalVerseId: string,
): Promise<DeleteUserVerseResult> {
  return (await UserVersesService.deleteUserVerse(
    telegramId,
    externalVerseId,
  )) as DeleteUserVerseResult;
}
