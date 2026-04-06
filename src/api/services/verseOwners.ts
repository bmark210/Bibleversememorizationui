import type { bible_memory_db_internal_domain_SocialPlayersPageResponse } from "@/api/models/bible_memory_db_internal_domain_SocialPlayersPageResponse";
import { UserVersesService } from "./UserVersesService";

export type VerseOwnersScope = "friends" | "players";
export type VerseOwnersPage = bible_memory_db_internal_domain_SocialPlayersPageResponse;

export async function fetchVerseOwnersPage(
  telegramId: string,
  externalVerseId: string,
  params: {
    scope?: VerseOwnersScope;
    limit?: number;
    startWith?: number;
  } = {},
): Promise<VerseOwnersPage> {
  const response = await UserVersesService.listVerseOwners(
    telegramId,
    externalVerseId,
    params.scope,
    params.limit ?? 20,
    params.startWith,
  );

  return {
    ...response,
    items: response.items ?? [],
    limit: response.limit ?? params.limit ?? 20,
    startWith: response.startWith ?? params.startWith ?? 0,
    totalCount: response.totalCount ?? response.items?.length ?? 0,
  };
}