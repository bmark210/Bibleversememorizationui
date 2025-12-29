'use client';

import axios from 'axios';
import { BibleBook } from '../types/bible';

const BOLLS_API_BASE_URL = 'https://bolls.life';
const BOLLS_API_V2_URL = `${BOLLS_API_BASE_URL}/v2`;
const BOLLS_TRANSLATIONS_PROXY = '/api/bolls/translations';

/** Перевод по умолчанию (русский синодальный) */
export const DEFAULT_BOLLS_TRANSLATION = 'SYNOD';

/** Информация о доступном переводе */
export interface BollsTranslationInfo {
  short_name: string;
  full_name: string;
  updated: number;
  dir?: 'rtl' | 'ltr';
  language?: string;
}

/** Информация о книге перевода */
export interface BollsBookInfo {
  bookid: number;
  chronorder: number;
  name: string;
  chapters: number;
}

/** Данные по стиху/результату поиска */
export interface BollsVerse {
  pk: number;
  translation: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
  comment?: string;
}

/** Параметры поиска */
export interface BollsSearchParams {
  translation?: string;
  query: string;
  matchCase?: boolean;
  matchWhole?: boolean;
  page?: number;
  limit?: number;
  /** Можно передать номер книги либо ot/nt для фильтрации по завету */
  book?: BibleBook | 'ot' | 'nt';
}

export interface BollsSearchResponse {
  exact_matches: number;
  total: number;
  results: BollsVerse[];
}

/** Запрос на выборку произвольных стихов */
export interface BollsAnyVerseRequest {
  translation?: string;
  book: BibleBook;
  chapter: number;
  verses: number[];
}

export type BollsAnyVerseResponse = BollsVerse[][];

/** Параметры для сравнения стихов в разных переводах */
export interface BollsParallelVersesParams {
  translations: string[];
  book: BibleBook;
  chapter: number;
  verses: number[];
}

export type BollsParallelVersesResponse = BollsVerse[][];

/**
 * Получить список доступных переводов
 * Источник: https://bolls.life/static/bolls/app/views/languages.json
 */
export async function getBollsTranslations(): Promise<BollsTranslationInfo[]> {
  try {
    const { data } = await axios.get<BollsTranslationInfo[]>(
      BOLLS_TRANSLATIONS_PROXY
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении списка переводов Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить переводы: ${error.message}`);
    }
    throw new Error(
      `Не удалось получить переводы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Получить список книг для перевода
 * Источник: https://bolls.life/get-books/<translation>/
 */
export async function getBollsBooks(translation = DEFAULT_BOLLS_TRANSLATION): Promise<BollsBookInfo[]> {
  try {
    const { data } = await axios.get<BollsBookInfo[]>(
      `${BOLLS_API_BASE_URL}/get-books/${translation}/`
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении списка книг Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить книги: ${error.message}`);
    }
    throw new Error(
      `Не удалось получить книги: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Получить главу (можно с комментариями)
 * https://bolls.life/get-text/<translation>/<book>/<chapter>/
 * https://bolls.life/get-chapter/<translation>/<book>/<chapter>/ (с комментариями)
 */
export async function getBollsChapter(params: {
  translation?: string;
  book: BibleBook;
  chapter: number;
  withComments?: boolean;
}): Promise<BollsVerse[]> {
  const { translation = DEFAULT_BOLLS_TRANSLATION, book, chapter, withComments = false } = params;

  try {
    const endpoint = withComments ? 'get-chapter' : 'get-text';
    const { data } = await axios.get<BollsVerse[]>(
      `${BOLLS_API_BASE_URL}/${endpoint}/${translation}/${Number(book)}/${chapter}/`
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении главы Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить главу: ${error.message}`);
    }
    throw new Error(
      `Не удалось получить главу: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Получить один стих
 * https://bolls.life/get-verse/<translation>/<book>/<chapter>/<verse>/
 */
export async function getBollsVerse(params: {
  translation?: string;
  book: BibleBook;
  chapter: number;
  verse: number;
}): Promise<BollsVerse> {
  const { translation = DEFAULT_BOLLS_TRANSLATION, book, chapter, verse } = params;

  try {
    const { data } = await axios.get<BollsVerse>(
      `${BOLLS_API_BASE_URL}/get-verse/${translation}/${Number(book)}/${chapter}/${verse}/`
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении стиха Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить стих: ${error.message}`);
    }
    throw new Error(
      `Не удалось получить стих: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Найти стихи по строке
 * https://bolls.life/v2/find/<translation>?search=...&match_case=...&match_whole=...&page=...&limit=...
 */
export async function searchBollsVerses(params: BollsSearchParams): Promise<BollsSearchResponse> {
  const {
    translation = DEFAULT_BOLLS_TRANSLATION,
    query,
    matchCase = false,
    matchWhole = false,
    page = 1,
    limit = 20,
    book,
  } = params;

  try {
    const { data } = await axios.get<BollsSearchResponse>(
      `${BOLLS_API_V2_URL}/find/${translation}`,
      {
        params: {
          search: query,
          match_case: matchCase,
          match_whole: matchWhole,
          book,
          page,
          limit,
        },
      }
    );
    return data;
  } catch (error) {
    console.error('Ошибка при поиске по Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось выполнить поиск: ${error.message}`);
    }
    throw new Error(
      `Не удалось выполнить поиск: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Получить набор произвольных стихов из разных мест
 * POST https://bolls.life/get-verses/
 */
export async function getBollsVersesBatch(requests: BollsAnyVerseRequest[]): Promise<BollsAnyVerseResponse> {
  try {
    const payload = requests.map((item) => ({
      translation: item.translation ?? DEFAULT_BOLLS_TRANSLATION,
      book: Number(item.book),
      chapter: item.chapter,
      verses: item.verses,
    }));

    const { data } = await axios.post<BollsAnyVerseResponse>(
      `${BOLLS_API_BASE_URL}/get-verses/`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении набора стихов Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить стихи: ${error.message}`);
    }
    throw new Error(
      `Не удалось получить стихи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Получить стихи для сравнения в нескольких переводах
 * POST https://bolls.life/get-parallel-verses/
 */
export async function getBollsParallelVerses(
  params: BollsParallelVersesParams
): Promise<BollsParallelVersesResponse> {
  const { translations, book, chapter, verses } = params;

  try {
    const { data } = await axios.post<BollsParallelVersesResponse>(
      `${BOLLS_API_BASE_URL}/get-parallel-verses/`,
      {
        translations,
        verses,
        book: Number(book),
        chapter,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении параллельных стихов Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить параллельные стихи: ${error.message}`);
    }
    throw new Error(
      `Не удалось получить параллельные стихи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Получить случайный стих
 * https://bolls.life/get-random-verse/<translation>/
 */
export async function getBollsRandomVerse(
  translation = DEFAULT_BOLLS_TRANSLATION
): Promise<BollsVerse> {
  try {
    const { data } = await axios.get<BollsVerse>(
      `${BOLLS_API_BASE_URL}/get-random-verse/${translation}/`
    );
    return data;
  } catch (error) {
    console.error('Ошибка при получении случайного стиха Bolls:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Не удалось получить случайный стих: ${error.message}`);
    }
    throw new Error(
      `Не удалось получить случайный стих: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

