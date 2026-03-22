import type { domain_SocialPlayerListItem } from "@/api/models/domain_SocialPlayerListItem";
import { UserVersesService } from "@/api/services/UserVersesService";

export type VerseOwnersScope = "friends" | "players";

export type VerseOwnersPage = {
  items: Array<domain_SocialPlayerListItem>;
  totalCount: number;
};

export async function fetchVerseOwnersPage(
  viewerTelegramId: string,
  externalVerseId: string,
  params: {
    scope: VerseOwnersScope;
    limit: number;
    startWith?: number;
  }
): Promise<VerseOwnersPage> {
  const page = await UserVersesService.listVerseOwners(
    viewerTelegramId,
    externalVerseId,
    params.scope,
    params.limit,
    params.startWith
  );
  return {
    items: page.items ?? [],
    totalCount: page.totalCount ?? (page.items?.length ?? 0),
  };
}
