import type { VerseListSortBy, VerseListStatusFilter } from './constants';

export const VERSE_LIST_STORAGE_KEYS = {
  statusFilter: 'verse-list:status-filter:v1',
  selectedBookId: 'verse-list:selected-book-id:v1',
  sortBy: 'verse-list:sort-by:v1',
  searchQuery: 'verse-list:search-query:v1',
  selectedTagSlugs: 'verse-list:selected-tag-slugs:v1',
  filtersCollapsed: 'verse-list:filters-collapsed:v1',
} as const;

const STATUS_FILTER_VALUES: VerseListStatusFilter[] = [
  'catalog',
  'friends',
  'learning',
  'review',
  'mastered',
  'stopped',
  'my',
];

const SORT_BY_VALUES: VerseListSortBy[] = ['updatedAt', 'bible', 'popularity'];

export function parseStoredStatusFilter(raw: string | null): VerseListStatusFilter | null {
  if (!raw) return null;
  return STATUS_FILTER_VALUES.includes(raw as VerseListStatusFilter)
    ? (raw as VerseListStatusFilter)
    : null;
}

export function parseStoredSortBy(raw: string | null): VerseListSortBy | null {
  if (!raw) return null;
  return SORT_BY_VALUES.includes(raw as VerseListSortBy)
    ? (raw as VerseListSortBy)
    : null;
}

export function parseStoredBookId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 66) return null;
  return parsed;
}

export function parseStoredTagSlugs(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const sanitized = parsed
      .filter((value): value is string => typeof value === 'string')
      .map((slug) => slug.trim())
      .filter(Boolean);
    return new Set(sanitized);
  } catch {
    return new Set();
  }
}

export function parseStoredBoolean(raw: string | null): boolean | null {
  if (!raw) return null;
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return null;
}
