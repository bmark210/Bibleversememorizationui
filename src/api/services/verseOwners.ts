import type { domain_SocialPlayersPageResponse } from "@/api/models/domain_SocialPlayersPageResponse";
import { UserVersesService } from "@/api/services/UserVersesService";

export type VerseOwnersScope = NonNullable<
  Parameters<typeof UserVersesService.listVerseOwners>[2]
>;

export async function fetchVerseOwnersPage(
  viewerTelegramId: string,
  externalVerseId: string,
  params: {
    scope: VerseOwnersScope;
    limit?: number;
    startWith?: number;
  }
): Promise<domain_SocialPlayersPageResponse> {
  return UserVersesService.listVerseOwners(
    viewerTelegramId,
    externalVerseId,
    params.scope,
    params.limit ?? 20,
    params.startWith
  );
}
