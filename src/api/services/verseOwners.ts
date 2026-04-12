import type { domain_SocialPlayerListItem } from "../models/domain_SocialPlayerListItem";
import { UserVersesService } from "./UserVersesService";

export type VerseOwnersScope = "friends" | "players";

export type { domain_SocialPlayerListItem };

export async function fetchVerseOwnersPage(
  telegramId: string,
  externalVerseId: string,
  params: {
    scope: VerseOwnersScope;
    limit: number;
    startWith: number;
  },
): Promise<{
  items: domain_SocialPlayerListItem[];
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
