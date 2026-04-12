import type { domain_DeleteUserVerseResult } from "../models/domain_DeleteUserVerseResult";
import { UserVersesService } from "./UserVersesService";

export async function deleteUserVerse(
  telegramId: string,
  externalVerseId: string,
): Promise<domain_DeleteUserVerseResult> {
  return UserVersesService.deleteUserVerse(telegramId, externalVerseId);
}
