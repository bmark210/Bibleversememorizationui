"use client";

/**
 * BibleCatalogView — aggregated catalog with two primary sources:
 *
 * MODE A · All verses / text search without tags
 *   Primary:     helloao complete.json cached client-side.
 *   Enrichment:  backend batch lookup by externalVerseId for tags + isPopular.
 *   Result:      full-Bible canonical feed, including verses absent from DB.
 *
 * MODE B · Popular / tag-filtered
 *   Primary:     backend catalog only.
 *   Result:      only DB-backed verses that match semantic filters.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import {
  listHelloaoVerses,
  searchHelloaoVerses,
  type HelloaoVerse,
} from "@/shared/bible/helloao";
import { compareExternalVerseIdsCanonically } from "@/shared/bible/externalVerseId";
import {
  fetchCatalogVersesPage,
  lookupCatalogVerses,
} from "@/api/services/catalogVersesPagination";
import { TagsService } from "@/api/services/TagsService";
import { addVerseToTextBox } from "@/api/services/textBoxes";
import type { bible_memory_db_internal_domain_VerseListItem as BackendVerse } from "@/api/models/bible_memory_db_internal_domain_VerseListItem";
import type { domain_Tag } from "@/api/models/domain_Tag";
import { Button } from "@/app/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/app/components/ui/utils";
import { toast } from "@/app/lib/toast";
import {
  BibleBook,
  getAllBibleBooks,
  formatVerseReference,
} from "@/app/types/bible";
import type { TextBoxSummary } from "@/app/types/textBox";
import { formatRussianCount } from "./TextCards";

// ─── Types ────────────────────────────────────────────────────────────────────

type BibleCatalogViewProps = {
  telegramId: string | null;
  boxes: TextBoxSummary[];
  onRefreshBoxes: () => Promise<unknown>;
  onVerseMutationCommitted?: () => void;
};

type VerseTag = { id?: string; slug?: string; title?: string };

type DisplayVerse = {
  externalVerseId: string;
  reference: string;
  text: string;
  bookId: number;
  chapter: number;
  verseNumber: number;
  isPopular: boolean;
  tags: VerseTag[];
  /** true = this verse lives in the backend DB (has tags / user data) */
  inDatabase: boolean;
};

type VisibilityFilter = "all" | "popular";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 400;
const HELLOAO_PAGE_SIZE = 40;
const VIRTUOSO_VIEWPORT_PADDING_PX = 720;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toExternalId(v: HelloaoVerse) {
  return `${v.book}-${v.chapter}-${v.verse}`;
}

function parseExternalVerseId(externalVerseId: string) {
  const [bookIdRaw, chapterRaw, verseNumberRaw] = externalVerseId
    .split("-")
    .map((part) => Number(part));
  if (
    !Number.isFinite(bookIdRaw) ||
    !Number.isFinite(chapterRaw) ||
    !Number.isFinite(verseNumberRaw)
  ) {
    return null;
  }
  return {
    bookId: bookIdRaw,
    chapter: chapterRaw,
    verseNumber: verseNumberRaw,
  };
}

/** helloao embeds raw <mark>…</mark> HTML in the text string — strip it so
 *  our React component can do its own styled highlighting. */
function stripHtmlMarks(text: string): string {
  return text.replace(/<\/?mark>/gi, "");
}

type BackendVerseWithPopularity = BackendVerse & { isPopular?: boolean | null };

function backendToDisplay(v: BackendVerseWithPopularity): DisplayVerse {
  const parsed = parseExternalVerseId(v.externalVerseId ?? "");
  return {
    externalVerseId: v.externalVerseId ?? "",
    reference: v.reference ?? "",
    text: v.text ?? "",
    bookId: parsed?.bookId ?? 0,
    chapter: parsed?.chapter ?? 0,
    verseNumber: parsed?.verseNumber ?? 0,
    isPopular: Boolean(v.isPopular ?? (v.tags ?? []).length > 0),
    tags: (v.tags ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
    })),
    inDatabase: true,
  };
}

function helloaoToDisplay(
  v: HelloaoVerse,
  dbVerse?: BackendVerseWithPopularity | null,
): DisplayVerse {
  const dbTags = (dbVerse?.tags ?? []).map((tag) => ({
    id: tag.id,
    slug: tag.slug,
    title: tag.title,
  }));
  return {
    externalVerseId: toExternalId(v),
    reference: formatVerseReference(v.book, v.chapter, v.verse),
    text: stripHtmlMarks(v.text),
    bookId: v.book,
    chapter: v.chapter,
    verseNumber: v.verse,
    isPopular: Boolean(dbVerse?.isPopular ?? dbTags.length > 0),
    tags: dbTags,
    inDatabase: Boolean(dbVerse),
  };
}

async function addVersesBatch(params: {
  telegramId: string;
  boxId: string;
  externalVerseIds: string[];
}) {
  const ids = Array.from(new Set(params.externalVerseIds)).sort(
    compareExternalVerseIdsCanonically,
  );
  const results: Array<{ addedCount: number; skippedCount: number }> = [];
  for (const id of ids) {
    const r = await addVerseToTextBox(params.telegramId, params.boxId, {
      externalVerseId: id,
    });
    results.push(r);
  }
  return results.reduce(
    (acc, cur) => ({
      addedCount: acc.addedCount + (cur.addedCount ?? 0),
      skippedCount: acc.skippedCount + (cur.skippedCount ?? 0),
    }),
    { addedCount: 0, skippedCount: 0 },
  );
}

// ─── Aggregated catalog hook ──────────────────────────────────────────────────

type CatalogMode = "all_bible" | "text_search" | "tag_filter" | "popular_only";

function detectMode(
  query: string,
  tagSlugs: string[],
  visibility: VisibilityFilter,
): CatalogMode {
  if (visibility === "popular") return "popular_only";
  if (tagSlugs.length > 0) return "tag_filter";
  if (query.trim()) return "text_search";
  return "all_bible";
}

function isHelloaoMode(mode: CatalogMode) {
  return mode === "all_bible" || mode === "text_search";
}

function useAggregatedCatalog(params: {
  telegramId: string | null;
  searchQuery: string;
  tagSlugs: string[];
  bookId: number | null;
  visibility: VisibilityFilter;
}) {
  const { telegramId, searchQuery, tagSlugs, bookId, visibility } = params;
  const mode = detectMode(searchQuery, tagSlugs, visibility);

  const [verses, setVerses] = useState<DisplayVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false); // complete.json downloading
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const versionRef = useRef(0);
  const loadedCountRef = useRef(0);
  const helloaoPageRef = useRef(1);
  const enrichmentMapRef = useRef<Map<string, BackendVerseWithPopularity>>(
    new Map(),
  );

  const fetchHelloaoPage = useCallback(
    async (page: number) => {
      const bookFilter = bookId != null ? (bookId as BibleBook) : undefined;
      if (mode === "all_bible") {
        return listHelloaoVerses({
          book: bookFilter,
          page,
          limit: HELLOAO_PAGE_SIZE,
        });
      }

      return searchHelloaoVerses({
        query: searchQuery.trim(),
        book: bookFilter,
        page,
        limit: HELLOAO_PAGE_SIZE,
      });
    },
    [bookId, mode, searchQuery],
  );

  const enrichHelloaoVerses = useCallback(
    async (sourceVerses: HelloaoVerse[]) => {
      if (sourceVerses.length === 0) {
        return [] as DisplayVerse[];
      }

      const missingIds = sourceVerses
        .map((verse) => toExternalId(verse))
        .filter(
          (externalVerseId) => !enrichmentMapRef.current.has(externalVerseId),
        );

      if (missingIds.length > 0) {
        try {
          const response = await lookupCatalogVerses({
            telegramId: telegramId ?? undefined,
            externalVerseIds: missingIds,
          });
          response.items.forEach((item) => {
            if (item.externalVerseId) {
              enrichmentMapRef.current.set(
                item.externalVerseId,
                item as BackendVerseWithPopularity,
              );
            }
          });
        } catch {
          // Fallback: keep the all-Bible list usable even if enrichment fails.
        }
      }

      return sourceVerses.map((verse) =>
        helloaoToDisplay(
          verse,
          enrichmentMapRef.current.get(toExternalId(verse)) ?? null,
        ),
      );
    },
    [telegramId],
  );

  useEffect(() => {
    const version = ++versionRef.current;
    loadedCountRef.current = 0;
    helloaoPageRef.current = 1;
    enrichmentMapRef.current = new Map();

    setVerses([]);
    setHasMore(false);
    setTotalCount(0);
    setError(null);
    setIsLoading(true);
    setIsLoadingIndex(false);

    (async () => {
      try {
        if (isHelloaoMode(mode)) {
          setIsLoadingIndex(true);
          const result = await fetchHelloaoPage(1);
          if (versionRef.current !== version) return;
          setIsLoadingIndex(false);

          const displayVerses = await enrichHelloaoVerses(result.results);
          if (versionRef.current !== version) return;

          helloaoPageRef.current = 2;
          loadedCountRef.current = displayVerses.length;
          setVerses(displayVerses);
          setTotalCount(result.total);
          setHasMore(displayVerses.length < result.total);
        } else {
          const res = await fetchCatalogVersesPage({
            telegramId: telegramId ?? undefined,
            bookId: bookId ?? undefined,
            popularOnly: visibility === "popular",
            tagSlugs: tagSlugs.length > 0 ? tagSlugs : undefined,
            search: searchQuery.trim() || undefined,
            orderBy: "bible",
            order: "asc",
            limit: HELLOAO_PAGE_SIZE,
            startWith: 0,
          });
          if (versionRef.current !== version) return;

          const items = (res.items ?? []).map((item) =>
            backendToDisplay(item as BackendVerseWithPopularity),
          );
          loadedCountRef.current = items.length;
          setVerses(items);
          setTotalCount(res.totalCount ?? items.length);
          setHasMore(items.length < (res.totalCount ?? items.length));
        }
      } catch (err) {
        if (versionRef.current !== version) return;
        setIsLoadingIndex(false);
        setError("Не удалось загрузить стихи");
        console.error(err);
      } finally {
        if (versionRef.current === version) {
          setIsLoading(false);
          setIsLoadingIndex(false);
        }
      }
    })();
  }, [
    bookId,
    enrichHelloaoVerses,
    fetchHelloaoPage,
    mode,
    searchQuery,
    tagSlugs.join(","),
    telegramId,
    visibility,
  ]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const version = versionRef.current;
    setIsLoadingMore(true);

    try {
      if (isHelloaoMode(mode)) {
        const result = await fetchHelloaoPage(helloaoPageRef.current);
        if (versionRef.current !== version) return;

        const newVerses = await enrichHelloaoVerses(result.results);
        if (versionRef.current !== version) return;

        helloaoPageRef.current += 1;
        setVerses((prev) => {
          const seen = new Set(prev.map((v) => v.externalVerseId));
          const fresh = newVerses.filter((v) => !seen.has(v.externalVerseId));
          const merged = [...prev, ...fresh];
          loadedCountRef.current = merged.length;
          return merged;
        });
        setHasMore(loadedCountRef.current < result.total);
      } else {
        const res = await fetchCatalogVersesPage({
          telegramId: telegramId ?? undefined,
          bookId: bookId ?? undefined,
          popularOnly: visibility === "popular",
          tagSlugs: tagSlugs.length > 0 ? tagSlugs : undefined,
          search: searchQuery.trim() || undefined,
          orderBy: "bible",
          order: "asc",
          limit: HELLOAO_PAGE_SIZE,
          startWith: loadedCountRef.current,
        });
        if (versionRef.current !== version) return;

        const items = (res.items ?? []).map((item) =>
          backendToDisplay(item as BackendVerseWithPopularity),
        );
        setVerses((prev) => {
          const seen = new Set(prev.map((v) => v.externalVerseId));
          const fresh = items.filter((v) => !seen.has(v.externalVerseId));
          const merged = [...prev, ...fresh];
          loadedCountRef.current = merged.length;
          return merged;
        });
        setHasMore(loadedCountRef.current < (res.totalCount ?? 0));
      }
    } catch {
      // silently ignore load-more errors
    } finally {
      if (versionRef.current === version) setIsLoadingMore(false);
    }
  }, [
    bookId,
    enrichHelloaoVerses,
    fetchHelloaoPage,
    hasMore,
    isLoadingMore,
    mode,
    searchQuery,
    tagSlugs,
    telegramId,
    visibility,
  ]);

  return {
    verses,
    mode,
    isLoading,
    isLoadingIndex,
    isLoadingMore,
    hasMore,
    totalCount,
    error,
    loadMore,
  };
}

// ─── Tag pill (reused in drawer) ─────────────────────────────────────────────

function TagPill({
  tag,
  isActive,
  onToggle,
}: {
  tag: domain_Tag;
  isActive: boolean;
  onToggle: () => void;
}) {
  const slug = tag.slug ?? "";
  return (
    <button
      type="button"
      disabled={!slug}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-[5px] text-[12px] font-medium transition-all duration-150",
        isActive
          ? "border-brand-primary/35 bg-brand-primary/12 text-brand-primary shadow-[0_0_0_1px_rgba(var(--color-brand-primary-rgb,124,92,62),0.18)] shadow-[var(--shadow-soft)]"
          : "border-border-subtle bg-bg-elevated text-text-secondary hover:border-brand-primary/25 hover:bg-bg-surface hover:text-text-primary",
        !slug && "pointer-events-none opacity-40",
      )}
    >
      <span
        className={cn(
          "text-[10px] leading-none",
          isActive ? "text-brand-primary/55" : "text-text-muted",
        )}
      >
        #
      </span>
      {tag.title}
    </button>
  );
}

// ─── Text with highlighted segments ──────────────────────────────────────────

function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const segments = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return text.split(new RegExp(`(${escaped})`, "gi"));
    } catch {
      return null;
    }
  }, [text, query]);

  if (!segments) {
    return <span className={className}>{text}</span>;
  }

  const q = query.trim().toLowerCase();
  return (
    <span className={className}>
      {segments.map((part, i) =>
        part.toLowerCase() === q ? (
          <mark
            key={i}
            className="rounded-[3px] bg-brand-primary/22 px-px font-medium text-brand-primary not-italic"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}

// ─── Verse card ───────────────────────────────────────────────────────────────

function VerseCard({
  verse,
  isSelected,
  searchQuery,
  onToggle,
}: {
  verse: DisplayVerse;
  isSelected: boolean;
  searchQuery: string;
  onToggle: () => void;
}) {
  const hasHighlight = searchQuery.trim().length > 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      className={cn(
        "group w-full rounded-[1.5rem] border text-left transition-all duration-150",
        isSelected
          ? "border-brand-primary/30 bg-brand-primary/8 shadow-[0_0_0_1px_rgba(var(--color-brand-primary-rgb,124,92,62),0.15)]"
          : "border-border-default/45 bg-bg-elevated hover:border-brand-primary/20 hover:bg-bg-surface",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Checkbox */}
        <span
          className={cn(
            "mt-[3px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-150",
            isSelected
              ? "border-brand-primary bg-brand-primary"
              : "border-border-subtle/70 bg-transparent group-hover:border-brand-primary/50",
          )}
        >
          {isSelected && <Check className="h-2.5 w-2.5 text-[color:#241b14]" />}
        </span>

        <div className="min-w-0 flex-1">
          {/* Reference */}
          <p
            className={cn(
              "mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
              isSelected ? "text-brand-primary" : "text-text-muted/80",
            )}
          >
            {verse.reference}
          </p>

          {/* Verse text */}
          {hasHighlight ? (
            <HighlightedText
              text={verse.text}
              query={searchQuery}
              className={cn(
                "block text-[13.5px] leading-[1.72] transition-colors",
                isSelected ? "text-text-primary" : "text-text-secondary",
              )}
            />
          ) : (
            <p
              className={cn(
                "line-clamp-3 text-[13.5px] leading-[1.72] transition-colors",
                isSelected ? "text-text-primary" : "text-text-secondary",
              )}
            >
              {verse.text}
            </p>
          )}

          {/* Tags */}
          {verse.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {verse.tags.slice(0, 4).map((tag, i) => (
                <span
                  key={tag.id ?? tag.slug ?? i}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none transition-colors",
                    isSelected
                      ? "border-brand-primary/25 bg-brand-primary/10 text-brand-primary/75"
                      : "border-border-subtle bg-bg-subtle text-text-muted",
                  )}
                >
                  <span className="opacity-50">#</span>
                  {tag.title}
                </span>
              ))}
              {verse.tags.length > 4 && (
                <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-text-muted">
                  +{verse.tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function VerseSkeleton() {
  return (
    <div className="rounded-[1.5rem] border border-border-default/50 bg-bg-elevated p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-3 w-20 rounded-full" />
          <Skeleton className="mb-1.5 h-3.5 w-full rounded-full" />
          <Skeleton className="mb-1.5 h-3.5 w-4/5 rounded-full" />
          <Skeleton className="h-3.5 w-3/5 rounded-full" />
          <div className="mt-2.5 flex gap-1.5">
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BibleCatalogView({
  telegramId,
  boxes,
  onRefreshBoxes,
  onVerseMutationCommitted,
}: BibleCatalogViewProps) {
  /** Канонические книги (66), порядок как в синодальном издании — по id книги. */
  const books = useMemo(
    () =>
      getAllBibleBooks()
        .filter((b) => b.id <= BibleBook.Revelation)
        .sort((a, b) => a.id - b.id),
    [],
  );

  // ── Applied filters ──────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");

  // ── Draft filters (inside drawer) ────────────────────────────────────────
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [draftTagSlugs, setDraftTagSlugs] = useState<Set<string>>(new Set());
  const [draftBookId, setDraftBookId] = useState<number | null>(null);
  const [draftVisibility, setDraftVisibility] =
    useState<VisibilityFilter>("all");
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [isBooksExpanded, setIsBooksExpanded] = useState(false);

  // ── Tags data ────────────────────────────────────────────────────────────
  const [allTags, setAllTags] = useState<domain_Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // ── Selection ────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [busyBoxId, setBusyBoxId] = useState<string | null>(null);

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const tid = window.setTimeout(
      () => setDebouncedSearch(searchInput),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(tid);
  }, [searchInput]);

  // ── Load all tags once ───────────────────────────────────────────────────
  useEffect(() => {
    setIsLoadingTags(true);
    const req = TagsService.listTags();
    req
      .then((tags) =>
        setAllTags(
          [...tags].sort((a, b) =>
            (a.title ?? "").localeCompare(b.title ?? "", "ru"),
          ),
        ),
      )
      .catch(() => {})
      .finally(() => setIsLoadingTags(false));
    return () => req.cancel();
  }, []);

  // ── Catalog data ─────────────────────────────────────────────────────────
  const {
    verses,
    mode,
    isLoading,
    isLoadingIndex,
    isLoadingMore,
    hasMore,
    totalCount,
    error,
    loadMore,
  } = useAggregatedCatalog({
    telegramId,
    searchQuery: debouncedSearch,
    tagSlugs: selectedTagSlugs,
    bookId: selectedBookId,
    visibility,
  });

  // ── Reset selection on filter change ─────────────────────────────────────
  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, selectedTagSlugs, selectedBookId, visibility]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    selectedTagSlugs.length > 0 ||
    selectedBookId !== null ||
    visibility === "popular";
  const activeFilterCount =
    (debouncedSearch.trim() ? 1 : 0) +
    selectedTagSlugs.length +
    (selectedBookId !== null ? 1 : 0) +
    (visibility === "popular" ? 1 : 0);
  const selectedCount = selectedIds.size;
  const selectedCountLabel = formatRussianCount(selectedCount, [
    "стих",
    "стиха",
    "стихов",
  ]);

  const modeLabel = useMemo(() => {
    if (mode === "all_bible") return "Все стихи Библии";
    if (mode === "text_search") return "Поиск по всей Библии";
    if (mode === "tag_filter") return "Стихи с темами";
    if (mode === "popular_only") return "Популярные стихи";
    return "Все стихи Библии";
  }, [mode]);
  const searchHighlightQuery = mode === "text_search" ? debouncedSearch : "";
  const virtuosoKey = useMemo(
    () =>
      [
        mode,
        debouncedSearch.trim(),
        selectedBookId ?? "all",
        visibility,
        selectedTagSlugs.join(","),
      ].join("|"),
    [debouncedSearch, mode, selectedBookId, selectedTagSlugs, visibility],
  );
  const VirtuosoFooter = useMemo(() => {
    function CatalogVirtuosoFooter() {
      return (
        <div className="px-0 pb-4 pt-1">
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          )}
          {!hasMore && verses.length > 0 && totalCount > HELLOAO_PAGE_SIZE && (
            <p className="py-3 text-center text-[11px] text-text-muted">
              Все результаты загружены
            </p>
          )}
        </div>
      );
    }

    return CatalogVirtuosoFooter;
  }, [hasMore, isLoadingMore, totalCount, verses.length]);
  const virtuosoComponents = useMemo(
    () => ({
      Footer: VirtuosoFooter,
    }),
    [VirtuosoFooter],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleVerse = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openFilterDrawer = useCallback(() => {
    setDraftTagSlugs(new Set(selectedTagSlugs));
    setDraftBookId(selectedBookId);
    setDraftVisibility(visibility);
    setIsTagsExpanded(false);
    setIsBooksExpanded(false);
    setIsFilterDrawerOpen(true);
  }, [selectedTagSlugs, selectedBookId, visibility]);

  const applyFilters = useCallback(() => {
    setSelectedTagSlugs(Array.from(draftTagSlugs));
    setSelectedBookId(draftBookId);
    setVisibility(draftVisibility);
    setIsFilterDrawerOpen(false);
  }, [draftBookId, draftTagSlugs, draftVisibility]);

  const resetDraftFilters = useCallback(() => {
    setDraftTagSlugs(new Set());
    setDraftBookId(null);
    setDraftVisibility("all");
  }, []);

  const handleAddToBox = useCallback(
    async (boxId: string) => {
      if (!telegramId || selectedIds.size === 0) return;
      setBusyBoxId(boxId);
      try {
        const result = await addVersesBatch({
          telegramId,
          boxId,
          externalVerseIds: Array.from(selectedIds),
        });
        const boxTitle = boxes.find((b) => b.id === boxId)?.title ?? "Коробка";
        if (result.addedCount > 0) {
          toast.success("Стихи добавлены", {
            description: `${formatRussianCount(result.addedCount, ["стих", "стиха", "стихов"])} · ${boxTitle}`,
            label: "Тексты",
          });
        } else {
          toast.info("Стихи уже в коробке", {
            description: boxTitle,
            label: "Тексты",
          });
        }
        setSelectedIds(new Set());
        setIsAddDrawerOpen(false);
        await onRefreshBoxes();
        onVerseMutationCommitted?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Не удалось добавить стихи",
          {
            label: "Тексты",
          },
        );
      } finally {
        setBusyBoxId(null);
      }
    },
    [boxes, onRefreshBoxes, onVerseMutationCommitted, selectedIds, telegramId],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-1 flex-col gap-3",
        )}
      >
      <h1 className="my-2 [font-family:var(--font-heading)] text-[2rem] font-semibold tracking-tight text-text-primary sm:text-[2.25rem]">
        Добавление стихов
      </h1>
        {/* ── Search bar ───────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по всей Библии..."
              className="h-11 rounded-[1.15rem] border-border-subtle bg-bg-elevated pl-10 pr-9 text-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                aria-label="Очистить поиск"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openFilterDrawer}
            aria-label="Фильтры"
            className={cn(
              "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border transition-colors",
              activeFilterCount > 0
                ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                : "border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary text-[9px] font-bold text-[color:#241b14]">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Active filter chips ───────────────────────────────────────────── */}
        {hasActiveFilters && (
          <div className="shrink-0 flex flex-wrap gap-1.5">
            {visibility === "popular" && (
              <button
                type="button"
                onClick={() => setVisibility("all")}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary transition-colors hover:bg-brand-primary/15"
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                Только популярные
                <X className="h-3 w-3 shrink-0" />
              </button>
            )}
            {selectedBookId !== null && (
              <button
                type="button"
                onClick={() => setSelectedBookId(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary transition-colors hover:bg-brand-primary/15"
              >
                <BookOpen className="h-3 w-3 shrink-0" />
                {books.find((b) => b.id === selectedBookId)?.nameRu ?? "Книга"}
                <X className="h-3 w-3 shrink-0" />
              </button>
            )}
            {selectedTagSlugs.map((slug) => {
              const tag = allTags.find((t) => t.slug === slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() =>
                    setSelectedTagSlugs((prev) =>
                      prev.filter((s) => s !== slug),
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-brand-primary/20 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary transition-colors hover:bg-brand-primary/15"
                >
                  <span className="opacity-60">#</span>
                  {tag?.title ?? slug}
                  <X className="h-3 w-3" />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Mode / results label ──────────────────────────────────────────── */}
        {!isLoading && (
          <div className="shrink-0 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-text-muted">
              {isLoadingIndex
                ? "Загружается индекс Библии…"
                : hasActiveFilters
                  ? `${modeLabel} · ${formatRussianCount(totalCount, ["результат", "результата", "результатов"])}`
                  : modeLabel}
            </p>
            {selectedCount > 0 && (
              <p className="text-[11px] font-semibold text-brand-primary">
                Выбрано {selectedCountLabel}
              </p>
            )}
          </div>
        )}

        {/* ── Verse list ────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1">
          {isLoading ? (
            <div className="space-y-2 pb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <VerseSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-32 items-center justify-center rounded-[1.75rem] border border-border-default/55 bg-bg-elevated">
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
          ) : verses.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-[1.75rem] border border-border-default/55 bg-bg-elevated">
              <Search className="h-6 w-6 text-text-muted/50" />
              <p className="text-sm text-text-secondary">
                {hasActiveFilters ? "Стихи не найдены" : "Библия недоступна"}
              </p>
            </div>
          ) : (
            <Virtuoso
              key={virtuosoKey}
              data={verses}
              className="h-full w-full overscroll-contain [scrollbar-gutter:stable]"
              style={{ height: "100%" }}
              endReached={() => {
                if (hasMore && !isLoadingMore) {
                  void loadMore();
                }
              }}
              components={virtuosoComponents}
              increaseViewportBy={{
                top: VIRTUOSO_VIEWPORT_PADDING_PX / 2,
                bottom: VIRTUOSO_VIEWPORT_PADDING_PX,
              }}
              itemContent={(_, verse) => (
                <div className="pb-2">
                  <VerseCard
                    verse={verse}
                    isSelected={selectedIds.has(verse.externalVerseId)}
                    searchQuery={searchHighlightQuery}
                    onToggle={() => toggleVerse(verse.externalVerseId)}
                  />
                </div>
              )}
            />
          )}
        </div>
      </div>

      {selectedCount > 0 ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 z-[39] h-28 bg-gradient-to-t from-bg-base from-40% via-bg-base/75 to-transparent md:hidden"
            style={{
              bottom: "calc(var(--app-bottom-nav-clearance, 0px))",
            }}
          />
          <Button
            type="button"
            variant="default"
            className="fixed left-1/2 z-40 h-12 min-w-0 max-w-[min(22rem,calc(100vw-2rem))] shrink -translate-x-1/2 rounded-full border-brand-primary/25 px-6 shadow-[var(--shadow-floating)] backdrop-blur-md sm:px-8"
            style={{
              bottom: "calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)",
            }}
            disabled={boxes.length === 0 || !telegramId}
            onClick={() => setIsAddDrawerOpen(true)}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-center">
              {selectedCountLabel} · В коробку
            </span>
          </Button>
        </>
      ) : null}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Filter Drawer                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Drawer
        open={isFilterDrawerOpen}
        onOpenChange={(open) => {
          if (!open) setIsFilterDrawerOpen(false);
        }}
      >
        <DrawerContent className="px-4" style={{ maxHeight: "92svh" }}>
          <DrawerHeader className="px-0 pb-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>Фильтры</DrawerTitle>
              {(draftTagSlugs.size > 0 ||
                draftBookId !== null ||
                draftVisibility !== "all") && (
                <button
                  type="button"
                  onClick={resetDraftFilters}
                  className="text-xs font-medium text-state-error transition-colors hover:opacity-80"
                >
                  Сбросить
                </button>
              )}
            </div>
          </DrawerHeader>

          <div className="mt-4 min-h-0 space-y-5 overflow-y-auto overscroll-contain pb-2">
            {/* Visibility */}
            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Видимость
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "all" as const, label: "Все стихи" },
                    { key: "popular" as const, label: "Только популярные" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setDraftVisibility(option.key)}
                    className={cn(
                      "rounded-[1.15rem] border px-3 py-2.5 text-xs font-medium transition-colors",
                      draftVisibility === option.key
                        ? "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                        : "border-border-subtle bg-bg-elevated text-text-secondary hover:bg-bg-surface",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Book (canonical, tag-style, collapsible) */}
            {(() => {
              const BOOKS_COLLAPSED_LIMIT = 12;
              const selectedBook =
                draftBookId != null
                  ? books.find((b) => b.id === draftBookId)
                  : undefined;
              const orderedBooks =
                selectedBook != null
                  ? [
                      selectedBook,
                      ...books.filter((b) => b.id !== selectedBook.id),
                    ]
                  : books;
              const hiddenCount = Math.max(
                0,
                orderedBooks.length - BOOKS_COLLAPSED_LIMIT,
              );
              const canCollapse = orderedBooks.length > BOOKS_COLLAPSED_LIMIT;

              const bookPillClass = (isActive: boolean) =>
                cn(
                  "inline-flex items-center rounded-full border px-3 py-[5px] text-[12px] font-medium transition-all duration-150",
                  isActive
                    ? "border-brand-primary/35 bg-brand-primary/12 text-brand-primary shadow-[0_0_0_1px_rgba(var(--color-brand-primary-rgb,124,92,62),0.18)] shadow-[var(--shadow-soft)]"
                    : "border-border-subtle bg-bg-elevated text-text-secondary hover:border-brand-primary/25 hover:bg-bg-surface hover:text-text-primary",
                );

              return (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Книга
                    </p>
                    {draftBookId !== null && (
                      <button
                        type="button"
                        onClick={() => setDraftBookId(null)}
                        className="text-[11px] font-medium text-state-error/80 transition-colors hover:text-state-error"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDraftBookId(null)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-[5px] text-[12px] font-medium transition-all duration-150",
                        draftBookId === null
                          ? "border-brand-primary/35 bg-brand-primary/12 text-brand-primary shadow-[0_0_0_1px_rgba(var(--color-brand-primary-rgb,124,92,62),0.18)] shadow-[var(--shadow-soft)]"
                          : "border-border-subtle bg-bg-elevated text-text-secondary hover:border-brand-primary/25 hover:bg-bg-surface hover:text-text-primary",
                      )}
                    >
                      Все книги
                    </button>
                    {orderedBooks
                      .slice(0, BOOKS_COLLAPSED_LIMIT)
                      .map((book) => {
                        const isActive = draftBookId === book.id;
                        return (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() =>
                              setDraftBookId((prev) =>
                                prev === book.id ? null : book.id,
                              )
                            }
                            className={bookPillClass(isActive)}
                          >
                            {book.nameRu}
                          </button>
                        );
                      })}
                  </div>

                  {canCollapse && (
                    <>
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                          isBooksExpanded
                            ? "grid-rows-[1fr]"
                            : "grid-rows-[0fr]",
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="flex flex-wrap gap-2 pt-2">
                            {orderedBooks
                              .slice(BOOKS_COLLAPSED_LIMIT)
                              .map((book) => {
                                const isActive = draftBookId === book.id;
                                return (
                                  <button
                                    key={book.id}
                                    type="button"
                                    onClick={() =>
                                      setDraftBookId((prev) =>
                                        prev === book.id ? null : book.id,
                                      )
                                    }
                                    className={bookPillClass(isActive)}
                                  >
                                    {book.nameRu}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsBooksExpanded((v) => !v)}
                        className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-[1rem] border border-border-subtle/60 bg-bg-subtle py-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
                      >
                        {isBooksExpanded ? (
                          <>
                            <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform duration-300" />
                            Свернуть
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300" />
                            Показать ещё {hiddenCount}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              );
            })()}

            {/* ── Tags (collapsible) ─────────────────────────────────────── */}
            {(() => {
              const COLLAPSED_LIMIT = 8;
              // Active tags always float to the front
              const sorted = [...allTags].sort((a, b) => {
                const aActive = draftTagSlugs.has(a.slug ?? "");
                const bActive = draftTagSlugs.has(b.slug ?? "");
                if (aActive === bActive) return 0;
                return aActive ? -1 : 1;
              });
              const hiddenCount = Math.max(0, sorted.length - COLLAPSED_LIMIT);
              const canCollapse = sorted.length > COLLAPSED_LIMIT;

              return (
                <div>
                  {/* Header row */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Темы
                      </p>
                      {draftTagSlugs.size > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-[color:#241b14]">
                          {draftTagSlugs.size}
                        </span>
                      )}
                    </div>
                    {draftTagSlugs.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setDraftTagSlugs(new Set())}
                        className="text-[11px] font-medium text-state-error/80 transition-colors hover:text-state-error"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  {isLoadingTags ? (
                    <div className="flex flex-wrap gap-2">
                      {[72, 56, 88, 64, 48, 80, 60, 52].map((w, i) => (
                        <Skeleton
                          key={i}
                          className="h-[30px] rounded-full"
                          style={{ width: w }}
                        />
                      ))}
                    </div>
                  ) : allTags.length === 0 ? (
                    <p className="text-xs italic text-text-muted">
                      Темы не созданы
                    </p>
                  ) : (
                    <>
                      {/* Always-visible (collapsed) tags */}
                      <div className="flex flex-wrap gap-2">
                        {sorted.slice(0, COLLAPSED_LIMIT).map((tag) => {
                          const slug = tag.slug ?? "";
                          const isActive = draftTagSlugs.has(slug);
                          return (
                            <TagPill
                              key={tag.id ?? slug}
                              tag={tag}
                              isActive={isActive}
                              onToggle={() => {
                                if (!slug) return;
                                setDraftTagSlugs((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(slug)) next.delete(slug);
                                  else next.add(slug);
                                  return next;
                                });
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Expandable overflow */}
                      {canCollapse && (
                        <>
                          {/* Grid animation container */}
                          <div
                            className={cn(
                              "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                              isTagsExpanded
                                ? "grid-rows-[1fr]"
                                : "grid-rows-[0fr]",
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="flex flex-wrap gap-2 pt-2">
                                {sorted.slice(COLLAPSED_LIMIT).map((tag) => {
                                  const slug = tag.slug ?? "";
                                  const isActive = draftTagSlugs.has(slug);
                                  return (
                                    <TagPill
                                      key={tag.id ?? slug}
                                      tag={tag}
                                      isActive={isActive}
                                      onToggle={() => {
                                        if (!slug) return;
                                        setDraftTagSlugs((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(slug)) next.delete(slug);
                                          else next.add(slug);
                                          return next;
                                        });
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Toggle button */}
                          <button
                            type="button"
                            onClick={() => setIsTagsExpanded((v) => !v)}
                            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-[1rem] border border-border-subtle/60 bg-bg-subtle py-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
                          >
                            {isTagsExpanded ? (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform duration-300" />
                                Свернуть
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300" />
                                Показать ещё {hiddenCount}
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <DrawerFooter className="px-0 pb-0 pt-4">
            <div className="flex items-center gap-3 border-t border-border/50 pt-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-2xl"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 rounded-2xl"
                onClick={applyFilters}
              >
                Применить
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Add to Box Drawer                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Drawer open={isAddDrawerOpen} onOpenChange={setIsAddDrawerOpen}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Добавить в коробку</DrawerTitle>
          </DrawerHeader>

          <p className="pb-3 text-sm text-text-secondary">
            {selectedCountLabel}
          </p>

          <div className="space-y-2 pb-2">
            {boxes.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => void handleAddToBox(box.id)}
                disabled={busyBoxId !== null}
                className={cn(
                  "flex w-full items-center justify-between rounded-[1.5rem] border border-border-default/55 bg-bg-elevated px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-bg-surface",
                  busyBoxId !== null && "pointer-events-none opacity-60",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {box.title}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {box.stats.totalCount} стихов
                  </p>
                </div>
                {busyBoxId === box.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                ) : (
                  <Plus className="h-4 w-4 text-text-muted" />
                )}
              </button>
            ))}
          </div>

          <DrawerFooter className="px-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddDrawerOpen(false)}
            >
              Закрыть
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
