import type { domain_Tag } from "@/api/models/domain_Tag";
import { TagsService } from "@/api/services/TagsService";
import { getTelegramUserId } from "@/app/lib/telegramWebApp";

export function listVerseTags(externalVerseId: string): Promise<Array<domain_Tag>> {
  return TagsService.listVerseTags(externalVerseId);
}

export async function postTag(body: {
  title: string;
  slug: string;
}): Promise<domain_Tag> {
  const telegramId =
    getTelegramUserId()?.toString().trim() ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem("telegramId")?.trim()
      : undefined);
  return TagsService.createTag(
    { title: body.title, slug: body.slug },
    telegramId,
    telegramId
  );
}
