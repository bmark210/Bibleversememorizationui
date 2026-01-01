"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Download, Loader2, Tag } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  BibleBook,
  getAllBibleBooks,
  getBibleBookNameRu,
  formatVerseReference,
} from "../types/bible";
import {
  DEFAULT_BOLLS_TRANSLATION,
  getBollsVerse,
  searchBollsVerses,
} from "../services/bollsApi";

// Мини-санитайзер: экранируем HTML и оставляем только подсветку <mark>
const renderMarkHtml = (text: string) => {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(
      /&lt;mark&gt;/g,
      '<mark class="bg-amber-400/60 text-foreground px-0.5 rounded">'
    )
    .replace(/&lt;\/mark&gt;/g, "</mark>");
};

// Удаляет все HTML-теги <mark> и </mark> из текста
const removeMarkTags = (text: string) => {
  // Убирает любые варианты <mark ...> и </mark> из HTML (не делает эскейп)
  return text.replace(/<mark.*?>/g, "").replace(/<\/mark>/g, "");
};

const MODE_STORAGE_KEY = "addVerseDialogMode";

interface AddVerseDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (verse: {
    reference: string;
    text: string;
    translation: string;
    tags: string[];
  }) => void;
}

export function AddVerseDialog({ open, onClose, onAdd }: AddVerseDialogProps) {
  const [reference, setReference] = useState("");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState<string>(
    DEFAULT_BOLLS_TRANSLATION
  );
  const [tags, setTags] = useState("");
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [showTags, setShowTags] = useState(false);

  // Поля для загрузки стиха
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [chapter, setChapter] = useState("");
  const [verse, setVerse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Поля для поиска по цитате
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{
      book: BibleBook;
      chapter: number;
      verse: number;
      text: string;
      reference: string;
    }>
  >([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Ref для отслеживания текущего поиска
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const isSearchingRef = useRef(false);
  const lastSearchQueryRef = useRef<string>("");
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const SEARCH_PAGE_SIZE = 20;

  const handleFetchVerse = async () => {
    if (!selectedBook || !chapter || !verse) {
      setError("Пожалуйста, заполните все поля для загрузки стиха");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookId = parseInt(selectedBook) as BibleBook;
      const chapterNum = parseInt(chapter);
      const verseNum = parseInt(verse);

      // Запрос к Bolls API
      const verseResult = await getBollsVerse({
        translation,
        book: bookId,
        chapter: chapterNum,
        verse: verseNum,
      });

      if (!verseResult?.text) {
        throw new Error("Стих не найден");
      }

      // Заполняем поля
      setText(verseResult.text);
      setReference(formatVerseReference(bookId, chapterNum, verseNum, "ru"));
    } catch (err) {
      console.error("Ошибка при загрузке стиха:", err);
      setError(
        err instanceof Error
          ? `Ошибка загрузки: ${err.message}`
          : "Не удалось загрузить стих. Проверьте подключение к интернету."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByQuote = async () => {
    // Предотвращаем множественные одновременные вызовы
    if (isSearchingRef.current) {
      console.log("Поиск уже выполняется, пропускаем");
      return;
    }

    if (!searchQuery || searchQuery.length < 3) {
      setSearchError("Введите минимум 3 символа для поиска");
      return;
    }

    // Отменяем предыдущий поиск, если он есть
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    // Создаем новый контроллер для отмены
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    isSearchingRef.current = true;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchPage(1);
    setHasMoreSearch(false);
    lastSearchQueryRef.current = searchQuery.trim();

    try {
      const normalizedQuery = lastSearchQueryRef.current;

      const response = await searchBollsVerses({
        translation,
        query: normalizedQuery,
        matchCase: false,
        matchWhole: false,
        limit: SEARCH_PAGE_SIZE,
        page: 1,
        signal: abortController.signal,
      });

      const results =
        response.results?.map((item) => ({
          book: item.book as BibleBook,
          chapter: item.chapter as number,
          verse: item.verse as number,
          text: item.text as string,
          reference: formatVerseReference(
            item.book as BibleBook,
            item.chapter as number,
            item.verse as number,
            "ru"
          ),
        })) ?? [];

      // Проверка на отмену перед обновлением состояния
      if (!abortController.signal.aborted) {
        const total = response.total ?? results.length;
        if (!results.length) {
          setSearchError("Стихи не найдены. Попробуйте другой запрос.");
        } else {
          setSearchResults(results);
          setHasMoreSearch(results.length < total);
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Ошибка при поиске по цитате:", err);
        setSearchError(
          err instanceof Error
            ? `Ошибка поиска: ${err.message}`
            : "Не удалось выполнить поиск."
        );
      }
    } finally {
      isSearchingRef.current = false;
      setSearching(false);
      searchAbortControllerRef.current = null;
    }
  };

  const loadMoreSearchResults = async () => {
    if (loadingMore || searching || !hasMoreSearch) return;
    if (!lastSearchQueryRef.current) return;

    const nextPage = searchPage + 1;
    setLoadingMore(true);

    try {
      const response = await searchBollsVerses({
        translation,
        query: lastSearchQueryRef.current,
        matchCase: false,
        matchWhole: false,
        limit: SEARCH_PAGE_SIZE,
        page: nextPage,
        signal: searchAbortControllerRef.current?.signal,
      });

      const results =
        response.results?.map((item) => ({
          book: item.book as BibleBook,
          chapter: item.chapter as number,
          verse: item.verse as number,
          text: item.text as string,
          reference: formatVerseReference(
            item.book as BibleBook,
            item.chapter as number,
            item.verse as number,
            "ru"
          ),
        })) ?? [];

      const total = response.total ?? 0;
      const merged = [...searchResults, ...results];

      setSearchResults(merged);
      setSearchPage(nextPage);
      setHasMoreSearch(merged.length < total && results.length > 0);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.warn("Ошибка при дозагрузке результатов поиска:", err);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleResultsScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 80) {
      loadMoreSearchResults();
    }
  };

  const handleSelectSearchResult = (result: (typeof searchResults)[0]) => {
    setText(result.text);
    setReference(result.reference);
    setSelectedBook(result.book.toString());
    setChapter(result.chapter.toString());
    setVerse(result.verse.toString());
    setSearchError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reference || !text) return;

    onAdd({
      reference,
      text,
      translation,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    // Reset form
    setReference("");
    setText("");
    setTranslation(DEFAULT_BOLLS_TRANSLATION);
    setTags("");
    setSelectedBook("");
    setChapter("");
    setVerse("");
    setError(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    onClose();
  };

  const bibleBooks = getAllBibleBooks();

  useEffect(() => {
    const storedMode =
      typeof window !== "undefined"
        ? window.localStorage.getItem(MODE_STORAGE_KEY)
        : null;
    if (storedMode === "search" || storedMode === "manual") {
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (selectedBook && chapter && verse) {
      handleFetchVerse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBook, chapter, verse]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-full sm:h-[80vh] sm:max-w-[600px] max-h-screen overflow-y-auto sm:rounded-lg rounded-none px-6 py-0 flex flex-col justify-between">
        <DialogHeader className="sticky top-0 z-10 bg-background pt-28 md:pt-6 !max-h-fit">
          <DialogTitle className="text-center mb-4">
            Добавить новый стих
          </DialogTitle>
          <DialogDescription>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={mode === "search" ? "default" : "secondary"}
                onClick={() => setMode("search")}
              >
                Поиск по цитате
              </Button>
              <Button
                type="button"
                variant={mode === "manual" ? "default" : "secondary"}
                onClick={() => setMode("manual")}
              >
                Ручной выбор
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col justify-between h-full min-h-max"
        >
          <div className="space-y-4 pb-4">
            {mode === "search" && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="search-query"
                      placeholder="Поиск"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearchByQuote();
                          (e.target as HTMLElement).blur();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={handleSearchByQuote}
                      disabled={searching || searchQuery.length < 3}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Найти"
                      )}
                    </Button>
                  </div>
                </div>

                {searching && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Идет поиск...
                  </div>
                )}

                {searchError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {searchError}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div
                    ref={resultsContainerRef}
                    onScroll={handleResultsScroll}
                    className="space-y-2 max-h-[300px] overflow-y-auto"
                  >
                    <Label className="text-sm">
                      Результаты поиска ({searchResults.length}
                      {hasMoreSearch ? "+" : ""}):
                    </Label>
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.reference}-${index}`}
                        type="button"
                        onClick={() => handleSelectSearchResult(result)}
                        style={{
                          borderColor:
                            result.reference === reference
                              ? "var(--primary)"
                              : "var(--border)",
                        }}
                        className="w-full text-left p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="font-medium text-sm text-primary mb-1">
                          {result.reference}
                        </div>
                        <div
                          className="text-sm text-foreground line-clamp-3"
                          dangerouslySetInnerHTML={{
                            __html: renderMarkHtml(result.text),
                          }}
                        />
                      </button>
                    ))}
                    {loadingMore && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2 pb-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Загружаем ещё...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === "manual" && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="book-select">Книга</Label>
                  <Select value={selectedBook} onValueChange={setSelectedBook}>
                    <SelectTrigger id="book-select">
                      <SelectValue placeholder="Выберите книгу" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {bibleBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id.toString()}>
                          {book.nameRu}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="chapter">Глава</Label>
                    <Select value={chapter} onValueChange={setChapter}>
                      <SelectTrigger id="chapter">
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px]">
                        {Array.from({ length: 200 }, (_, i) => {
                          const val = (i + 1).toString();
                          return (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verse">Стих</Label>
                    <Select value={verse} onValueChange={setVerse}>
                      <SelectTrigger id="verse">
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[240px]">
                        {Array.from({ length: 200 }, (_, i) => {
                          const val = (i + 1).toString();
                          return (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {error}
                  </div>
                )}
              </div>
            )}

            {text && (
              <div className="space-y-2 min-h-[120px] p-3 border border-secondary rounded bg-secondary/70 text-sm leading-relaxed">
                <div
                  id="text"
                  className=""
                  dangerouslySetInnerHTML={{
                    __html: removeMarkTags(text),
                  }}
                />
                {reference && (
                  <p className="w-full flex justify-end text-muted-foreground">
                    {reference}
                  </p>
                )}
              </div>
            )}
            {text && (
              <div className="flex flex-col justify-between gap-2 w-full py-2 bg-background space-y-2">
                {!showTags && (
                  <Button
                    type="button"
                    variant="outline"
                    className="self-end flex items-center gap-2"
                    onClick={() => setShowTags(true)}
                  >
                    <Tag className="h-4 w-4" />
                    Добавить теги
                  </Button>
                )}

                {showTags && (
                  <div className="space-y-2">
                    <Label htmlFor="tags">Теги (через запятую)</Label>
                    <Input
                      id="tags"
                      placeholder="например, Евангелие, Спасение, Любовь"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row md:flex-col justify-between gap-2 w-full py-2 bg-background">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">Добавить стих</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
