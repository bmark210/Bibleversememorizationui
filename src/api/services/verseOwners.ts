import type { bible_memory_db_internal_domain_SocialPlayerListItem } from "../models/bible_memory_db_internal_domain_SocialPlayerListItem";
import { UserVersesService } from "./UserVersesService";

export type VerseOwnersScope = "friends" | "players";

/** Совместимо с прежним именем из несуществующего `domain_SocialPlayerListItem`. */
export type domain_SocialPlayerListItem =
  bible_memory_db_internal_domain_SocialPlayerListItem;

export async function fetchVerseOwnersPage(
  telegramId: string,
  externalVerseId: string,
  params: {
    scope: VerseOwnersScope;
    limit: number;
    startWith: number;
  },
): Promise<{
  items: bible_memory_db_internal_domain_SocialPlayerListItem[];
  totalCount: number;
}> {
  const page = await UserVersesService.listVerseOwners(
    telegramId,
    externalVerseId,
    params.scope,
    params.limit,
    params.startWith,
  );
  return {
    items: page.items ?? [],
    totalCount: page.totalCount ?? 0,
  };
}
