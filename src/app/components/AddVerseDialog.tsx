"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, Loader2, RefreshCw, Search, Tag } from "lucide-react";
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

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const renderMarkHtml = (text: string) => {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/&lt;mark&gt;/g, '<mark class="bg-amber-400/60 text-foreground px-0.5 rounded">')
    .replace(/&lt;\/mark&gt;/g, "</mark>");
};

const removeMarkTags = (text: string) =>
  text.replace(/<mark.*?>/g, "").replace(/<\/mark>/g, "");

const toInt = (v: string) => {
  const n = parseInt(v, 10);
  return isFinite(n) && n > 0 ? n : null;
};

// ─── Константы ───────────────────────────────────────────────────────────────

const TRANSLATION_KEY = "bibleTranslation";
const MODE_KEY = "addVerseDialogMode";
const PAGE_SIZE = 20;

// Книги в каноническом порядке один раз при загрузке модуля.
// Запись через функцию защищает от undefined при HMR-перезагрузке.
const getCanonicalBooks = () =>
  Object.values(BIBLE_BOOKS).sort((a, b) => a.id - b.id);

// ─── Типы ─────────────────────────────────────────────────────────────────────

interface AddVerseDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (verse: {
    externalVerseId: string;
    reference: string;
    tags: string[];
  }) => Promise<void>;
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

export function AddVerseDialog({ open, onClose, onAdd }: AddVerseDialogProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;

  const [mode, setMode] = useState<"search" | "manual">("search");
  const [translation, setTranslation] = useState(DEFAULT_BOLLS_TRANSLATION);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [tags, setTags] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Ручной выбор ────────────────────────────────────────────────────────────
  const [bookId, setBookId] = useState("");
  const [chapterNo, setChapterNo] = useState("");
  const [verseNo, setVerseNo] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Стихи в главе (кэш + состояние)
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

  // ── Производные ──────────────────────────────────────────────────────────────

  const canonicalBooks = useMemo(getCanonicalBooks, []);

  const chaptersCount = useMemo(() => {
    const id = toInt(bookId);
    return id ? (BIBLE_BOOKS[id]?.chapters ?? 0) : 0;
  }, [bookId]);

  const canFetch = Boolean(toInt(bookId) && toInt(chapterNo) && toInt(verseNo));
  const canSubmit = Boolean(selectedVerse && !submitting);

  // ── Читаем перевод и режим из localStorage ──────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem(TRANSLATION_KEY);
    if (t) setTranslation(t);
    const m = localStorage.getItem(MODE_KEY);
    if (m === "search" || m === "manual") setMode(m);
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

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

  // ── Сброс при смене режима ───────────────────────────────────────────────────

  useEffect(() => {
    if (mode === "search") setFetchError(null);
    else setSearchErr(null);
  }, [mode]);

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Функции ──────────────────────────────────────────────────────────────────

  const resetDraft = useCallback(() => {
    setSelectedVerse(null);
    setTags("");
    setShowTags(false);
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

  const selectResult = (r: SearchResult) => {
    // Устанавливаем selectedVerse до смены book/chapter/verse,
    // и не используем useEffect-сброс при их изменении.
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
      await onAdd({
        externalVerseId: `${selectedVerse.book}-${selectedVerse.chapter}-${selectedVerse.verse}`,
        reference: selectedVerse.reference,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      handleClose();
    } catch { /* toast показывается выше */ } finally { setSubmitting(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-screen h-screen max-w-full sm:h-[88vh] sm:max-w-[680px] max-h-screen overflow-hidden sm:rounded-2xl rounded-none px-0 py-0 flex flex-col border-border/80">

        {/* ── Шапка ─────────────────────────────────────────────────────────── */}
        <DialogHeader
          className="px-6 pb-4 border-b bg-gradient-to-b from-card to-card/80 flex-shrink-0"
          style={{ paddingTop: `${Math.max(topInset, 24)}px` }}
        >
          <DialogTitle className="text-center text-lg font-semibold mb-1">
            Добавить стих
          </DialogTitle>

          {/* Описание + переключатель режима — НЕ внутри <p> */}
          <div className="space-y-3">
            <p className="text-center text-xs text-muted-foreground">
              Найдите стих по тексту или выберите по адресу
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "search" ? "default" : "secondary"}
                onClick={() => setMode("search")}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Поиск
              </Button>
              <Button
                type="button"
                variant={mode === "manual" ? "default" : "secondary"}
                onClick={() => setMode("manual")}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                По адресу
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Форма ─────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="space-y-3 p-5 overflow-y-auto min-h-0 flex-1">

            {/* ── Поиск по тексту ─────────────────────────────────────────── */}
            {mode === "search" && (
              <div className="rounded-xl border bg-muted/40 p-4 space-y-3 shadow-sm">
                <div className="flex gap-2">
                  <Input
                    id="search-query"
                    name="search-query"
                    placeholder="Введите часть текста стиха..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleSearch(); (e.target as HTMLElement).blur(); }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || query.trim().length < 3}
                    variant="outline"
                    className="gap-1.5 shrink-0"
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" />Найти</>}
                  </Button>
                </div>

                {searching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ищем...
                  </div>
                )}

                {searchErr && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{searchErr}</p>
                )}

                {results.length > 0 && (
                  <div onScroll={onScroll} className="space-y-1.5 max-h-[340px] overflow-y-auto pr-0.5">
                    <p className="text-xs text-muted-foreground">
                      Найдено: {results.length}{hasMore ? "+" : ""}
                    </p>
                    {results.map((r, i) => {
                      const sel = r.reference === selectedVerse?.reference;
                      return (
                        <button
                          key={`${r.reference}-${i}`}
                          type="button"
                          onClick={() => selectResult(r)}
                          className={`w-full text-left p-3 border rounded-xl transition-all ${sel ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40 hover:bg-accent/40"}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-primary">{r.reference}</span>
                            {sel && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Выбрано</span>}
                          </div>
                          <div className="text-sm text-foreground/80 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkHtml(r.text) }} />
                        </button>
                      );
                    })}
                    {loadingMore && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Загружаем ещё...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Выбор по адресу ─────────────────────────────────────────── */}
            {mode === "manual" && (
              <div className="rounded-xl border bg-muted/40 p-4 space-y-3 shadow-sm">

                {/* Книга */}
                <div className="space-y-1.5">
                  <Label htmlFor="book-select" className="text-sm font-medium">Книга</Label>
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
                    <SelectTrigger id="book-select" className="w-full">
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

                {/* Глава + Стих */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="chapter-select" className="text-sm font-medium">Глава</Label>
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
                      <SelectTrigger id="chapter-select">
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
                    <Label htmlFor="verse-select" className="text-sm font-medium flex items-center gap-1.5">
                      Стих
                      {verseCountLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
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
                      <SelectTrigger id="verse-select">
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

                {verseCount !== null && chapterNo && !verseCountLoading && (
                  <p className="text-xs text-muted-foreground">
                    Глава {chapterNo}: {verseCount} {verseCount === 1 ? "стих" : verseCount < 5 ? "стиха" : "стихов"}
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFetchVerse}
                  disabled={!canFetch || fetchLoading}
                  className="w-full gap-2"
                >
                  {fetchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {fetchLoading ? "Загружаем..." : "Загрузить стих"}
                </Button>

                {fetchError && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{fetchError}</p>
                )}
              </div>
            )}

            {/* ── Предпросмотр ─────────────────────────────────────────────── */}
            {selectedVerse && (
              <>
                <div className="rounded-xl border bg-gradient-to-b from-secondary/60 to-secondary/30 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Выбранный стих</span>
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground gap-1"
                      onClick={() => setSelectedVerse(null)}
                    >
                      <RefreshCw className="h-3 w-3" /> Сменить
                    </Button>
                  </div>
                  <p className="text-base leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: removeMarkTags(selectedVerse.text) }} />
                  <p className="text-sm text-right text-primary font-medium">{selectedVerse.reference}</p>
                </div>

                {!showTags ? (
                  <Button type="button" variant="outline" className="self-end ml-auto flex items-center gap-2 h-8 text-sm" onClick={() => setShowTags(true)}>
                    <Tag className="h-3.5 w-3.5" /> Добавить теги
                  </Button>
                ) : (
                  <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                    <Label htmlFor="tags-input" className="text-sm">Теги (через запятую)</Label>
                    <Input
                      id="tags-input"
                      name="tags"
                      placeholder="например: Евангелие, Спасение, Любовь"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                    {tags && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Футер ──────────────────────────────────────────────────────── */}
          <DialogFooter className="flex-shrink-0 flex flex-row justify-between gap-2 px-5 py-4 bg-background border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={!canSubmit} className="flex-1 gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Добавляем..." : "Добавить стих"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
