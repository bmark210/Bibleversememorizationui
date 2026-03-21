import type { domain_DeleteUserVerseResult } from "@/api/models/domain_DeleteUserVerseResult";
import { UserVersesService } from "@/api/services/UserVersesService";

export async function deleteUserVerseWithXp(
  telegramId: string,
  externalVerseId: string
): Promise<domain_DeleteUserVerseResult | null> {
  return UserVersesService.deleteUserVerse(telegramId, externalVerseId);
}
