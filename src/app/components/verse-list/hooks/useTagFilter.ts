import { useState, useEffect, useCallback } from 'react';
import { TagsService } from '@/api/services/TagsService';
import type { bible_memory_db_internal_domain_Tag as domain_Tag } from '@/api/models/bible_memory_db_internal_domain_Tag';
import type { Verse } from "@/app/domain/verse";
import { parseStoredTagSlugs, VERSE_LIST_STORAGE_KEYS } from '../storage';

const TAG_TITLE_COLLATOR = new Intl.Collator(['ru', 'en'], {
  sensitivity: 'base',
  numeric: true,
});

const sortTagsByTitle = (tags: domain_Tag[]) =>
  [...tags].sort((a, b) =>
    TAG_TITLE_COLLATOR.compare((a.title ?? '').trim(), (b.title ?? '').trim())
  );

type UseTagFilterParams = {
  disabled?: boolean;
  initialTags?: domain_Tag[];
  reloadVersion?: number;
};

export function useTagFilter(params?: UseTagFilterParams) {
  const disabled = params?.disabled ?? false;
  const initialTags = params?.initialTags ?? [];
  const reloadVersion = params?.reloadVersion ?? 0;
  const [allTags, setAllTags] = useState<domain_Tag[]>(() => sortTagsByTitle(initialTags));
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
      .then((tags) => {
        const sortedTags = sortTagsByTitle(tags);
        const availableSlugs = new Set(
          sortedTags
            .map((tag) => tag.slug ?? '')
            .filter(Boolean)
        );

        setAllTags(sortedTags);
        setSelectedTagSlugs((prev) => {
          if (prev.size === 0) return prev;

          let hasChanges = false;
          const next = new Set<string>();

          prev.forEach((slug) => {
            if (availableSlugs.has(slug)) {
              next.add(slug);
            } else {
              hasChanges = true;
            }
          });

          return hasChanges ? next : prev;
        });
      })
      .catch(() => {})
      .finally(() => setIsLoadingTags(false));
    return () => req.cancel();
  }, [disabled, reloadVersion]);

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

  return {
    allTags,
    selectedTagSlugs,
    isLoadingTags,
    hasActiveTags: selectedTagSlugs.size > 0,
    toggleTag,
    clearTags,
    matchesTagFilter,
  };
}
