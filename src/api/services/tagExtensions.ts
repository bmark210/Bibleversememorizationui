import type { domain_Tag } from "@/api/models/domain_Tag";
import { TagsService } from "./TagsService";

export async function listVerseTags(externalVerseId: string): Promise<domain_Tag[]> {
  const response = await TagsService.listVerseTags(externalVerseId);
  return response ?? [];
}

export async function postTag(params: {
  title: string;
  slug: string;
  telegramId?: string;
}): Promise<domain_Tag> {
  return TagsService.createTag(
    { title: params.title, slug: params.slug },
    params.telegramId,
    params.telegramId,
  );
}