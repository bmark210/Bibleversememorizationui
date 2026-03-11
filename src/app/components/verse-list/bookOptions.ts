import { BibleBook, BIBLE_BOOKS } from '@/app/types/bible';

export type VerseListBookOption = {
  id: number;
  label: string;
  shortLabel: string;
  testament: 'old' | 'new';
};

const BOOK_SHORT_LABELS: Record<number, string> = {
  1: 'Быт',
  2: 'Исх',
  3: 'Лев',
  4: 'Чис',
  5: 'Втор',
  6: 'Нав',
  7: 'Суд',
  8: 'Руф',
  9: '1 Цар',
  10: '2 Цар',
  11: '3 Цар',
  12: '4 Цар',
  13: '1 Пар',
  14: '2 Пар',
  15: 'Езд',
  16: 'Неем',
  17: 'Есф',
  18: 'Иов',
  19: 'Пс',
  20: 'Притч',
  21: 'Еккл',
  22: 'Песн',
  23: 'Ис',
  24: 'Иер',
  25: 'Плач',
  26: 'Иез',
  27: 'Дан',
  28: 'Ос',
  29: 'Иоил',
  30: 'Ам',
  31: 'Авд',
  32: 'Ион',
  33: 'Мих',
  34: 'Наум',
  35: 'Авв',
  36: 'Соф',
  37: 'Агг',
  38: 'Зах',
  39: 'Мал',
  40: 'Мат',
  41: 'Марк',
  42: 'Лук',
  43: 'Ин',
  44: 'Деян',
  45: 'Рим',
  46: '1 Кор',
  47: '2 Кор',
  48: 'Гал',
  49: 'Еф',
  50: 'Флп',
  51: 'Кол',
  52: '1 Фес',
  53: '2 Фес',
  54: '1 Тим',
  55: '2 Тим',
  56: 'Тит',
  57: 'Флм',
  58: 'Евр',
  59: 'Иак',
  60: '1 Пет',
  61: '2 Пет',
  62: '1 Ин',
  63: '2 Ин',
  64: '3 Ин',
  65: 'Иуд',
  66: 'Откр',
};

export const VERSE_LIST_BOOK_OPTIONS: VerseListBookOption[] = Object.values(BIBLE_BOOKS)
  .filter((book) => book.id <= BibleBook.Revelation)
  .sort((a, b) => a.id - b.id)
  .map((book) => ({
    id: book.id,
    label: book.nameRu,
    shortLabel: BOOK_SHORT_LABELS[book.id] ?? book.nameRu,
    testament: book.id <= 39 ? 'old' : 'new',
  }));
