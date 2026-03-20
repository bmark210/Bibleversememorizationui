import type { domain_Tag } from "@/api/models/domain_Tag";
import { TagsService } from "@/api/services/TagsService";

export async function listVerseTags(
  externalVerseId: string
): Promise<Array<domain_Tag>> {
  return TagsService.listVerseTags(externalVerseId);
}

export async function postTag(input: {
  title: string;
  slug: string;
}): Promise<domain_Tag> {
  return TagsService.createTag({
    title: input.title,
    slug: input.slug,
  });
}
