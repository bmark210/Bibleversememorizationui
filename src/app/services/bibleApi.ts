'use client'

import axios from 'axios';
import { BibleBook } from '../types/bible';

/**
 * Доступные переводы Библии
 */
export enum BibleTranslation {
  /** Синодальный русский перевод */
  RST = 'rst',
  /** Современный русский перевод РБО */
  RBO = 'rbo',
  /** Новый русский перевод */
  NRT = 'nrt',
}

/**
 * Информация о переводе
 */
export interface TranslationInfo {
  code: BibleTranslation;
  nameRu: string;
  nameEn: string;
  description?: string;
}

/**
 * Информация о всех доступных переводах
 */
export const BIBLE_TRANSLATIONS: Record<BibleTranslation, TranslationInfo> = {
  [BibleTranslation.RST]: {
    code: BibleTranslation.RST,
    nameRu: 'Синодальный перевод',
    nameEn: 'Russian Synodal Translation',
    description: 'Классический синодальный перевод',
  },
  [BibleTranslation.RBO]: {
    code: BibleTranslation.RBO,
    nameRu: 'Современный перевод РБО',
    nameEn: 'Russian Bible Society Modern Translation',
    description: 'Современный русский перевод Российского Библейского Общества',
  },
  [BibleTranslation.NRT]: {
    code: BibleTranslation.NRT,
    nameRu: 'Новый русский перевод',
    nameEn: 'New Russian Translation',
    description: 'Новый русский перевод',
  },
};

/**
 * Ответ API для одного стиха
 */
export interface BibleVerseResponse {
  /** Текст стиха с номером в качестве ключа */
  [verseNumber: string]: string | BibleVerseInfo;
  /** Информация о запросе */
  info: BibleVerseInfo;
}

export interface BibleVerseInfo {
  translation: string;
  book: string;
  chapter: number;
  verse: number;
}

/**
 * Ответ API для главы
 */
export interface BibleChapterResponse {
  /** Стихи главы (ключ - номер стиха, значение - текст) */
  [verseNumber: string]: string | BibleChapterInfo;
  /** Информация о запросе */
  info: BibleChapterInfo;
}

export interface BibleChapterInfo {
  translation: string;
  book: string;
  chapter: number;
}

/**
 * Ответ API с ошибкой
 */
export interface BibleApiError {
  error: string;
  message?: string;
}

/**
 * Параметры запроса стиха
 */
export interface GetVerseParams {
  book: BibleBook;
  chapter: number;
  verse: number;
  translation?: BibleTranslation;
}

/**
 * Параметры запроса главы
 */
export interface GetChapterParams {
  book: BibleBook;
  chapter: number;
  translation?: BibleTranslation;
}

/**
 * Параметры запроса диапазона стихов
 */
export interface GetVerseRangeParams {
  book: BibleBook;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  translation?: BibleTranslation;
}

/**
 * Базовый URL API
 */
const API_BASE_URL = 'https://justbible.ru/api/bible';

/**
 * Перевод по умолчанию
 */
const DEFAULT_TRANSLATION = BibleTranslation.RST;

/**
 * Получить один стих из Библии
 * 
 * @example
 * const verse = await getVerse({
 *   book: BibleBook.John,
 *   chapter: 3,
 *   verse: 16,
 *   translation: BibleTranslation.RST
 * });
 */
export async function getVerse(params: GetVerseParams): Promise<string> {
  const { book, chapter, verse, translation = DEFAULT_TRANSLATION } = params;

  try {
    const response = await axios.get<BibleVerseResponse>(API_BASE_URL, {
      params: {
        translation,
        book: book.toString(),
        chapter: chapter.toString(),
        verse: verse.toString(),
      },
    });

    // API возвращает текст стиха с номером в качестве ключа
    const verseText = response.data[verse.toString()];

    if (!verseText || typeof verseText !== 'string') {
      throw new Error(`Стих ${verse} не найден в ответе API`);
    }

    return verseText;
  } catch (error) {
    console.error('Ошибка при получении стиха:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить стих: ${error.message}`);
    }
    throw new Error(`Не удалось получить стих: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Получить всю главу из Библии
 * 
 * @example
 * const chapter = await getChapter({
 *   book: BibleBook.Psalms,
 *   chapter: 23,
 *   translation: BibleTranslation.RBO
 * });
 */
export async function getChapter(params: GetChapterParams): Promise<Record<number, string>> {
  const { book, chapter, translation = DEFAULT_TRANSLATION } = params;

  try {
    const response = await axios.get<BibleChapterResponse>(API_BASE_URL, {
      params: {
        translation,
        book: book.toString(),
        chapter: chapter.toString(),
      },
    });

    // Извлекаем стихи (исключаем поле info)
    const verses: Record<number, string> = {};
    
    for (const [key, value] of Object.entries(response.data)) {
      if (key !== 'info' && typeof value === 'string') {
        verses[parseInt(key)] = value;
      }
    }

    return verses;
  } catch (error) {
    console.error('Ошибка при получении главы:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить главу: ${error.message}`);
    }
    throw new Error(`Не удалось получить главу: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Получить диапазон стихов из одной главы
 * 
 * @example
 * const verses = await getVerseRange({
 *   book: BibleBook.Genesis,
 *   chapter: 1,
 *   verseStart: 1,
 *   verseEnd: 3,
 *   translation: BibleTranslation.NRT
 * });
 */
export async function getVerseRange(params: GetVerseRangeParams): Promise<Record<number, string>> {
  const { book, chapter, verseStart, verseEnd, translation = DEFAULT_TRANSLATION } = params;

  // Получаем всю главу
  const allVerses = await getChapter({ book, chapter, translation });

  // Фильтруем нужный диапазон
  const rangeVerses: Record<number, string> = {};
  
  for (let verseNum = verseStart; verseNum <= verseEnd; verseNum++) {
    if (allVerses[verseNum]) {
      rangeVerses[verseNum] = allVerses[verseNum];
    }
  }

  return rangeVerses;
}

/**
 * Получить несколько стихов и объединить их в один текст
 * 
 * @example
 * const text = await getVerseRangeText({
 *   book: BibleBook.Romans,
 *   chapter: 8,
 *   verseStart: 28,
 *   verseEnd: 30,
 *   translation: BibleTranslation.RST
 * });
 */
export async function getVerseRangeText(params: GetVerseRangeParams): Promise<string> {
  const verses = await getVerseRange(params);
  
  // Объединяем стихи в один текст
  return Object.entries(verses)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([_, text]) => text)
    .join(' ');
}

/**
 * Получить информацию о переводе
 */
export function getTranslationInfo(translation: BibleTranslation): TranslationInfo {
  return BIBLE_TRANSLATIONS[translation];
}

/**
 * Получить все доступные переводы
 */
export function getAllTranslations(): TranslationInfo[] {
  return Object.values(BIBLE_TRANSLATIONS);
}

/**
 * Проверить доступность API
 */
export async function checkApiAvailability(): Promise<boolean> {
  try {
    // Пробуем получить первый стих Бытия
    await getVerse({
      book: BibleBook.Genesis,
      chapter: 1,
      verse: 1,
      translation: BibleTranslation.RST,
    });
    return true;
  } catch (error) {
    console.error('API недоступен:', error);
    return false;
  }
}

/**
 * Кэш для хранения запросов (опционально, для оптимизации)
 */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 час

/**
 * Получить стих с кэшированием
 */
export async function getVerseCached(params: GetVerseParams): Promise<string> {
  const cacheKey = `${params.translation}-${params.book}-${params.chapter}-${params.verse}`;
  
  // Проверяем кэш
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Запрашиваем данные
  const data = await getVerse(params);
  
  // Сохраняем в кэш
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}

/**
 * Очистить кэш
 */
export function clearCache(): void {
  cache.clear();
}

