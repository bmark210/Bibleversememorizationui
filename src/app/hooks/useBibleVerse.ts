'use client'

import { useState, useEffect } from 'react';
import { BibleBook } from '../types/bible';
import {
  DEFAULT_HELLOAO_TRANSLATION,
  HelloaoVerse,
  getHelloaoVerse,
  getHelloaoChapter,
} from '../services/helloaoBibleApi';

/**
 * Параметры запроса стиха
 */
interface GetVerseParams {
  book: BibleBook;
  chapter: number;
  verse: number;
  translation?: string;
}

/**
 * Параметры запроса главы
 */
interface GetChapterParams {
  book: BibleBook;
  chapter: number;
  translation?: string;
}

/**
 * Параметры запроса диапазона стихов
 */
interface GetVerseRangeParams {
  book: BibleBook;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  translation?: string;
}

/**
 * Состояние загрузки стиха
 */
export interface BibleVerseState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * React Hook для получения одного стиха
 * 
 * @example
 * const { data, loading, error } = useBibleVerse({
 *   book: BibleBook.John,
 *   chapter: 3,
  *   verse: 16,
 *   translation: "rus_syn"
 * });
 */
export function useBibleVerse(params: GetVerseParams | null) {
  const [state, setState] = useState<BibleVerseState<string>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!params) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const fetchVerse = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const verse = await getHelloaoVerse({
          translation: params.translation ?? DEFAULT_HELLOAO_TRANSLATION,
          book: params.book,
          chapter: params.chapter,
          verse: params.verse,
        });
        
        if (!cancelled) {
          setState({ data: verse.text, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          });
        }
      }
    };

    fetchVerse();

    return () => {
      cancelled = true;
    };
  }, [params?.book, params?.chapter, params?.verse, params?.translation]);

  return state;
}

/**
 * React Hook для получения главы
 * 
 * @example
 * const { data, loading, error } = useBibleChapter({
 *   book: BibleBook.Psalms,
 *   chapter: 23,
 *   translation: "rus_syn"
 * });
 */
export function useBibleChapter(params: GetChapterParams | null) {
  const [state, setState] = useState<BibleVerseState<Record<number, string>>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!params) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const fetchChapter = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const chapterVerses = await getHelloaoChapter({
          translation: params.translation ?? DEFAULT_HELLOAO_TRANSLATION,
          book: params.book,
          chapter: params.chapter,
        });

        const chapter: Record<number, string> = {};
        chapterVerses.forEach((v: HelloaoVerse) => {
          chapter[v.verse] = v.text;
        });
        
        if (!cancelled) {
          setState({ data: chapter, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          });
        }
      }
    };

    fetchChapter();

    return () => {
      cancelled = true;
    };
  }, [params?.book, params?.chapter, params?.translation]);

  return state;
}

/**
 * React Hook для получения диапазона стихов
 * 
 * @example
 * const { data, loading, error } = useBibleVerseRange({
 *   book: BibleBook.Genesis,
 *   chapter: 1,
 *   verseStart: 1,
 *   verseEnd: 3,
 *   translation: "rus_syn"
 * });
 */
export function useBibleVerseRange(params: GetVerseRangeParams | null) {
  const [state, setState] = useState<BibleVerseState<Record<number, string>>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!params) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const fetchRange = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const chapterVerses = await getHelloaoChapter({
          translation: params.translation ?? DEFAULT_HELLOAO_TRANSLATION,
          book: params.book,
          chapter: params.chapter,
        });

        const verses: Record<number, string> = {};
        chapterVerses.forEach((v: HelloaoVerse) => {
          if (v.verse >= params.verseStart && v.verse <= params.verseEnd) {
            verses[v.verse] = v.text;
          }
        });
        
        if (!cancelled) {
          setState({ data: verses, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          });
        }
      }
    };

    fetchRange();

    return () => {
      cancelled = true;
    };
  }, [params?.book, params?.chapter, params?.verseStart, params?.verseEnd, params?.translation]);

  return state;
}

