import { useState, useEffect, useCallback } from 'react';
import { TagsService } from '@/api/services/TagsService';
import { postTag } from '@/api/services/tagExtensions';
import { publicApiUrl } from '@/lib/publicApiBase';
import type { Tag } from '@/api/models/Tag';
import type { Verse } from '@/app/App';
import { getTelegramUserId } from '@/app/lib/telegramWebApp';
import { isAdminTelegramId } from '@/lib/admins';
import { parseStoredTagSlugs, VERSE_LIST_STORAGE_KEYS } from '../storage';

const TAG_TITLE_COLLATOR = new Intl.Collator(['ru', 'en'], {
  sensitivity: 'base',
  numeric: true,
});

const sortTagsByTitle = (tags: Tag[]) =>
  [...tags].sort((a, b) =>
    TAG_TITLE_COLLATOR.compare((a.title ?? '').trim(), (b.title ?? '').trim())
  );

type UseTagFilterParams = {
  disabled?: boolean;
  initialTags?: Tag[];
};

export function useTagFilter(params?: UseTagFilterParams) {
  const disabled = params?.disabled ?? false;
  const initialTags = params?.initialTags ?? [];
  const [allTags, setAllTags] = useState<Tag[]>(() => sortTagsByTitle(initialTags));
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<Set<string>>(() => {
    if (disabled) return new Set();
    if (typeof window === 'undefined') return new Set();
    return parseStoredTagSlugs(
      window.localStorage.getItem(VERSE_LIST_STORAGE_KEYS.selectedTagSlugs)
    );
  });
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  useEffect(() => {
    if (!disabled) return;
    setAllTags(sortTagsByTitle(initialTags));
    setSelectedTagSlugs(new Set());
    setIsLoadingTags(false);
  }, [disabled, initialTags]);

  useEffect(() => {
    if (disabled) {
      setIsLoadingTags(false);
      return;
    }
    setIsLoadingTags(true);
    const req = TagsService.listTags();
    req
      .then((tags) => setAllTags(sortTagsByTitle(tags)))
      .catch(() => {})
      .finally(() => setIsLoadingTags(false));
    return () => req.cancel();
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      VERSE_LIST_STORAGE_KEYS.selectedTagSlugs,
      JSON.stringify(Array.from(selectedTagSlugs))
    );
  }, [disabled, selectedTagSlugs]);

  const toggleTag = useCallback((slug: string) => {
    setSelectedTagSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const clearTags = useCallback(() => {
    setSelectedTagSlugs(new Set());
  }, []);

  const matchesTagFilter = useCallback(
    (verse: Pick<Verse, 'tags'>) => {
      if (selectedTagSlugs.size === 0) return true;
      if (!verse.tags || verse.tags.length === 0) return false;
      return verse.tags.some((tag) => selectedTagSlugs.has(tag.slug));
    },
    [selectedTagSlugs]
  );

  const createTag = useCallback(async (title: string, slug: string) => {
    if (disabled) {
      setAllTags((prev) =>
        sortTagsByTitle([
          ...prev,
          { id: `mock-${slug}`, slug, title } as Tag,
        ])
      );
      return;
    }
    const newTag = await postTag({ slug, title });
    setAllTags((prev) => sortTagsByTitle([...prev, newTag]));
  }, [disabled]);

  const deleteTag = useCallback(async (id: string, slug: string) => {
    if (disabled) {
      setAllTags((prev) => prev.filter((t) => t.id !== id));
      setSelectedTagSlugs((prev) => {
        if (!prev.has(slug)) return prev;
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
      return;
    }
    const telegramId =
      getTelegramUserId()?.toString().trim() ||
      window.localStorage.getItem('telegramId')?.trim() ||
      '';

    if (!isAdminTelegramId(telegramId)) {
      throw new Error('Удалять теги может только администратор');
    }

    const res = await fetch(publicApiUrl(`/api/tags/${id}`), {
      method: 'DELETE',
      headers: {
        'x-telegram-id': telegramId,
      },
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; linksCount?: number }
        | null;

      if (res.status === 409) {
        const linksCount = payload?.linksCount;
        throw new Error(
          typeof linksCount === 'number' && linksCount > 0
            ? `Тег используется в ${linksCount} стихах`
            : 'Тег нельзя удалить, пока он связан со стихами'
        );
      }

      throw new Error(payload?.error || 'Не удалось удалить тег');
    }
    setAllTags((prev) => prev.filter((t) => t.id !== id));
    setSelectedTagSlugs((prev) => {
      if (!prev.has(slug)) return prev;
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
  }, [disabled]);

  return {
    allTags,
    selectedTagSlugs,
    isLoadingTags,
    hasActiveTags: selectedTagSlugs.size > 0,
    toggleTag,
    clearTags,
    matchesTagFilter,
    createTag,
    deleteTag,
  };
}
