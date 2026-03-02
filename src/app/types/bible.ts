/**
 * Enum для книг Библии в формате "book-chapter-verse"
 */
export enum BibleBook {
  Genesis = 1,
  Exodus = 2,
  Leviticus = 3,
  Numbers = 4,
  Deuteronomy = 5,
  Joshua = 6,
  Judges = 7,
  Ruth = 8,
  Samuel1 = 9,
  Samuel2 = 10,
  Kings1 = 11,
  Kings2 = 12,
  Chronicles1 = 13,
  Chronicles2 = 14,
  Ezra = 15,
  Nehemiah = 16,
  Esther = 17,
  Job = 18,
  Psalms = 19,
  Proverbs = 20,
  Ecclesiastes = 21,
  SongOfSolomon = 22,
  Isaiah = 23,
  Jeremiah = 24,
  Lamentations = 25,
  Ezekiel = 26,
  Daniel = 27,
  Hosea = 28,
  Joel = 29,
  Amos = 30,
  Obadiah = 31,
  Jonah = 32,
  Micah = 33,
  Nahum = 34,
  Habakkuk = 35,
  Zephaniah = 36,
  Haggai = 37,
  Zechariah = 38,
  Malachi = 39,
  Matthew = 40,
  Mark = 41,
  Luke = 42,
  John = 43,
  Acts = 44,
  Romans = 45,
  Corinthians1 = 46,
  Corinthians2 = 47,
  Galatians = 48,
  Ephesians = 49,
  Philippians = 50,
  Colossians = 51,
  Thessalonians1 = 52,
  Thessalonians2 = 53,
  Timothy1 = 54,
  Timothy2 = 55,
  Titus = 56,
  Philemon = 57,
  Hebrews = 58,
  James = 59,
  Peter1 = 60,
  Peter2 = 61,
  John1 = 62,
  John2 = 63,
  John3 = 64,
  Jude = 65,
  Revelation = 66,
  // Неканонические книги
  Ezra2 = 67,
  Tobit = 68,
  Judith = 69,
  Wisdom = 70,
  Sirach = 71,
  LetterOfJeremiah = 72,
  Baruch = 73,
  Maccabees1 = 74,
  Maccabees2 = 75,
  Maccabees3 = 76,
  Ezra3 = 77,
}

/**
 * Информация о книге Библии
 */
export interface BibleBookInfo {
  id: BibleBook;
  nameRu: string;
  chapters: number;
  chronorder: number;
}

/**
 * Полная информация о всех книгах Библии
 */
export const BIBLE_BOOKS: Record<number, BibleBookInfo> = {
  [BibleBook.Genesis]: { id: BibleBook.Genesis, nameRu: 'Бытие', chapters: 50, chronorder: 1 },
  [BibleBook.Exodus]: { id: BibleBook.Exodus, nameRu: 'Исход', chapters: 40, chronorder: 3 },
  [BibleBook.Leviticus]: { id: BibleBook.Leviticus, nameRu: 'Левит', chapters: 27, chronorder: 4 },
  [BibleBook.Numbers]: { id: BibleBook.Numbers, nameRu: 'Числа', chapters: 36, chronorder: 5 },
  [BibleBook.Deuteronomy]: { id: BibleBook.Deuteronomy, nameRu: 'Второзаконие', chapters: 34, chronorder: 6 },
  [BibleBook.Joshua]: { id: BibleBook.Joshua, nameRu: 'Иисус Навин', chapters: 24, chronorder: 7 },
  [BibleBook.Judges]: { id: BibleBook.Judges, nameRu: 'Книга Судей', chapters: 21, chronorder: 8 },
  [BibleBook.Ruth]: { id: BibleBook.Ruth, nameRu: 'Руфь', chapters: 4, chronorder: 9 },
  [BibleBook.Samuel1]: { id: BibleBook.Samuel1, nameRu: '1-я Царств', chapters: 31, chronorder: 10 },
  [BibleBook.Samuel2]: { id: BibleBook.Samuel2, nameRu: '2-я Царств', chapters: 24, chronorder: 11 },
  [BibleBook.Kings1]: { id: BibleBook.Kings1, nameRu: '3-я Царств', chapters: 22, chronorder: 15 },
  [BibleBook.Kings2]: { id: BibleBook.Kings2, nameRu: '4-я Царств', chapters: 25, chronorder: 28 },
  [BibleBook.Chronicles1]: { id: BibleBook.Chronicles1, nameRu: '1-я Паралипоменон', chapters: 29, chronorder: 12 },
  [BibleBook.Chronicles2]: { id: BibleBook.Chronicles2, nameRu: '2-я Паралипоменон', chapters: 36, chronorder: 16 },
  [BibleBook.Ezra]: { id: BibleBook.Ezra, nameRu: 'Ездра', chapters: 10, chronorder: 37 },
  [BibleBook.Nehemiah]: { id: BibleBook.Nehemiah, nameRu: 'Неемия', chapters: 13, chronorder: 38 },
  [BibleBook.Esther]: { id: BibleBook.Esther, nameRu: 'Есфирь', chapters: 10, chronorder: 36 },
  [BibleBook.Job]: { id: BibleBook.Job, nameRu: 'Иов', chapters: 42, chronorder: 2 },
  [BibleBook.Psalms]: { id: BibleBook.Psalms, nameRu: 'Псалтирь', chapters: 151, chronorder: 13 },
  [BibleBook.Proverbs]: { id: BibleBook.Proverbs, nameRu: 'Притчи', chapters: 31, chronorder: 17 },
  [BibleBook.Ecclesiastes]: { id: BibleBook.Ecclesiastes, nameRu: 'Екклезиаст', chapters: 12, chronorder: 18 },
  [BibleBook.SongOfSolomon]: { id: BibleBook.SongOfSolomon, nameRu: 'Песни Песней', chapters: 8, chronorder: 14 },
  [BibleBook.Isaiah]: { id: BibleBook.Isaiah, nameRu: 'Исаия', chapters: 66, chronorder: 25 },
  [BibleBook.Jeremiah]: { id: BibleBook.Jeremiah, nameRu: 'Иеремия', chapters: 52, chronorder: 29 },
  [BibleBook.Lamentations]: { id: BibleBook.Lamentations, nameRu: 'Плач Иеремии', chapters: 5, chronorder: 30 },
  [BibleBook.Ezekiel]: { id: BibleBook.Ezekiel, nameRu: 'Иезекииль', chapters: 48, chronorder: 32 },
  [BibleBook.Daniel]: { id: BibleBook.Daniel, nameRu: 'Даниил', chapters: 14, chronorder: 33 },
  [BibleBook.Hosea]: { id: BibleBook.Hosea, nameRu: 'Осия', chapters: 14, chronorder: 23 },
  [BibleBook.Joel]: { id: BibleBook.Joel, nameRu: 'Иоиль', chapters: 3, chronorder: 20 },
  [BibleBook.Amos]: { id: BibleBook.Amos, nameRu: 'Амос', chapters: 9, chronorder: 21 },
  [BibleBook.Obadiah]: { id: BibleBook.Obadiah, nameRu: 'Авдий', chapters: 1, chronorder: 31 },
  [BibleBook.Jonah]: { id: BibleBook.Jonah, nameRu: 'Иона', chapters: 4, chronorder: 19 },
  [BibleBook.Micah]: { id: BibleBook.Micah, nameRu: 'Михей', chapters: 7, chronorder: 22 },
  [BibleBook.Nahum]: { id: BibleBook.Nahum, nameRu: 'Наум', chapters: 3, chronorder: 24 },
  [BibleBook.Habakkuk]: { id: BibleBook.Habakkuk, nameRu: 'Аввакум', chapters: 3, chronorder: 27 },
  [BibleBook.Zephaniah]: { id: BibleBook.Zephaniah, nameRu: 'Софония', chapters: 3, chronorder: 26 },
  [BibleBook.Haggai]: { id: BibleBook.Haggai, nameRu: 'Аггей', chapters: 2, chronorder: 34 },
  [BibleBook.Zechariah]: { id: BibleBook.Zechariah, nameRu: 'Захария', chapters: 14, chronorder: 35 },
  [BibleBook.Malachi]: { id: BibleBook.Malachi, nameRu: 'Малахия', chapters: 4, chronorder: 39 },
  [BibleBook.Matthew]: { id: BibleBook.Matthew, nameRu: 'От Матфея', chapters: 28, chronorder: 40 },
  [BibleBook.Mark]: { id: BibleBook.Mark, nameRu: 'От Марка', chapters: 16, chronorder: 58 },
  [BibleBook.Luke]: { id: BibleBook.Luke, nameRu: 'От Луки', chapters: 24, chronorder: 52 },
  [BibleBook.John]: { id: BibleBook.John, nameRu: 'От Иоанна', chapters: 21, chronorder: 66 },
  [BibleBook.Acts]: { id: BibleBook.Acts, nameRu: 'Деяния', chapters: 28, chronorder: 54 },
  [BibleBook.Romans]: { id: BibleBook.Romans, nameRu: 'К Римлянам', chapters: 16, chronorder: 45 },
  [BibleBook.Corinthians1]: { id: BibleBook.Corinthians1, nameRu: '1-е Коринфянам', chapters: 16, chronorder: 44 },
  [BibleBook.Corinthians2]: { id: BibleBook.Corinthians2, nameRu: '2-е Коринфянам', chapters: 13, chronorder: 45 },
  [BibleBook.Galatians]: { id: BibleBook.Galatians, nameRu: 'К Галатам', chapters: 6, chronorder: 41 },
  [BibleBook.Ephesians]: { id: BibleBook.Ephesians, nameRu: 'К Ефесянам', chapters: 6, chronorder: 47 },
  [BibleBook.Philippians]: { id: BibleBook.Philippians, nameRu: 'К Филиппийцам', chapters: 4, chronorder: 49 },
  [BibleBook.Colossians]: { id: BibleBook.Colossians, nameRu: 'К Колоссянам', chapters: 4, chronorder: 50 },
  [BibleBook.Thessalonians1]: { id: BibleBook.Thessalonians1, nameRu: '1-е Фессалоникийцам', chapters: 5, chronorder: 42 },
  [BibleBook.Thessalonians2]: { id: BibleBook.Thessalonians2, nameRu: '2-е Фессалоникийцам', chapters: 3, chronorder: 43 },
  [BibleBook.Timothy1]: { id: BibleBook.Timothy1, nameRu: '1-е Тимофею', chapters: 6, chronorder: 55 },
  [BibleBook.Timothy2]: { id: BibleBook.Timothy2, nameRu: '2-е Тимофею', chapters: 4, chronorder: 59 },
  [BibleBook.Titus]: { id: BibleBook.Titus, nameRu: 'К Титу', chapters: 3, chronorder: 57 },
  [BibleBook.Philemon]: { id: BibleBook.Philemon, nameRu: 'К Филимону', chapters: 1, chronorder: 51 },
  [BibleBook.Hebrews]: { id: BibleBook.Hebrews, nameRu: 'К Евреям', chapters: 13, chronorder: 53 },
  [BibleBook.James]: { id: BibleBook.James, nameRu: 'Иакова', chapters: 5, chronorder: 48 },
  [BibleBook.Peter1]: { id: BibleBook.Peter1, nameRu: '1-е Петра', chapters: 5, chronorder: 56 },
  [BibleBook.Peter2]: { id: BibleBook.Peter2, nameRu: '2-е Петра', chapters: 3, chronorder: 60 },
  [BibleBook.John1]: { id: BibleBook.John1, nameRu: '1-е Иоанна', chapters: 5, chronorder: 61 },
  [BibleBook.John2]: { id: BibleBook.John2, nameRu: '2-е Иоанна', chapters: 1, chronorder: 62 },
  [BibleBook.John3]: { id: BibleBook.John3, nameRu: '3-е Иоанна', chapters: 1, chronorder: 63 },
  [BibleBook.Jude]: { id: BibleBook.Jude, nameRu: 'Иуда', chapters: 1, chronorder: 64 },
  [BibleBook.Revelation]: { id: BibleBook.Revelation, nameRu: 'Откровение', chapters: 22, chronorder: 66 },
  [BibleBook.Ezra2]: { id: BibleBook.Ezra2, nameRu: '2 кн. Ездры', chapters: 9, chronorder: 67 },
  [BibleBook.Tobit]: { id: BibleBook.Tobit, nameRu: 'Товит', chapters: 14, chronorder: 68 },
  [BibleBook.Judith]: { id: BibleBook.Judith, nameRu: 'Иудифь', chapters: 16, chronorder: 69 },
  [BibleBook.Wisdom]: { id: BibleBook.Wisdom, nameRu: 'Премудрость Соломона', chapters: 19, chronorder: 70 },
  [BibleBook.Sirach]: { id: BibleBook.Sirach, nameRu: 'Сирах', chapters: 51, chronorder: 71 },
  [BibleBook.LetterOfJeremiah]: { id: BibleBook.LetterOfJeremiah, nameRu: 'Послание Иеремии', chapters: 1, chronorder: 72 },
  [BibleBook.Baruch]: { id: BibleBook.Baruch, nameRu: 'Варух', chapters: 5, chronorder: 73 },
  [BibleBook.Maccabees1]: { id: BibleBook.Maccabees1, nameRu: '1 кн. Маккавейская', chapters: 16, chronorder: 74 },
  [BibleBook.Maccabees2]: { id: BibleBook.Maccabees2, nameRu: '2 кн. Маккавейская', chapters: 15, chronorder: 75 },
  [BibleBook.Maccabees3]: { id: BibleBook.Maccabees3, nameRu: '3 кн. Маккавейская', chapters: 7, chronorder: 76 },
  [BibleBook.Ezra3]: { id: BibleBook.Ezra3, nameRu: '3 кн. Ездры', chapters: 16, chronorder: 77 },
};

/**
 * Интерфейсы Bible API
 */

export interface BibleApiVerse {
  pk: number;
  translation: string;
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleApiTranslation {
  short_name: string;
  full_name: string;
  updated: number;
}

export interface BibleApiBook {
  bookid: number;
  chronorder: number;
  name: string;
  chapters: number;
}

/**
 * Вспомогательные функции
 */

export function getBibleBookInfo(bookId: number): BibleBookInfo | undefined {
  return BIBLE_BOOKS[bookId];
}

export function getBibleBookNameRu(bookId: number): string {
  return BIBLE_BOOKS[bookId]?.nameRu || 'Неизвестная книга';
}

export function getAllBibleBooks(): BibleBookInfo[] {
  return Object.values(BIBLE_BOOKS).sort((a, b) => a.chronorder - b.chronorder);
}

export function formatVerseReference(
  bookId: number,
  chapter: number,
  verse: number
): string {
  const bookName = getBibleBookNameRu(bookId);
  return `${bookName} ${chapter}:${verse}`;
}
