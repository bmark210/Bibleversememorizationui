"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Download, Loader2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  BibleBook,
  BIBLE_BOOKS,
  formatVerseReference,
} from "@/app/types/bible";
import {
  DEFAULT_BOLLS_TRANSLATION,
  getBollsChapter,
  getBollsVerse,
  searchBollsVerses,
} from "../services/bollsApi";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";
import { TagsService } from "@/api/services/TagsService";
import type { Tag } from "@/api/models/Tag";
import { toast } from "@/app/lib/toast";

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function HighlightedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(<mark>.*?<\/mark>)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const match = part.match(/^<mark>(.*?)<\/mark>$/);
        return match ? (
          <mark key={i} className="bg-amber-400/60 text-foreground px-0.5 rounded">{match[1]}</mark>
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
  Object.values(BIBLE_BOOKS).sort((a, b) => a.id - b.id);

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
  verse: number;
  reference: string;
  text: string;
};

// ─── Компонент ───────────────────────────────────────────────────────────────

export function AddVerseDialog({ open, onClose, mode = 'verse', onAdd, onCreateTag }: AddVerseDialogProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;
  const isTagMode = mode === "tag";
  const isVerseMode = mode === "verse";

  const [inputMode, setInputMode] = useState<"search" | "manual">("search");
  const [translation, setTranslation] = useState(DEFAULT_BOLLS_TRANSLATION);
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

  // ── Ручной выбор ────────────────────────────────────────────────────────────
  const [bookId, setBookId] = useState("");
  const [chapterNo, setChapterNo] = useState("");
  const [verseNo, setVerseNo] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const verseCountCache = useRef<Map<string, number>>(new Map());
  const [verseCount, setVerseCount] = useState<number | null>(null);
  const [verseCountLoading, setVerseCountLoading] = useState(false);

  // ── Поиск ───────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const searchingRef = useRef(false);
  const lastQueryRef = useRef("");
  const reqIdRef = useRef(0);
  const tagListScrollRef = useRef<HTMLDivElement | null>(null);

  // ── Производные ──────────────────────────────────────────────────────────────

  const canonicalBooks = useMemo(getCanonicalBooks, []);

  const chaptersCount = useMemo(() => {
    const id = toInt(bookId);
    return id ? (BIBLE_BOOKS[id]?.chapters ?? 0) : 0;
  }, [bookId]);

  const canFetch = Boolean(toInt(bookId) && toInt(chapterNo) && toInt(verseNo));
  const canSubmit = Boolean(selectedVerse && !submitting);
  const newTagSlug = slugify(newTagTitle);

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
    if (t) setTranslation(t);
    const m = localStorage.getItem(MODE_KEY);
    if (m === "search" || m === "manual") setInputMode(m);
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(MODE_KEY, inputMode);
  }, [inputMode]);

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

    getBollsChapter({ translation, book: bid as BibleBook, chapter: ch })
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

  useEffect(() => {
    if (inputMode === "search") setFetchError(null);
    else setSearchErr(null);
  }, [inputMode]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

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

  // ── Функции ──────────────────────────────────────────────────────────────────

  const toggleTag = useCallback((slug: string) => {
    setSelectedTagSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

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
    setTagListShadows({ top: false, bottom: false });
    setNewTagTitle("");
    setDeletingTagId(null);
    setSubmitting(false);
    setBookId("");
    setChapterNo("");
    setVerseNo("");
    setFetchError(null);
    setQuery("");
    setResults([]);
    setSearchErr(null);
    setPage(1);
    setHasMore(false);
    setLoadingMore(false);
    setVerseCount(null);
    searchingRef.current = false;
    lastQueryRef.current = "";
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    resetDraft();
    onClose();
  }, [resetDraft, onClose]);

  const handleFetchVerse = async () => {
    const bid = toInt(bookId);
    const ch = toInt(chapterNo);
    const v = toInt(verseNo);
    if (!bid || !ch || !v) { setFetchError("Заполните все поля"); return; }

    setFetchLoading(true);
    setFetchError(null);

    try {
      const res = await getBollsVerse({ translation, book: bid as BibleBook, chapter: ch, verse: v });
      if (!res?.text) throw new Error("Стих не найден");
      setSelectedVerse({
        book: bid as BibleBook,
        chapter: ch,
        verse: v,
        text: res.text,
        reference: formatVerseReference(bid as BibleBook, ch, v),
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Не удалось загрузить стих");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchingRef.current) return;
    const q = query.trim();
    if (q.length < 3) { setSearchErr("Введите минимум 3 символа"); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const rid = ++reqIdRef.current;

    searchingRef.current = true;
    setSearching(true);
    setSearchErr(null);
    setResults([]);
    setPage(1);
    setHasMore(false);
    lastQueryRef.current = q;

    try {
      const resp = await searchBollsVerses({ translation, query: q, matchCase: false, matchWhole: false, limit: PAGE_SIZE, page: 1, signal: ctrl.signal });
      if (ctrl.signal.aborted || reqIdRef.current !== rid) return;
      const items = (resp.results ?? []).map((it) => ({
        book: it.book as BibleBook,
        chapter: it.chapter,
        verse: it.verse,
        text: it.text,
        reference: formatVerseReference(it.book as BibleBook, it.chapter, it.verse),
      }));
      if (!items.length) setSearchErr("Стихи не найдены.");
      else { setResults(items); setHasMore(items.length < (resp.total ?? items.length)); }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        setSearchErr(err instanceof Error ? err.message : "Ошибка поиска");
    } finally {
      if (reqIdRef.current === rid) { searchingRef.current = false; setSearching(false); abortRef.current = null; }
    }
  };

  const loadMore = async () => {
    if (loadingMore || searching || !hasMore || !lastQueryRef.current) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const resp = await searchBollsVerses({ translation, query: lastQueryRef.current, matchCase: false, matchWhole: false, limit: PAGE_SIZE, page: nextPage, signal: abortRef.current?.signal });
      const items = (resp.results ?? []).map((it) => ({
        book: it.book as BibleBook, chapter: it.chapter, verse: it.verse, text: it.text,
        reference: formatVerseReference(it.book as BibleBook, it.chapter, it.verse),
      }));
      const total = resp.total ?? 0;
      setResults((prev) => { const m = [...prev, ...items]; setHasMore(m.length < total && items.length > 0); return m; });
      setPage(nextPage);
    } catch { /* ignore */ } finally { setLoadingMore(false); }
  };

  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 80) loadMore();
  };

  const onTagListScroll: React.UIEventHandler<HTMLDivElement> = useCallback((e) => {
    updateTagListShadows(e.currentTarget);
  }, [updateTagListShadows]);

  const selectResult = (r: SearchResult) => {
    setSelectedVerse({ book: r.book, chapter: r.chapter, verse: r.verse, reference: r.reference, text: r.text });
    setBookId(r.book.toString());
    setChapterNo(r.chapter.toString());
    setVerseNo(r.verse.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerse || submitting) return;
    setSubmitting(true);
    try {
      await onAdd?.({
        externalVerseId: `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`,
        reference: selectedVerse.reference,
        tags: Array.from(selectedTagSlugs),
      });
      handleClose();
    } catch { /* toast показывается выше */ } finally { setSubmitting(false); }
  };

  const renderTagManager = (manageOnly: boolean) => (
    <div className="space-y-2.5 pt-3 rounded-2xl border border-border/45 bg-gradient-to-br from-background/95 to-muted/20">
      <div className="flex items-center justify-between gap-2 px-4">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground/90">
          Темы
        </span>
        <div className="flex items-center gap-3">
          {!manageOnly && selectedTagSlugs.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTagSlugs(new Set())}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
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
              className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
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
            className="shrink-0 h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity flex items-center"
          >
            {creatingTag ? <Loader2 className="h-3 w-3 animate-spin" /> : "Создать"}
          </button>
          <button
            type="button"
            onClick={() => { setCreateTagMode(false); setNewTagTitle(""); }}
            className="shrink-0 h-8 w-8 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {tagsLoading ? (
        <div className="flex gap-1.5 py-0.5">
          {[56, 72, 48, 80, 60].map((w) => (
            <div key={w} className="h-6 rounded-full bg-muted/60 animate-pulse shrink-0" style={{ width: w }} />
          ))}
        </div>
      ) : allTags.length > 0 ? (
        <div className="relative rounded-xl">
          <div
            ref={tagListScrollRef}
            onScroll={onTagListScroll}
            className="inline-flex gap-1.5 pt-1 px-4 pb-3 flex-wrap max-h-[150px] overflow-y-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {allTags.map((tag) => {
              const slug = tag.slug ?? "";
              const canToggle = !manageOnly && !tagDeleteMode && Boolean(slug);
              const active = canToggle && selectedTagSlugs.has(slug);
              const isDeleting = deletingTagId === tag.id;
              return (
                <div key={tag.id ?? slug} className="shrink-0 group/tag relative">
                  <button
                    type="button"
                    onClick={() => canToggle && toggleTag(slug)}
                    disabled={isDeleting || !canToggle}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                    } ${isDeleting ? "opacity-45 pointer-events-none" : ""}`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
                    ) : active ? (
                      <Check className="h-2.5 w-2.5 shrink-0" />
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
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-xl bg-gradient-to-b from-background/95 via-background/65 to-transparent shadow-[0_10px_14px_-14px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${
              tagListShadows.top ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-xl bg-gradient-to-t from-background/95 via-background/65 to-transparent shadow-[0_-10px_14px_-14px_rgba(0,0,0,0.45)] transition-opacity duration-200 ${
              tagListShadows.bottom ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>
      ) : (
        <p className="px-4 pb-5 text-xs text-muted-foreground/45 italic">Нет тегов — создайте первый</p>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-screen h-screen max-w-full sm:h-[90vh] sm:max-w-[600px] max-h-screen overflow-hidden sm:rounded-3xl rounded-none px-0 py-0 flex flex-col border-border/60 bg-gradient-to-b from-background via-background to-muted/20">

        {/* ── Шапка ──────────────────────────────────────────────────────────── */}
        <DialogHeader
          style={{ paddingTop: `${Math.max(topInset, 20)}px` }}
          className="px-5 pb-4 border-b border-border/40 flex-shrink-0 sticky top-0 bg-gradient-to-b from-background via-background to-background/95 backdrop-blur z-10"
        >
          <DialogTitle className="text-center text-base font-semibold">
            {isTagMode ? "Управление темами" : "Добавить стих"}
          </DialogTitle>
          <p className="text-center text-[11px] text-muted-foreground/70 mt-1 mb-3">
            {/* {isTagMode
              ? "Создавайте и удаляйте темы в одном блоке"
              : "Выберите стих и добавьте к нему подходящие теги"} */}
          </p>

          {/* Segmented mode toggle — verse mode only */}
          {isVerseMode && (
            <div className="flex items-center bg-muted/65 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setInputMode("search")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  inputMode === "search"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                По адресу
              </button>
            </div>
          )}
        </DialogHeader>

        {/* ── Тег-режим ──────────────────────────────────────────────────────── */}
        {isTagMode && (
          <div className="flex flex-col h-full min-h-0">
            <div className="space-y-3 px-4 py-4 overflow-y-auto min-h-0 flex-1">
              {renderTagManager(true)}
            </div>
            <DialogFooter
              style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }}
              className="flex-shrink-0 flex flex-row items-center gap-2 p-2 py-2.5 bg-background border-t border-border/40"
            >
              <Button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl px-3 py-2"
              >
                Готово
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Стих-режим ─────────────────────────────────────────────────────── */}
        {isVerseMode && (
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="space-y-3 px-4 py-4 overflow-y-auto min-h-0 flex-1">

            {/* ── Поиск по тексту ────────────────────────────────────────────── */}
            {inputMode === "search" && (
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
            )}

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
                      setVerseNo("");
                      setSelectedVerse(null);
                      setVerseCount(null);
                    }}
                  >
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue placeholder="Выберите книгу" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {canonicalBooks.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.nameRu}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Глава</Label>
                    <Select
                      name="chapter-select"
                      value={chapterNo}
                      onValueChange={(v) => {
                        setChapterNo(v);
                        setVerseNo("");
                        setSelectedVerse(null);
                      }}
                      disabled={!bookId || chaptersCount === 0}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px]">
                        {chaptersCount > 0 && Array.from({ length: chaptersCount }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      Стих
                      {verseCountLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" />}
                    </Label>
                    <Select
                      name="verse-select"
                      value={verseNo}
                      onValueChange={(v) => {
                        setVerseNo(v);
                        setSelectedVerse(null);
                      }}
                      disabled={!chapterNo}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px]">
                        {chapterNo && Array.from({ length: verseCount ?? 176 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchVerse}
                  disabled={!canFetch || fetchLoading}
                  className="w-full gap-2 rounded-xl"
                >
                  {fetchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {fetchLoading ? "Загружаем..." : "Загрузить стих"}
                </Button>

                {fetchError && (
                  <p className="text-sm text-destructive bg-destructive/8 px-3 py-2 rounded-xl">{fetchError}</p>
                )}
              </div>
            )}

            {/* ── Предпросмотр выбранного стиха ─────────────────────────────── */}
            {selectedVerse && (
              <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/6 via-background/80 to-amber-500/10 shadow-sm overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Выбранный стих
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedVerse(null)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Сменить
                    </button>
                  </div>
                  <p className="text-[15px] leading-relaxed text-foreground/90">
                    {stripMarkTags(selectedVerse.text)}
                  </p>
                  <p className="text-xs font-semibold text-primary/80 text-right tracking-wide">
                    {selectedVerse.reference}
                  </p>
                </div>
              </div>
            )}

            {/* ── Теги ──────────────────────────────────────────────────────── */}
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
              className="flex-1 rounded-xl px-3 py-2"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 rounded-xl gap-2 px-3 py-2"
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
