"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Download, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  BibleBook,
  BIBLE_BOOKS,
  getBibleBookNameRu,
} from "@/app/types/bible";
import {
  DEFAULT_HELLOAO_TRANSLATION,
  getHelloaoChapter,
  normalizeHelloaoTranslation,
  searchHelloaoVerses,
} from "../services/helloaoBibleApi";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";
import { TagsService } from "@/api/services/TagsService";
import type { Tag } from "@/api/models/Tag";
import { toast } from "@/app/lib/toast";
import { isAdminTelegramId } from "@/lib/admins";
import {
  MAX_EXTERNAL_VERSE_RANGE_SIZE,
  formatParsedExternalVerseReference,
  toCanonicalExternalVerseId,
  type ParsedExternalVerseId,
} from "@/shared/bible/externalVerseId";

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function HighlightedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(<mark>.*?<\/mark>)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const match = part.match(/^<mark>(.*?)<\/mark>$/);
        return match ? (
          <mark key={i} className="bg-amber-400/60 text-foreground/90 px-0.5 rounded">{match[1]}</mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </span>
  );
}

const stripMarkTags = (text: string) =>
  text.replace(/<\/?mark[^>]*>/g, "");

const toInt = (v: string) => {
  const n = parseInt(v, 10);
  return isFinite(n) && n > 0 ? n : null;
};

function buildParsedExternalVerseId(params: {
  book: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}): ParsedExternalVerseId {
  return {
    book: params.book,
    chapter: params.chapter,
    verseStart: params.verseStart,
    verseEnd: params.verseEnd,
  };
}

// ─── Slug helper ──────────────────────────────────────────────────────────────

const CYR_MAP: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .split('')
    .map((c) => CYR_MAP[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Константы ───────────────────────────────────────────────────────────────

const TRANSLATION_KEY = "bibleTranslation";
const MODE_KEY = "addVerseDialogMode";
const PAGE_SIZE = 20;
const GLOBAL_TAG_MANAGEMENT_EXTERNAL_VERSE_ID = "__global__";

const getCanonicalBooks = () =>
  Object.values(BIBLE_BOOKS)
    .filter((book) => book.id <= BibleBook.Revelation)
    .sort((a, b) => a.id - b.id);

const SOFT_SELECT_TRIGGER_CLASS =
  "h-10 w-full min-w-0 rounded-xl border-border/50 bg-muted/25 text-foreground/80 hover:bg-muted/35";

const SOFT_SELECT_CONTENT_CLASS =
  "max-h-[min(42dvh,220px)] backdrop-blur-xl overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] rounded-xl border-border/50 bg-background/95 text-foreground/80 shadow-lg";

const TAG_TITLE_COLLATOR = new Intl.Collator(["ru", "en"], {
  sensitivity: "base",
  numeric: true,
});

const sortTagsByTitle = (tags: Tag[]) =>
  [...tags].sort((a, b) =>
    TAG_TITLE_COLLATOR.compare((a.title ?? "").trim(), (b.title ?? "").trim())
  );

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface AddVerseDialogProps {
  open: boolean;
  onClose: () => void;
  mode?: 'verse' | 'tag';
  onAdd?: (verse: {
    externalVerseId: string;
    reference: string;
    tags: string[];
    replaceTags?: boolean;
  }) => Promise<void>;
  onCreateTag?: (title: string, slug: string) => Promise<void>;
}

type SearchResult = {
  book: BibleBook;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
};

type SelectedVerse = {
  book: BibleBook;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  externalVerseId: string;
  reference: string;
  text: string;
};

type VerseAdminSummary = {
  externalVerseId: string;
  userLinksCount: number;
  tagLinksCount: number;
  canDelete: boolean;
};

// ─── Компонент ───────────────────────────────────────────────────────────────

export function AddVerseDialog({ open, onClose, mode = 'verse', onAdd, onCreateTag }: AddVerseDialogProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const isTagMode = mode === "tag";
  const isVerseMode = mode === "verse";

  const [inputMode, setInputMode] = useState<"search" | "manual">("manual");
  const [translation, setTranslation] = useState(DEFAULT_HELLOAO_TRANSLATION);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Tags ─────────────────────────────────────────────────────────────────────
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<Set<string>>(new Set());
  const [createTagMode, setCreateTagMode] = useState(false);
  const [newTagTitle, setNewTagTitle] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [tagDeleteMode, setTagDeleteMode] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [tagListShadows, setTagListShadows] = useState({ top: false, bottom: false });
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagTitle, setEditingTagTitle] = useState("");
  const [savingTagId, setSavingTagId] = useState<string | null>(null);

  const [viewerTelegramId, setViewerTelegramId] = useState<string>("");
  const [adminVerseSummary, setAdminVerseSummary] = useState<VerseAdminSummary | null>(null);
  const [adminVerseSummaryLoading, setAdminVerseSummaryLoading] = useState(false);
  const [isDeletingVerseFromCatalog, setIsDeletingVerseFromCatalog] = useState(false);

  // ── Ручной выбор ────────────────────────────────────────────────────────────
  const [bookId, setBookId] = useState("");
  const [chapterNo, setChapterNo] = useState("");
  const [verseStartNo, setVerseStartNo] = useState("");
  const [verseEndNo, setVerseEndNo] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const verseCountCache = useRef<Map<string, number>>(new Map());
  const [verseCount, setVerseCount] = useState<number | null>(null);
  const [verseCountLoading, setVerseCountLoading] = useState(false);
  const [verseTagsLoaded, setVerseTagsLoaded] = useState(false);

  // ── Поиск ───────────────────────────────────────────────────────────────────
  // const [query, setQuery] = useState("");
  // const [searching, setSearching] = useState(false);
  // const [results, setResults] = useState<SearchResult[]>([]);
  // const [searchErr, setSearchErr] = useState<string | null>(null);
  // const [page, setPage] = useState(1);
  // const [hasMore, setHasMore] = useState(false);
  // const [loadingMore, setLoadingMore] = useState(false);

  // const abortRef = useRef<AbortController | null>(null);
  // const searchingRef = useRef(false);
  // const lastQueryRef = useRef("");
  // const reqIdRef = useRef(0);
  const tagListScrollRef = useRef<HTMLDivElement | null>(null);

  // ── Производные ──────────────────────────────────────────────────────────────

  const canonicalBooks = useMemo(getCanonicalBooks, []);
  const oldTestamentBooks = useMemo(
    () => canonicalBooks.filter((book) => book.id <= BibleBook.Malachi),
    [canonicalBooks]
  );
  const newTestamentBooks = useMemo(
    () => canonicalBooks.filter((book) => book.id >= BibleBook.Matthew),
    [canonicalBooks]
  );

  const chaptersCount = useMemo(() => {
    const id = toInt(bookId);
    if (!id || id > BibleBook.Revelation) return 0;
    return BIBLE_BOOKS[id]?.chapters ?? 0;
  }, [bookId]);

  const selectedBookId = toInt(bookId);
  const selectedChapterNo = toInt(chapterNo);
  const verseStartValue = toInt(verseStartNo);
  const verseEndValue = toInt(verseEndNo);
  const effectiveVerseEndValue = verseEndValue ?? verseStartValue;
  const verseOptionsCount = verseCount ?? 176;
  const maxVerseEndForStart =
    verseStartValue === null
      ? null
      : Math.min(
          verseOptionsCount,
          verseStartValue + MAX_EXTERNAL_VERSE_RANGE_SIZE - 1
        );
  const isCanonicalBookSelected =
    selectedBookId !== null && selectedBookId <= BibleBook.Revelation;
  const hasValidRange =
    verseStartValue !== null &&
    effectiveVerseEndValue !== null &&
    effectiveVerseEndValue >= verseStartValue &&
    effectiveVerseEndValue - verseStartValue + 1 <= MAX_EXTERNAL_VERSE_RANGE_SIZE;
  const canFetch = Boolean(isCanonicalBookSelected && selectedChapterNo && hasValidRange);
  const canSubmit = Boolean(selectedVerse && !submitting);
  const newTagSlug = slugify(newTagTitle);
  const isAdmin = isAdminTelegramId(viewerTelegramId);

  // ── Загружаем теги при открытии ───────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setTagsLoading(true);
    const req = TagsService.getApiTags();
    req
      .then((tags) => setAllTags(sortTagsByTitle(tags)))
      .catch(() => {})
      .finally(() => setTagsLoading(false));
    return () => req.cancel();
  }, [open]);

  // ── Читаем перевод и режим из localStorage ──────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem(TRANSLATION_KEY);
    setTranslation(normalizeHelloaoTranslation(t));
    // Search-mode UI is currently disabled, so always force "manual" to avoid blank content.
    setInputMode("manual");
    localStorage.setItem(MODE_KEY, "manual");
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (inputMode !== "manual") {
      setInputMode("manual");
      localStorage.setItem(MODE_KEY, "manual");
      return;
    }
    localStorage.setItem(MODE_KEY, inputMode);
  }, [inputMode]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const fromTelegram = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const fromStorage = window.localStorage.getItem("telegramId");
    const resolved = String(fromTelegram ?? fromStorage ?? "").trim();
    setViewerTelegramId(resolved);
  }, [open]);

  // ── Загружаем количество стихов при выборе главы ────────────────────────────

  useEffect(() => {
    const bid = toInt(bookId);
    const ch = toInt(chapterNo);

    if (!bid || !ch) {
      setVerseCount(null);
      return;
    }

    const key = `${translation}-${bid}-${ch}`;
    const cached = verseCountCache.current.get(key);
    if (cached !== undefined) {
      setVerseCount(cached);
      return;
    }

    let cancelled = false;
    setVerseCountLoading(true);
    setVerseCount(null);

    getHelloaoChapter({ translation, book: bid as BibleBook, chapter: ch })
      .then((verses) => {
        if (cancelled) return;
        const count = verses.length;
        verseCountCache.current.set(key, count);
        setVerseCount(count);
      })
      .catch(() => { if (!cancelled) setVerseCount(176); })
      .finally(() => { if (!cancelled) setVerseCountLoading(false); });

    return () => { cancelled = true; };
  }, [translation, bookId, chapterNo]);

  // useEffect(() => {
  //   if (inputMode === "search") setFetchError(null);
  //   else setSearchErr(null);
  // }, [inputMode]);

  // useEffect(() => () => { abortRef.current?.abort(); }, []);

  const updateTagListShadows = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      setTagListShadows({ top: false, bottom: false });
      return;
    }

    const maxScrollTop = node.scrollHeight - node.clientHeight;
    if (maxScrollTop <= 1) {
      setTagListShadows({ top: false, bottom: false });
      return;
    }

    const top = node.scrollTop > 2;
    const bottom = node.scrollTop < maxScrollTop - 2;

    setTagListShadows((prev) => (
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
    ));
  }, []);

  useEffect(() => {
    if (!open) return;
    const rafId = window.requestAnimationFrame(() => {
      updateTagListShadows(tagListScrollRef.current);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [
    open,
    mode,
    tagsLoading,
    createTagMode,
    tagDeleteMode,
    allTags.length,
    selectedVerse?.reference,
    updateTagListShadows,
  ]);

  useEffect(() => {
    if (!open || !selectedVerse || !isAdmin || !viewerTelegramId) {
      setAdminVerseSummary(null);
      setAdminVerseSummaryLoading(false);
      return;
    }

    let cancelled = false;
    const { externalVerseId } = selectedVerse;

    setAdminVerseSummaryLoading(true);
    void fetch(
      `/api/verses/${externalVerseId}/admin?telegramId=${encodeURIComponent(viewerTelegramId)}`
    )
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) {
          setAdminVerseSummary(null);
          return;
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error || "Не удалось получить статус стиха");
        }
        const payload = await response.json() as VerseAdminSummary;
        if (!cancelled) {
          setAdminVerseSummary(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAdminVerseSummary(null);
          console.error("Не удалось загрузить admin summary стиха:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAdminVerseSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedVerse, isAdmin, viewerTelegramId]);

  // ── Функции ──────────────────────────────────────────────────────────────────

  const toggleTag = useCallback((slug: string) => {
    setSelectedTagSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const loadSelectedVerseTags = useCallback(async (externalVerseId: string) => {
    setVerseTagsLoaded(false);
    try {
      const tags = await TagsService.getApiVersesTags(externalVerseId);
      const slugs = tags
        .map((tag) => tag.slug ?? "")
        .filter(Boolean);
      setSelectedTagSlugs(new Set(slugs));
      setVerseTagsLoaded(true);
    } catch (error) {
      console.error("Не удалось загрузить теги стиха:", error);
      setSelectedTagSlugs(new Set());
      setVerseTagsLoaded(false);
    }
  }, []);

  const beginTagRename = useCallback((tag: Tag) => {
    if (!tag.id) return;
    setEditingTagId(tag.id);
    setEditingTagTitle((tag.title ?? "").trim());
    setTagDeleteMode(false);
  }, []);

  const cancelTagRename = useCallback(() => {
    setEditingTagId(null);
    setEditingTagTitle("");
  }, []);

  const handleRenameTag = useCallback(async () => {
    const tagId = editingTagId;
    const nextTitle = editingTagTitle.trim();
    if (!tagId || !nextTitle) return;

    setSavingTagId(tagId);
    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });

      const payload = await response.json().catch(() => null) as
        | { id?: string; title?: string; error?: string }
        | null;

      if (!response.ok) {
        toast.error(payload?.error || "Не удалось переименовать тег");
        return;
      }

      setAllTags((prev) => {
        const next = prev.map((tag) =>
          tag.id === tagId
            ? { ...tag, title: payload?.title ?? nextTitle }
            : tag
        );
        return sortTagsByTitle(next);
      });

      setEditingTagId(null);
      setEditingTagTitle("");
      toast.success("Название тега обновлено");
    } catch {
      toast.error("Не удалось переименовать тег");
    } finally {
      setSavingTagId(null);
    }
  }, [editingTagId, editingTagTitle]);

  const handleDeleteVerseFromCatalog = useCallback(async () => {
    if (!selectedVerse || !isAdmin || !viewerTelegramId) return;
    const { externalVerseId } = selectedVerse;

    const confirmed = window.confirm(
      "Удалить стих из общей базы? Это возможно только если стих не связан ни с одним пользователем."
    );
    if (!confirmed) return;

    setIsDeletingVerseFromCatalog(true);
    try {
      const response = await fetch(
        `/api/verses/${externalVerseId}/admin?telegramId=${encodeURIComponent(viewerTelegramId)}`,
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => null) as
        | { error?: string; userLinksCount?: number }
        | null;

      if (!response.ok) {
        if (response.status === 409) {
          const links = payload?.userLinksCount;
          toast.error(
            typeof links === "number" && links > 0
              ? `Стих используется у ${links} пользователей`
              : "Стих ещё используется пользователями"
          );
          return;
        }
        toast.error(payload?.error || "Не удалось удалить стих из базы");
        return;
      }

      setAdminVerseSummary(null);
      setSelectedTagSlugs(new Set());
      toast.success("Стих удалён из общей базы");
    } catch (error) {
      console.error("Не удалось удалить стих из общей базы:", error);
      toast.error("Не удалось удалить стих из базы");
    } finally {
      setIsDeletingVerseFromCatalog(false);
    }
  }, [isAdmin, selectedVerse, viewerTelegramId]);

  const handleCreateTag = async () => {
    if (!newTagTitle.trim() || !newTagSlug || creatingTag) return;
    const title = newTagTitle.trim();
    setCreatingTag(true);
    try {
      if (onCreateTag) {
        await onCreateTag(title, newTagSlug);
        const refreshedTags = await TagsService.getApiTags();
        setAllTags(sortTagsByTitle(refreshedTags));
      } else {
        const newTag = await TagsService.postApiTags({ title, slug: newTagSlug });
        setAllTags((prev) => sortTagsByTitle([...prev, newTag]));
      }

      if (!isTagMode) {
        setSelectedTagSlugs((prev) => new Set([...prev, newTagSlug]));
      }
      setNewTagTitle("");
      setCreateTagMode(false);
    } catch {
      toast.error("Не удалось создать тег");
    } finally {
      setCreatingTag(false);
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    if (!tag.id) return;
    setDeletingTagId(tag.id);
    try {
      const response = await fetch(`/api/verses/${GLOBAL_TAG_MANAGEMENT_EXTERNAL_VERSE_ID}/tags`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tagId: tag.id,
          deleteTagIfUnused: true,
        }),
      });

      const payload = await response.json().catch(() => null) as
        | {
            error?: string;
            linksCount?: number;
          }
        | null;

      if (!response.ok) {
        if (response.status === 409) {
          const linksCount = payload?.linksCount;
          toast.error(
            typeof linksCount === "number" && linksCount > 0
              ? `Тег «${tag.title}» используется в ${linksCount} стихах`
              : `Тег «${tag.title}» нельзя удалить, пока он связан со стихами`
          );
          return;
        }

        toast.error(payload?.error || "Не удалось удалить тег");
        return;
      }

      setAllTags((prev) => prev.filter((item) => item.id !== tag.id));
      const slug = tag.slug;
      if (slug) {
        setSelectedTagSlugs((prev) => {
          if (!prev.has(slug)) return prev;
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
      toast.success(`Тег «${tag.title}» удалён`);
    } catch {
      toast.error("Не удалось удалить тег");
    } finally {
      setDeletingTagId(null);
    }
  };

  const resetDraft = useCallback(() => {
    setSelectedVerse(null);
    setSelectedTagSlugs(new Set());
    setCreateTagMode(false);
    setTagDeleteMode(false);
    setEditingTagId(null);
    setEditingTagTitle("");
    setSavingTagId(null);
    setTagListShadows({ top: false, bottom: false });
    setNewTagTitle("");
    setDeletingTagId(null);
    setAdminVerseSummary(null);
    setAdminVerseSummaryLoading(false);
    setIsDeletingVerseFromCatalog(false);
    setSubmitting(false);
    setVerseTagsLoaded(false);
    setBookId("");
    setChapterNo("");
    setVerseStartNo("");
    setVerseEndNo("");
    setFetchError(null);
    // setQuery("");
    // setResults([]);
    // setSearchErr(null);
    // setPage(1);
    // setHasMore(false);
    // setLoadingMore(false);
    setVerseCount(null);
    // searchingRef.current = false;
    // lastQueryRef.current = "";
    // abortRef.current?.abort();
    // abortRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    resetDraft();
    onClose();
  }, [resetDraft, onClose]);

  const handleFetchVerse = async () => {
    const bid = toInt(bookId);
    const ch = toInt(chapterNo);
    const verseStart = toInt(verseStartNo);
    const verseEnd = toInt(verseEndNo) ?? verseStart;
    if (!bid || bid > BibleBook.Revelation || !ch || !verseStart || !verseEnd) {
      setFetchError("Выберите каноническую книгу, главу и стих «от»");
      return;
    }
    if (verseEnd < verseStart) {
      setFetchError("Конец диапазона не может быть раньше начала.");
      return;
    }
    if (verseEnd - verseStart + 1 > MAX_EXTERNAL_VERSE_RANGE_SIZE) {
      setFetchError(`Диапазон может содержать максимум ${MAX_EXTERNAL_VERSE_RANGE_SIZE} стихов.`);
      return;
    }

    setFetchLoading(true);
    setFetchError(null);

    try {
      const chapterVerses = await getHelloaoChapter({
        translation,
        book: bid as BibleBook,
        chapter: ch,
      });
      const verseMap = new Map<number, string>();
      chapterVerses.forEach((item) => {
        if (!Number.isFinite(Number(item.verse))) return;
        verseMap.set(Number(item.verse), item.text ?? "");
      });
      const texts: string[] = [];
      for (let verse = verseStart; verse <= verseEnd; verse += 1) {
        const text = verseMap.get(verse);
        if (typeof text !== "string" || text.trim().length === 0) {
          throw new Error("Не удалось получить полный диапазон стихов.");
        }
        texts.push(text.trim());
      }

      const parsed = buildParsedExternalVerseId({
        book: bid,
        chapter: ch,
        verseStart,
        verseEnd,
      });
      const externalVerseId = toCanonicalExternalVerseId(parsed);
      const canonicalVerseEnd = parsed.verseEnd;
      await loadSelectedVerseTags(externalVerseId);
      setSelectedVerse({
        book: bid as BibleBook,
        chapter: ch,
        verseStart: parsed.verseStart,
        verseEnd: canonicalVerseEnd,
        externalVerseId,
        text: texts.join(" ").trim(),
        reference: formatParsedExternalVerseReference(
          parsed,
          getBibleBookNameRu(parsed.book)
        ),
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Не удалось загрузить стих");
    } finally {
      setFetchLoading(false);
    }
  };

  // const handleSearch = async () => {
  //   if (searchingRef.current) return;
  //   const q = query.trim();
  //   if (q.length < 3) { setSearchErr("Введите минимум 3 символа"); return; }

  //   abortRef.current?.abort();
  //   const ctrl = new AbortController();
  //   abortRef.current = ctrl;
  //   const rid = ++reqIdRef.current;

  //   searchingRef.current = true;
  //   setSearching(true);
  //   setSearchErr(null);
  //   setResults([]);
  //   setPage(1);
  //   setHasMore(false);
  //   lastQueryRef.current = q;

  //   try {
  //     const resp = await searchHelloaoVerses({ translation, query: q, matchCase: false, matchWhole: false, limit: PAGE_SIZE, page: 1, signal: ctrl.signal });
  //     if (ctrl.signal.aborted || reqIdRef.current !== rid) return;
  //     const items = (resp.results ?? []).map((it) => ({
  //       book: it.book as BibleBook,
  //       chapter: it.chapter,
  //       verse: it.verse,
  //       text: it.text,
  //       reference: formatVerseReference(it.book as BibleBook, it.chapter, it.verse),
  //     }));
  //     if (!items.length) setSearchErr("Стихи не найдены.");
  //     else { setResults(items); setHasMore(items.length < (resp.total ?? items.length)); }
  //   } catch (err) {
  //     if (!(err instanceof DOMException && err.name === "AbortError"))
  //       setSearchErr(err instanceof Error ? err.message : "Ошибка поиска");
  //   } finally {
  //     if (reqIdRef.current === rid) { searchingRef.current = false; setSearching(false); abortRef.current = null; }
  //   }
  // };

  // const loadMore = async () => {
  //   if (loadingMore || searching || !hasMore || !lastQueryRef.current) return;
  //   const nextPage = page + 1;
  //   setLoadingMore(true);
  //   try {
  //     const resp = await searchHelloaoVerses({ translation, query: lastQueryRef.current, matchCase: false, matchWhole: false, limit: PAGE_SIZE, page: nextPage, signal: abortRef.current?.signal });
  //     const items = (resp.results ?? []).map((it) => ({
  //       book: it.book as BibleBook, chapter: it.chapter, verse: it.verse, text: it.text,
  //       reference: formatVerseReference(it.book as BibleBook, it.chapter, it.verse),
  //     }));
  //     const total = resp.total ?? 0;
  //     setResults((prev) => { const m = [...prev, ...items]; setHasMore(m.length < total && items.length > 0); return m; });
  //     setPage(nextPage);
  //   } catch { /* ignore */ } finally { setLoadingMore(false); }
  // };

  // const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
  //   const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
  //   if (scrollHeight - scrollTop - clientHeight < 80) loadMore();
  // };

  const onTagListScroll: React.UIEventHandler<HTMLDivElement> = useCallback((e) => {
    updateTagListShadows(e.currentTarget);
  }, [updateTagListShadows]);

  const selectResult = (r: SearchResult) => {
    const parsed = buildParsedExternalVerseId({
      book: Number(r.book),
      chapter: r.chapter,
      verseStart: r.verse,
      verseEnd: r.verse,
    });
    const externalVerseId = toCanonicalExternalVerseId(parsed);
    void loadSelectedVerseTags(externalVerseId);
    setSelectedVerse({
      book: r.book,
      chapter: r.chapter,
      verseStart: r.verse,
      verseEnd: r.verse,
      externalVerseId,
      reference: formatParsedExternalVerseReference(parsed, getBibleBookNameRu(parsed.book)),
      text: r.text,
    });
    setBookId(r.book.toString());
    setChapterNo(r.chapter.toString());
    setVerseStartNo(r.verse.toString());
    setVerseEndNo(r.verse.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerse || submitting) return;
    setSubmitting(true);
    try {
      await onAdd?.({
        externalVerseId: selectedVerse.externalVerseId,
        reference: selectedVerse.reference,
        tags: Array.from(selectedTagSlugs),
        replaceTags: verseTagsLoaded,
      });
      handleClose();
    } catch { /* toast показывается выше */ } finally { setSubmitting(false); }
  };

  const renderTagManager = (manageOnly: boolean) => (
    <div className="space-y-2.5 bg-input-background pt-3 rounded-2xl border border-border/45 bg-gradient-to-br from-background/95 to-muted/20 mb-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 px-4">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground/90">
          Темы
        </span>
        <div className="flex items-center gap-3">
          {!manageOnly && selectedTagSlugs.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTagSlugs(new Set())}
              className="text-[11px] text-foreground/75  transition-colors"
            >
              Сбросить
            </button>
          )}
          {!createTagMode && allTags.length > 0 && (
            <button
              type="button"
              onClick={() => setTagDeleteMode((prev) => !prev)}
              disabled={creatingTag || deletingTagId !== null}
              className={`inline-flex items-center gap-0.5 text-[11px] transition-colors disabled:opacity-50 ${
                tagDeleteMode
                  ? "text-destructive hover:text-destructive/85"
                  : "text-muted-foreground hover:text-destructive"
              }`}
            >
              {tagDeleteMode ? <Check className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
              {tagDeleteMode ? "Готово" : "Удаление"}
            </button>
          )}
          {!createTagMode && (
            <button
              type="button"
              onClick={() => {
                setTagDeleteMode(false);
                setCreateTagMode(true);
              }}
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground  transition-colors"
            >
              <Plus className="h-3 w-3" />
              Создать
            </button>
          )}
        </div>
      </div>

      {!manageOnly && (
        <p className="text-[11px] text-muted-foreground/75 px-4">
          Выбрано: <span className="font-semibold text-primary">{selectedTagSlugs.size}</span>
        </p>
      )}

      {manageOnly && !createTagMode && !tagDeleteMode && allTags.length > 0 && (
        <p className="px-4 text-[11px] text-muted-foreground/75">
          Нажмите на тег, чтобы переименовать
        </p>
      )}

      {createTagMode && (
        <div className="flex gap-2 items-center px-4">
          <Input
            value={newTagTitle}
            onChange={(e) => setNewTagTitle(e.target.value)}
            placeholder="Название тега..."
            className="rounded-xl h-8 text-sm flex-1 bg-background/75"
            autoFocus
            disabled={creatingTag}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); void handleCreateTag(); }
              if (e.key === "Escape") { setCreateTagMode(false); setNewTagTitle(""); }
            }}
          />
          <button
            type="button"
            onClick={() => void handleCreateTag()}
            disabled={!newTagTitle.trim() || !newTagSlug || creatingTag}
            className="shrink-0 h-8 px-3 rounded-xl bg-primary/50 text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity flex items-center"
          >
            {creatingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : "Создать"}
          </button>
          <button
            type="button"
            onClick={() => { setCreateTagMode(false); setNewTagTitle(""); }}
            className="shrink-0 h-8 w-8 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground  transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {tagsLoading ? (
        <div className="flex gap-1.5 px-4 pb-5">
          {[56, 72, 48, 80, 60].map((w) => (
            <div key={w} className="h-6 rounded-full bg-muted/60 animate-pulse shrink-0" style={{ width: w }} />
          ))}
        </div>
      ) : allTags.length > 0 ? (
        <div className="relative rounded-xl">
          <div
            ref={tagListScrollRef}
            onScroll={onTagListScroll}
            className="inline-flex gap-1.5 pt-1 px-4 pb-3 flex-wrap overflow-y-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {allTags.map((tag) => {
              const slug = tag.slug ?? "";
              const canToggle = !manageOnly && !tagDeleteMode && Boolean(slug);
              const canRename = manageOnly && !tagDeleteMode && !createTagMode && Boolean(tag.id);
              const active = canToggle && selectedTagSlugs.has(slug);
              const isDeleting = deletingTagId === tag.id;
              const isEditing = manageOnly && editingTagId === tag.id;
              const isSaving = savingTagId === tag.id;

              if (isEditing && tag.id) {
                return (
                  <div key={tag.id} className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/80 px-2 py-1">
                    <Input
                      value={editingTagTitle}
                      onChange={(e) => setEditingTagTitle(e.target.value)}
                      className="h-7 min-w-[140px] rounded-lg text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleRenameTag();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelTagRename();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleRenameTag()}
                      disabled={!editingTagTitle.trim() || isSaving}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-primary/12 text-primary disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={cancelTagRename}
                      disabled={isSaving}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={tag.id ?? slug} className="shrink-0 group/tag relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (canToggle) {
                        toggleTag(slug);
                        return;
                      }
                      if (canRename) {
                        beginTagRename(tag);
                      }
                    }}
                    disabled={isDeleting || (!canToggle && !canRename)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/25 "
                    } ${isDeleting ? "opacity-45 pointer-events-none" : ""}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
                    ) : active ? (
                      <Check className="h-2.5 w-2.5 shrink-0" />
                    ) : canRename ? (
                      <Pencil className="h-2.5 w-2.5 shrink-0" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground/35">#</span>
                    )}
                    {tag.title}
                  </button>

                  {tagDeleteMode && tag.id && (
                    <button
                      type="button"
                      aria-label={`Удалить тег ${tag.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteTag(tag);
                      }}
                      disabled={isDeleting}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground transition-opacity flex items-center justify-center disabled:opacity-50"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-xl bg-gradient-to-b from-background/95 via-background/65 to-transparent shadow-[0_10px_14px_-14px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${
              tagListShadows.top ? "opacity-100" : "opacity-0"
            }`}
          /> */}
          {/* <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-xl bg-gradient-to-t from-background/95 via-background/65 to-transparent shadow-[0_-10px_14px_-14px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${
              tagListShadows.bottom ? "opacity-100" : "opacity-0"
            }`}
          /> */}
        </div>
      ) : (
        <p className="px-4 pb-5 text-xs text-muted-foreground/45 italic">Нет тегов — создайте первый</p>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-screen max-w-full h-[100dvh] max-h-[100dvh] sm:h-[90dvh] sm:max-h-[90dvh] sm:max-w-[600px] overflow-hidden sm:rounded-3xl rounded-none !p-0 !gap-0 !flex !flex-col border-border/60 bg-gradient-to-b from-background via-background to-muted/20">

        {/* ── Шапка ──────────────────────────────────────────────────────────── */}
        <DialogHeader
          style={{ paddingTop: `${Math.max(topInset, 20)}px` }}
          className="px-5 pb-4 border-b border-border/40 flex-shrink-0 sticky top-0 bg-gradient-to-b from-background via-background to-background/95 backdrop-blur z-10"
        >
          <DialogTitle className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
            <span className="flex items-center justify-center h-10 text-foreground/75">
              {isTagMode ? "Управление темами" : "Добавить стих"}
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isTagMode
              ? "Создание и удаление тем для стихов."
              : "Выберите книгу, главу и стих, затем добавьте его в список."}
          </DialogDescription>
          {/* <p className="text-center text-[11px] text-muted-foreground/70 mt-1 mb-3"> */}
            {/* {isTagMode
              ? "Создавайте и удаляйте темы в одном блоке"
              : "Выберите стих и добавьте к нему подходящие теги"} */}
          {/* </p> */}

          {/* Segmented mode toggle — verse mode only */}
          {/* {isVerseMode && (
            <div className="flex items-center bg-muted/65 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setInputMode("search")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === "search"
                    ? "bg-background text-foreground/90 shadow-sm"
                    : "text-muted-foreground "
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                Поиск
              </button>
              <button
                type="button"
                onClick={() => setInputMode("manual")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === "manual"
                    ? "bg-background text-foreground/90 shadow-sm"
                    : "text-muted-foreground "
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                По адресу
              </button>
            </div>
          )} */}
        </DialogHeader>

        {/* ── Тег-режим ──────────────────────────────────────────────────────── */}
        {isTagMode && (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="space-y-3 px-4 py-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1">
              {renderTagManager(true)}
            </div>
            <DialogFooter
              style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }}
              className="flex-shrink-0 flex flex-row items-center gap-2 p-2 py-2.5 bg-background border-t border-border/40"
            >
              <Button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl px-3 py-2 text-foreground/90 border border-border/60 bg-muted/35"
              >
                Готово
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Стих-режим ─────────────────────────────────────────────────────── */}
        {isVerseMode && (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="space-y-3 px-4 py-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] min-h-0 flex-1">

            {/* ── Поиск по тексту ────────────────────────────────────────────── */}
            {/* {inputMode === "search" && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
                    <Input
                      id="search-query"
                      name="search-query"
                      placeholder="Введите часть текста стиха..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleSearch(); (e.target as HTMLElement).blur(); }
                      }}
                      className="pl-9 rounded-xl"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || query.trim().length < 3}
                    variant="outline"
                    className="gap-1.5 shrink-0 rounded-xl"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Найти"}
                  </Button>
                </div>

                {searchErr && (
                  <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-xl">{searchErr}</p>
                )}

                {results.length > 0 && (
                  <div onScroll={onScroll} className="space-y-1.5 max-h-[280px] overflow-y-auto">
                    <p className="text-[11px] text-muted-foreground/50 px-0.5">
                      Найдено: {results.length}{hasMore ? "+" : ""}
                    </p>
                    {results.map((r, i) => {
                      const sel = r.reference === selectedVerse?.reference;
                      return (
                        <button
                          key={`${r.reference}-${i}`}
                          type="button"
                          onClick={() => selectResult(r)}
                          className={`w-full text-left p-3 border rounded-xl transition-all ${
                            sel
                              ? "border-primary/30 bg-gradient-to-br from-primary/6 to-primary/3 ring-1 ring-primary/20"
                              : "border-border/50 hover:border-primary/25 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-xs text-primary">{r.reference}</span>
                            {sel && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                <Check className="h-2.5 w-2.5" /> Выбрано
                              </span>
                            )}
                          </div>
                          <HighlightedText text={r.text} className="text-sm text-foreground/70 line-clamp-2 leading-relaxed" />
                        </button>
                      );
                    })}
                    {loadingMore && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center">
                        <Loader2 className="h-3 w-3 animate-spin" /> Загружаем ещё...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )} */}

            {/* ── Выбор по адресу ───────────────────────────────────────────── */}
            {inputMode === "manual" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Книга</Label>
                  <Select
                    name="book-select"
                    value={bookId}
                    onValueChange={(v) => {
                      setBookId(v);
                      setChapterNo("");
                      setVerseStartNo("");
                      setVerseEndNo("");
                      setSelectedVerse(null);
                      setVerseTagsLoaded(false);
                      setVerseCount(null);
                    }}
                  >
                    <SelectTrigger className={SOFT_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder="Выберите книгу" />
                    </SelectTrigger>
                    <SelectContent position="popper" className={SOFT_SELECT_CONTENT_CLASS}>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
                          Ветхий Завет
                        </SelectLabel>
                        {oldTestamentBooks.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.nameRu}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator className="my-1.5" />
                      <SelectGroup>
                        <SelectLabel className="text-[11px] uppercase tracking-wide text-muted-foreground/70">
                          Новый Завет
                        </SelectLabel>
                        {newTestamentBooks.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.nameRu}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Глава</Label>
                    <Select
                      name="chapter-select"
                      value={chapterNo}
                      onValueChange={(v) => {
                        setChapterNo(v);
                        setVerseStartNo("");
                        setVerseEndNo("");
                        setSelectedVerse(null);
                        setVerseTagsLoaded(false);
                      }}
                      disabled={!bookId || chaptersCount === 0}
                    >
                      <SelectTrigger className={SOFT_SELECT_TRIGGER_CLASS}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent position="popper" className={SOFT_SELECT_CONTENT_CLASS}>
                        {chaptersCount > 0 && Array.from({ length: chaptersCount }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      Стих от
                      {verseCountLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" />}
                    </Label>
                    <Select
                      name="verse-start-select"
                      value={verseStartNo}
                      onValueChange={(v) => {
                        setVerseStartNo(v);
                        const nextStart = toInt(v);
                        const nextEnd = toInt(verseEndNo);
                        if (!nextStart) {
                          setVerseEndNo("");
                        } else if (nextEnd !== null) {
                          const nextMaxEnd = Math.min(
                            verseOptionsCount,
                            nextStart + MAX_EXTERNAL_VERSE_RANGE_SIZE - 1
                          );
                          if (
                            nextEnd < nextStart ||
                            nextEnd > nextMaxEnd
                          ) {
                            setVerseEndNo("");
                          }
                        }
                        setSelectedVerse(null);
                        setVerseTagsLoaded(false);
                      }}
                      disabled={!chapterNo}
                    >
                      <SelectTrigger className={SOFT_SELECT_TRIGGER_CLASS}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent position="popper" className={SOFT_SELECT_CONTENT_CLASS}>
                        {chapterNo && Array.from({ length: verseOptionsCount }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">до (опц.)</Label>
                    <Select
                      name="verse-end-select"
                      value={verseEndNo}
                      onValueChange={(v) => {
                        setVerseEndNo(v);
                        setSelectedVerse(null);
                        setVerseTagsLoaded(false);
                      }}
                      disabled={!chapterNo || verseStartValue === null}
                    >
                      <SelectTrigger className={SOFT_SELECT_TRIGGER_CLASS}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent position="popper" className={SOFT_SELECT_CONTENT_CLASS}>
                        {chapterNo && verseStartValue !== null && maxVerseEndForStart !== null &&
                          Array.from(
                            { length: Math.max(0, maxVerseEndForStart - verseStartValue + 1) },
                            (_, i) => verseStartValue + i
                          ).map((verseNo) => (
                            <SelectItem key={verseNo} value={String(verseNo)}>
                              {verseNo}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground/70">
                  Можно выбрать до {MAX_EXTERNAL_VERSE_RANGE_SIZE} стихов в одном отрывке.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchVerse}
                  disabled={!canFetch || fetchLoading}
                  className="w-full gap-2 rounded-xl bg-input-background text-foreground/75"
                >
                  {fetchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {fetchLoading ? "Загружаем..." : "Загрузить отрывок"}
                </Button>

                {fetchError && (
                  <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-xl">{fetchError}</p>
                )}
              </div>
            )}

            {/* ── Предпросмотр выбранного стиха ─────────────────────────────── */}
            {selectedVerse && (
              <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/6 via-background/80 to-amber-500/10 dark:shadow-sm overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      {selectedVerse.verseStart === selectedVerse.verseEnd ? "Выбранный стих" : "Выбранный отрывок"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVerse(null);
                        setVerseTagsLoaded(false);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Сменить
                    </button>
                  </div>
                  <p className="text-[15px] leading-relaxed text-foreground/90">
                    {stripMarkTags(selectedVerse.text)}
                  </p>
                  <p className="text-xs font-semibold font-serif italic text-primary/80 text-right tracking-wide">
                    {selectedVerse.reference}
                  </p>
                </div>
              </div>
            )}

            {selectedVerse && isAdmin && (
              <div className="rounded-2xl border border-destructive/25 bg-gradient-to-b from-background to-destructive/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Админ: каталог стиха
                    </p>
                    {adminVerseSummaryLoading ? (
                      <p className="text-xs text-muted-foreground">Проверяем связи стиха...</p>
                    ) : adminVerseSummary ? (
                      <p className="text-xs text-muted-foreground">
                        Связей с пользователями: <span className="font-semibold text-foreground">{adminVerseSummary.userLinksCount}</span>
                        {" · "}
                        Тегов: <span className="font-semibold text-foreground">{adminVerseSummary.tagLinksCount}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Стих ещё не в общей базе. Сначала добавьте его пользователю.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDeleteVerseFromCatalog()}
                    disabled={
                      isDeletingVerseFromCatalog ||
                      adminVerseSummaryLoading ||
                      !adminVerseSummary?.canDelete
                    }
                    className="rounded-xl"
                  >
                    {isDeletingVerseFromCatalog ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Удаляем...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Удалить стих
                      </>
                    )}
                  </Button>
                </div>
                {adminVerseSummary && !adminVerseSummary.canDelete && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Удаление недоступно: стих используется у пользователей.
                  </p>
                )}
              </div>
            )}

            {/* ── Теги ──────────────────────────────────────────────────────── */}
            {selectedVerse && !verseTagsLoaded && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Не удалось синхронизировать текущие теги стиха. При сохранении будут добавлены только выбранные теги.
              </p>
            )}
            {selectedVerse && renderTagManager(false)}
          </div>

          {/* ── Футер ──────────────────────────────────────────────────────────── */}
          <DialogFooter 
        style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }}
        className="flex-shrink-0 flex flex-row items-center gap-2 p-2 py-2.5 bg-background border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 rounded-xl px-3 py-2 text-foreground/75"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl gap-2 px-3 py-2 bg-input-background text-foreground/75  border border-border/70"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Добавляем..." : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
