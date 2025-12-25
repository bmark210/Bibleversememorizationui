'use client'

import { useState, useEffect } from 'react';
import { BibleBook } from '../types/bible';
import { 
  BibleTranslation, 
  getVerse, 
  getChapter, 
  getVerseRange,
  GetVerseParams,
  GetChapterParams,
  GetVerseRangeParams
} from '../services/bibleApi';

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
 *   translation: BibleTranslation.RST
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
        const verse = await getVerse(params);
        
        if (!cancelled) {
          setState({ data: verse, loading: false, error: null });
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
 *   translation: BibleTranslation.RBO
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
        const chapter = await getChapter(params);
        
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
 *   translation: BibleTranslation.NRT
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
        const verses = await getVerseRange(params);
        
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

