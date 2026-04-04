import type { bible_memory_db_internal_domain_DeleteUserVerseResult } from "@/api/models/bible_memory_db_internal_domain_DeleteUserVerseResult";
import { UserVersesService } from "./UserVersesService";

export type DeleteUserVerseWithXpResult =
  bible_memory_db_internal_domain_DeleteUserVerseResult & {
    promotedVerseIds?: string[];
  };

export async function deleteUserVerseWithXp(
  telegramId: string,
  externalVerseId: string,
): Promise<DeleteUserVerseWithXpResult> {
  const response = (await UserVersesService.deleteUserVerse(
    telegramId,
    externalVerseId,
  )) as DeleteUserVerseWithXpResult;

  return {
    ...response,
    status: response.status ?? "deleted",
    xp: response.xp ?? 0,
    xpDelta: response.xpDelta ?? 0,
  };
}