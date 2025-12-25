'use client'

import React, { useState, useRef } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { BibleBook, getAllBibleBooks, getBibleBookNameRu, formatVerseReference } from '../types/bible';
import { BibleTranslation, BIBLE_TRANSLATIONS } from '../services/bibleApi';

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
  const [reference, setReference] = useState('');
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('rst');
  const [tags, setTags] = useState('');
  
  // Поля для загрузки стиха
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [chapter, setChapter] = useState('');
  const [verse, setVerse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Поля для поиска по цитате
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    book: BibleBook;
    chapter: number;
    verse: number;
    text: string;
    reference: string;
  }>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Ref для отслеживания текущего поиска
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const isSearchingRef = useRef(false);

  const handleFetchVerse = async () => {
    if (!selectedBook || !chapter || !verse) {
      setError('Пожалуйста, заполните все поля для загрузки стиха');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bookId = parseInt(selectedBook) as BibleBook;
      const chapterNum = parseInt(chapter);
      const verseNum = parseInt(verse);

      // Запрос к API через axios
      const response = await axios.get('https://justbible.ru/api/bible', {
        params: {
          translation: translation,
          book: bookId,
          chapter: chapterNum,
          verse: verseNum,
        },
      });

      const verseText = response.data[verseNum.toString()];

      if (!verseText) {
        throw new Error('Стих не найден');
      }

      // Заполняем поля
      setText(verseText);
      setReference(formatVerseReference(bookId, chapterNum, verseNum, 'ru'));

    } catch (err) {
      console.error('Ошибка при загрузке стиха:', err);
      setError(
        axios.isAxiosError(err)
          ? `Ошибка загрузки: ${err.message}`
          : 'Не удалось загрузить стих. Проверьте подключение к интернету.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByQuote = async () => {
    // Предотвращаем множественные одновременные вызовы
    if (isSearchingRef.current) {
      console.log('Поиск уже выполняется, пропускаем');
      return;
    }

    if (!searchQuery || searchQuery.length < 3) {
      setSearchError('Введите минимум 3 символа для поиска');
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

    try {
      const results: Array<{
        book: BibleBook;
        chapter: number;
        verse: number;
        text: string;
        reference: string;
      }> = [];

      // Ограниченный список популярных книг (уменьшаем нагрузку)
      const popularBooks = [
        BibleBook.John,
        BibleBook.Matthew,
        BibleBook.Romans,
        BibleBook.Psalms,
        BibleBook.Genesis,
      ];

      const normalizedQuery = searchQuery.toLowerCase().trim();

      // Поиск ТОЛЬКО в первых 3 главах каждой книги
      for (const bookId of popularBooks) {
        if (results.length >= 10) break;
        if (abortController.signal.aborted) break;

        // Ищем только в первых 3 главах
        for (let chapterNum = 1; chapterNum <= 3; chapterNum++) {
          if (results.length >= 10) break;
          if (abortController.signal.aborted) break;

          try {
            const response = await axios.get('https://justbible.ru/api/bible', {
              params: {
                translation: translation,
                book: bookId,
                chapter: chapterNum,
              },
              timeout: 5000,
              signal: abortController.signal,
            });

            // Проверка на отмену
            if (abortController.signal.aborted) break;

            // Проверяем каждый стих в главе
            for (const [verseNum, verseText] of Object.entries(response.data)) {
              if (verseNum === 'info' || typeof verseText !== 'string') continue;

              if (verseText.toLowerCase().includes(normalizedQuery)) {
                results.push({
                  book: bookId,
                  chapter: chapterNum,
                  verse: parseInt(verseNum),
                  text: verseText,
                  reference: formatVerseReference(bookId, chapterNum, parseInt(verseNum), 'ru'),
                });

                if (results.length >= 10) break;
              }
            }

            // Небольшая задержка между запросами (100мс)
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (err) {
            // Игнорируем ошибки отмены
            if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') {
              break;
            }
            console.warn(`Ошибка поиска в ${bookId}:${chapterNum}`, err);
          }
        }
      }

      // Проверка на отмену перед обновлением состояния
      if (!abortController.signal.aborted) {
        if (results.length === 0) {
          setSearchError('Стихи не найдены. Попробуйте другой запрос.');
        } else {
          setSearchResults(results);
        }
      }

    } catch (err) {
      if (!axios.isAxiosError(err) || err.code !== 'ERR_CANCELED') {
        console.error('Ошибка при поиске по цитате:', err);
        setSearchError(
          axios.isAxiosError(err)
            ? `Ошибка поиска: ${err.message}`
            : 'Не удалось выполнить поиск.'
        );
      }
    } finally {
      isSearchingRef.current = false;
      setSearching(false);
      searchAbortControllerRef.current = null;
    }
  };

  const handleSelectSearchResult = (result: typeof searchResults[0]) => {
    setText(result.text);
    setReference(result.reference);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reference || !text) return;

    onAdd({
      reference,
      text,
      translation,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    // Reset form
    setReference('');
    setText('');
    setTranslation('rst');
    setTags('');
    setSelectedBook('');
    setChapter('');
    setVerse('');
    setError(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    onClose();
  };

  const bibleBooks = getAllBibleBooks();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Добавить новый стих</DialogTitle>
          <DialogDescription>
            Добавьте стих в вашу коллекцию для заучивания
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Секция загрузки стиха */}
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Загрузить стих из Библии</Label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="translation-select">Перевод</Label>
                  <Select value={translation} onValueChange={setTranslation}>
                    <SelectTrigger id="translation-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(BIBLE_TRANSLATIONS).map((trans) => (
                        <SelectItem key={trans.code} value={trans.code}>
                          {trans.nameRu}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="chapter">Глава</Label>
                  <Input
                    id="chapter"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verse">Стих</Label>
                  <Input
                    id="verse"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={verse}
                    onChange={(e) => setVerse(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleFetchVerse}
                disabled={loading || !selectedBook || !chapter || !verse}
                className="w-full"
                variant="secondary"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Загрузить стих
                  </>
                )}
              </Button>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              )}
            </div>

            {/* Разделитель */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  или найдите по цитате
                </span>
              </div>
            </div>

            {/* Секция поиска по цитате */}
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <Label className="text-base font-semibold">Поиск по цитате</Label>
              
              <div className="space-y-2">
                <Label htmlFor="search-query">Введите часть текста стиха</Label>
                <div className="flex gap-2">
                  <Input
                    id="search-query"
                    placeholder="например, возлюбил Бог мир"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchByQuote();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchByQuote}
                    disabled={searching || searchQuery.length < 3}
                    variant="secondary"
                  >
                    {searching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Найти'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Поиск по популярным книгам Библии (Евангелия, Послания, Псалмы и др.)
                </p>
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
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  <Label className="text-sm">Результаты поиска ({searchResults.length}):</Label>
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="font-medium text-sm text-primary mb-1">
                        {result.reference}
                      </div>
                      <div className="text-sm text-foreground line-clamp-2">
                        {result.text}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Разделитель */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  результат
                </span>
              </div>
            </div>

            {/* Секция ручного ввода */}
            <div className="space-y-2">
              <Label htmlFor="reference">Ссылка</Label>
              <Input
                id="reference"
                placeholder="например, Иоанн 3:16"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Текст стиха</Label>
              <Textarea
                id="text"
                placeholder="Введите текст стиха..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Теги (через запятую)</Label>
              <Input
                id="tags"
                placeholder="например, Евангелие, Спасение, Любовь"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
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
