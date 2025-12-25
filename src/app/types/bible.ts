/**
 * Enum для книг Библии
 */
export enum BibleBook {
  // Ветхий Завет
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
  // Новый Завет
  Matthew = 40,
  Mark = 41,
  Luke = 42,
  John = 43,
  Acts = 44,
  James = 45,
  Peter1 = 46,
  Peter2 = 47,
  John1 = 48,
  John2 = 49,
  John3 = 50,
  Jude = 51,
  Romans = 52,
  Corinthians1 = 53,
  Corinthians2 = 54,
  Galatians = 55,
  Ephesians = 56,
  Philippians = 57,
  Colossians = 58,
  Thessalonians1 = 59,
  Thessalonians2 = 60,
  Timothy1 = 61,
  Timothy2 = 62,
  Titus = 63,
  Philemon = 64,
  Hebrews = 65,
  Revelation = 66,
}

/**
 * Завет (Ветхий или Новый)
 */
export enum Testament {
  Old = 'old',
  New = 'new',
}

/**
 * Информация о книге Библии
 */
export interface BibleBookInfo {
  id: BibleBook;
  nameRu: string;
  nameEn: string;
  testament: Testament;
  abbrevRu?: string;
  abbrevEn?: string;
}

/**
 * Полная информация о всех книгах Библии
 */
export const BIBLE_BOOKS: Record<BibleBook, BibleBookInfo> = {
  [BibleBook.Genesis]: { id: BibleBook.Genesis, nameRu: 'Бытие', nameEn: 'Genesis', testament: Testament.Old, abbrevRu: 'Быт', abbrevEn: 'Gen' },
  [BibleBook.Exodus]: { id: BibleBook.Exodus, nameRu: 'Исход', nameEn: 'Exodus', testament: Testament.Old, abbrevRu: 'Исх', abbrevEn: 'Exo' },
  [BibleBook.Leviticus]: { id: BibleBook.Leviticus, nameRu: 'Левит', nameEn: 'Leviticus', testament: Testament.Old, abbrevRu: 'Лев', abbrevEn: 'Lev' },
  [BibleBook.Numbers]: { id: BibleBook.Numbers, nameRu: 'Числа', nameEn: 'Numbers', testament: Testament.Old, abbrevRu: 'Чис', abbrevEn: 'Num' },
  [BibleBook.Deuteronomy]: { id: BibleBook.Deuteronomy, nameRu: 'Второзаконие', nameEn: 'Deuteronomy', testament: Testament.Old, abbrevRu: 'Втор', abbrevEn: 'Deu' },
  [BibleBook.Joshua]: { id: BibleBook.Joshua, nameRu: 'Иисус Навин', nameEn: 'Joshua', testament: Testament.Old, abbrevRu: 'Нав', abbrevEn: 'Jos' },
  [BibleBook.Judges]: { id: BibleBook.Judges, nameRu: 'Судьи', nameEn: 'Judges', testament: Testament.Old, abbrevRu: 'Суд', abbrevEn: 'Jdg' },
  [BibleBook.Ruth]: { id: BibleBook.Ruth, nameRu: 'Руфь', nameEn: 'Ruth', testament: Testament.Old, abbrevRu: 'Руф', abbrevEn: 'Rut' },
  [BibleBook.Samuel1]: { id: BibleBook.Samuel1, nameRu: '1 Царств', nameEn: '1 Samuel', testament: Testament.Old, abbrevRu: '1Цар', abbrevEn: '1Sa' },
  [BibleBook.Samuel2]: { id: BibleBook.Samuel2, nameRu: '2 Царств', nameEn: '2 Samuel', testament: Testament.Old, abbrevRu: '2Цар', abbrevEn: '2Sa' },
  [BibleBook.Kings1]: { id: BibleBook.Kings1, nameRu: '3 Царств', nameEn: '1 Kings', testament: Testament.Old, abbrevRu: '3Цар', abbrevEn: '1Ki' },
  [BibleBook.Kings2]: { id: BibleBook.Kings2, nameRu: '4 Царств', nameEn: '2 Kings', testament: Testament.Old, abbrevRu: '4Цар', abbrevEn: '2Ki' },
  [BibleBook.Chronicles1]: { id: BibleBook.Chronicles1, nameRu: '1 Паралипоменон', nameEn: '1 Chronicles', testament: Testament.Old, abbrevRu: '1Пар', abbrevEn: '1Ch' },
  [BibleBook.Chronicles2]: { id: BibleBook.Chronicles2, nameRu: '2 Паралипоменон', nameEn: '2 Chronicles', testament: Testament.Old, abbrevRu: '2Пар', abbrevEn: '2Ch' },
  [BibleBook.Ezra]: { id: BibleBook.Ezra, nameRu: 'Ездра', nameEn: 'Ezra', testament: Testament.Old, abbrevRu: 'Езд', abbrevEn: 'Ezr' },
  [BibleBook.Nehemiah]: { id: BibleBook.Nehemiah, nameRu: 'Неемия', nameEn: 'Nehemiah', testament: Testament.Old, abbrevRu: 'Неем', abbrevEn: 'Neh' },
  [BibleBook.Esther]: { id: BibleBook.Esther, nameRu: 'Есфирь', nameEn: 'Esther', testament: Testament.Old, abbrevRu: 'Есф', abbrevEn: 'Est' },
  [BibleBook.Job]: { id: BibleBook.Job, nameRu: 'Иов', nameEn: 'Job', testament: Testament.Old, abbrevRu: 'Иов', abbrevEn: 'Job' },
  [BibleBook.Psalms]: { id: BibleBook.Psalms, nameRu: 'Псалмы', nameEn: 'Psalms', testament: Testament.Old, abbrevRu: 'Пс', abbrevEn: 'Psa' },
  [BibleBook.Proverbs]: { id: BibleBook.Proverbs, nameRu: 'Притчи', nameEn: 'Proverbs', testament: Testament.Old, abbrevRu: 'Прит', abbrevEn: 'Pro' },
  [BibleBook.Ecclesiastes]: { id: BibleBook.Ecclesiastes, nameRu: 'Екклезиаст', nameEn: 'Ecclesiastes', testament: Testament.Old, abbrevRu: 'Еккл', abbrevEn: 'Ecc' },
  [BibleBook.SongOfSolomon]: { id: BibleBook.SongOfSolomon, nameRu: 'Песнь песней', nameEn: 'Song of Solomon', testament: Testament.Old, abbrevRu: 'Песн', abbrevEn: 'Sng' },
  [BibleBook.Isaiah]: { id: BibleBook.Isaiah, nameRu: 'Исаия', nameEn: 'Isaiah', testament: Testament.Old, abbrevRu: 'Ис', abbrevEn: 'Isa' },
  [BibleBook.Jeremiah]: { id: BibleBook.Jeremiah, nameRu: 'Иеремия', nameEn: 'Jeremiah', testament: Testament.Old, abbrevRu: 'Иер', abbrevEn: 'Jer' },
  [BibleBook.Lamentations]: { id: BibleBook.Lamentations, nameRu: 'Плач Иеремии', nameEn: 'Lamentations', testament: Testament.Old, abbrevRu: 'Плач', abbrevEn: 'Lam' },
  [BibleBook.Ezekiel]: { id: BibleBook.Ezekiel, nameRu: 'Иезекииль', nameEn: 'Ezekiel', testament: Testament.Old, abbrevRu: 'Иез', abbrevEn: 'Eze' },
  [BibleBook.Daniel]: { id: BibleBook.Daniel, nameRu: 'Даниил', nameEn: 'Daniel', testament: Testament.Old, abbrevRu: 'Дан', abbrevEn: 'Dan' },
  [BibleBook.Hosea]: { id: BibleBook.Hosea, nameRu: 'Осия', nameEn: 'Hosea', testament: Testament.Old, abbrevRu: 'Ос', abbrevEn: 'Hos' },
  [BibleBook.Joel]: { id: BibleBook.Joel, nameRu: 'Иоиль', nameEn: 'Joel', testament: Testament.Old, abbrevRu: 'Иоил', abbrevEn: 'Joe' },
  [BibleBook.Amos]: { id: BibleBook.Amos, nameRu: 'Амос', nameEn: 'Amos', testament: Testament.Old, abbrevRu: 'Ам', abbrevEn: 'Amo' },
  [BibleBook.Obadiah]: { id: BibleBook.Obadiah, nameRu: 'Авдий', nameEn: 'Obadiah', testament: Testament.Old, abbrevRu: 'Авд', abbrevEn: 'Oba' },
  [BibleBook.Jonah]: { id: BibleBook.Jonah, nameRu: 'Иона', nameEn: 'Jonah', testament: Testament.Old, abbrevRu: 'Иона', abbrevEn: 'Jon' },
  [BibleBook.Micah]: { id: BibleBook.Micah, nameRu: 'Михей', nameEn: 'Micah', testament: Testament.Old, abbrevRu: 'Мих', abbrevEn: 'Mic' },
  [BibleBook.Nahum]: { id: BibleBook.Nahum, nameRu: 'Наум', nameEn: 'Nahum', testament: Testament.Old, abbrevRu: 'Наум', abbrevEn: 'Nah' },
  [BibleBook.Habakkuk]: { id: BibleBook.Habakkuk, nameRu: 'Аввакум', nameEn: 'Habakkuk', testament: Testament.Old, abbrevRu: 'Авв', abbrevEn: 'Hab' },
  [BibleBook.Zephaniah]: { id: BibleBook.Zephaniah, nameRu: 'Софония', nameEn: 'Zephaniah', testament: Testament.Old, abbrevRu: 'Соф', abbrevEn: 'Zep' },
  [BibleBook.Haggai]: { id: BibleBook.Haggai, nameRu: 'Аггей', nameEn: 'Haggai', testament: Testament.Old, abbrevRu: 'Агг', abbrevEn: 'Hag' },
  [BibleBook.Zechariah]: { id: BibleBook.Zechariah, nameRu: 'Захария', nameEn: 'Zechariah', testament: Testament.Old, abbrevRu: 'Зах', abbrevEn: 'Zec' },
  [BibleBook.Malachi]: { id: BibleBook.Malachi, nameRu: 'Малахия', nameEn: 'Malachi', testament: Testament.Old, abbrevRu: 'Мал', abbrevEn: 'Mal' },
  [BibleBook.Matthew]: { id: BibleBook.Matthew, nameRu: 'Матфей', nameEn: 'Matthew', testament: Testament.New, abbrevRu: 'Мф', abbrevEn: 'Mat' },
  [BibleBook.Mark]: { id: BibleBook.Mark, nameRu: 'Марк', nameEn: 'Mark', testament: Testament.New, abbrevRu: 'Мк', abbrevEn: 'Mrk' },
  [BibleBook.Luke]: { id: BibleBook.Luke, nameRu: 'Лука', nameEn: 'Luke', testament: Testament.New, abbrevRu: 'Лк', abbrevEn: 'Luk' },
  [BibleBook.John]: { id: BibleBook.John, nameRu: 'Иоанн', nameEn: 'John', testament: Testament.New, abbrevRu: 'Ин', abbrevEn: 'Jhn' },
  [BibleBook.Acts]: { id: BibleBook.Acts, nameRu: 'Деяния', nameEn: 'Acts', testament: Testament.New, abbrevRu: 'Деян', abbrevEn: 'Act' },
  [BibleBook.James]: { id: BibleBook.James, nameRu: 'Иакова', nameEn: 'James', testament: Testament.New, abbrevRu: 'Иак', abbrevEn: 'Jas' },
  [BibleBook.Peter1]: { id: BibleBook.Peter1, nameRu: '1 Петра', nameEn: '1 Peter', testament: Testament.New, abbrevRu: '1Пет', abbrevEn: '1Pe' },
  [BibleBook.Peter2]: { id: BibleBook.Peter2, nameRu: '2 Петра', nameEn: '2 Peter', testament: Testament.New, abbrevRu: '2Пет', abbrevEn: '2Pe' },
  [BibleBook.John1]: { id: BibleBook.John1, nameRu: '1 Иоанна', nameEn: '1 John', testament: Testament.New, abbrevRu: '1Ин', abbrevEn: '1Jn' },
  [BibleBook.John2]: { id: BibleBook.John2, nameRu: '2 Иоанна', nameEn: '2 John', testament: Testament.New, abbrevRu: '2Ин', abbrevEn: '2Jn' },
  [BibleBook.John3]: { id: BibleBook.John3, nameRu: '3 Иоанна', nameEn: '3 John', testament: Testament.New, abbrevRu: '3Ин', abbrevEn: '3Jn' },
  [BibleBook.Jude]: { id: BibleBook.Jude, nameRu: 'Иуда', nameEn: 'Jude', testament: Testament.New, abbrevRu: 'Иуд', abbrevEn: 'Jud' },
  [BibleBook.Romans]: { id: BibleBook.Romans, nameRu: 'Римлянам', nameEn: 'Romans', testament: Testament.New, abbrevRu: 'Рим', abbrevEn: 'Rom' },
  [BibleBook.Corinthians1]: { id: BibleBook.Corinthians1, nameRu: '1 Коринфянам', nameEn: '1 Corinthians', testament: Testament.New, abbrevRu: '1Кор', abbrevEn: '1Co' },
  [BibleBook.Corinthians2]: { id: BibleBook.Corinthians2, nameRu: '2 Коринфянам', nameEn: '2 Corinthians', testament: Testament.New, abbrevRu: '2Кор', abbrevEn: '2Co' },
  [BibleBook.Galatians]: { id: BibleBook.Galatians, nameRu: 'Галатам', nameEn: 'Galatians', testament: Testament.New, abbrevRu: 'Гал', abbrevEn: 'Gal' },
  [BibleBook.Ephesians]: { id: BibleBook.Ephesians, nameRu: 'Ефесянам', nameEn: 'Ephesians', testament: Testament.New, abbrevRu: 'Еф', abbrevEn: 'Eph' },
  [BibleBook.Philippians]: { id: BibleBook.Philippians, nameRu: 'Филиппийцам', nameEn: 'Philippians', testament: Testament.New, abbrevRu: 'Флп', abbrevEn: 'Php' },
  [BibleBook.Colossians]: { id: BibleBook.Colossians, nameRu: 'Колоссянам', nameEn: 'Colossians', testament: Testament.New, abbrevRu: 'Кол', abbrevEn: 'Col' },
  [BibleBook.Thessalonians1]: { id: BibleBook.Thessalonians1, nameRu: '1 Фессалоникийцам', nameEn: '1 Thessalonians', testament: Testament.New, abbrevRu: '1Фес', abbrevEn: '1Th' },
  [BibleBook.Thessalonians2]: { id: BibleBook.Thessalonians2, nameRu: '2 Фессалоникийцам', nameEn: '2 Thessalonians', testament: Testament.New, abbrevRu: '2Фес', abbrevEn: '2Th' },
  [BibleBook.Timothy1]: { id: BibleBook.Timothy1, nameRu: '1 Тимофею', nameEn: '1 Timothy', testament: Testament.New, abbrevRu: '1Тим', abbrevEn: '1Ti' },
  [BibleBook.Timothy2]: { id: BibleBook.Timothy2, nameRu: '2 Тимофею', nameEn: '2 Timothy', testament: Testament.New, abbrevRu: '2Тим', abbrevEn: '2Ti' },
  [BibleBook.Titus]: { id: BibleBook.Titus, nameRu: 'Титу', nameEn: 'Titus', testament: Testament.New, abbrevRu: 'Тит', abbrevEn: 'Tit' },
  [BibleBook.Philemon]: { id: BibleBook.Philemon, nameRu: 'Филимону', nameEn: 'Philemon', testament: Testament.New, abbrevRu: 'Флм', abbrevEn: 'Phm' },
  [BibleBook.Hebrews]: { id: BibleBook.Hebrews, nameRu: 'Евреям', nameEn: 'Hebrews', testament: Testament.New, abbrevRu: 'Евр', abbrevEn: 'Heb' },
  [BibleBook.Revelation]: { id: BibleBook.Revelation, nameRu: 'Откровение', nameEn: 'Revelation', testament: Testament.New, abbrevRu: 'Откр', abbrevEn: 'Rev' },
};

/**
 * Вспомогательные функции для работы с книгами Библии
 */

/**
 * Получить информацию о книге по ID
 */
export function getBibleBookInfo(bookId: BibleBook): BibleBookInfo {
  return BIBLE_BOOKS[bookId];
}

/**
 * Получить русское название книги
 */
export function getBibleBookNameRu(bookId: BibleBook): string {
  return BIBLE_BOOKS[bookId].nameRu;
}

/**
 * Получить английское название книги
 */
export function getBibleBookNameEn(bookId: BibleBook): string {
  return BIBLE_BOOKS[bookId].nameEn;
}

/**
 * Получить завет книги
 */
export function getBibleBookTestament(bookId: BibleBook): Testament {
  return BIBLE_BOOKS[bookId].testament;
}

/**
 * Получить все книги Ветхого Завета
 */
export function getOldTestamentBooks(): BibleBookInfo[] {
  return Object.values(BIBLE_BOOKS).filter(book => book.testament === Testament.Old);
}

/**
 * Получить все книги Нового Завета
 */
export function getNewTestamentBooks(): BibleBookInfo[] {
  return Object.values(BIBLE_BOOKS).filter(book => book.testament === Testament.New);
}

/**
 * Получить все книги Библии в порядке следования
 */
export function getAllBibleBooks(): BibleBookInfo[] {
  return Object.values(BIBLE_BOOKS).sort((a, b) => a.id - b.id);
}

/**
 * Найти книгу по русскому названию
 */
export function findBibleBookByNameRu(name: string): BibleBookInfo | undefined {
  const normalizedName = name.trim().toLowerCase();
  return Object.values(BIBLE_BOOKS).find(
    book => book.nameRu.toLowerCase() === normalizedName || book.abbrevRu?.toLowerCase() === normalizedName
  );
}

/**
 * Найти книгу по английскому названию
 */
export function findBibleBookByNameEn(name: string): BibleBookInfo | undefined {
  const normalizedName = name.trim().toLowerCase();
  return Object.values(BIBLE_BOOKS).find(
    book => book.nameEn.toLowerCase() === normalizedName || book.abbrevEn?.toLowerCase() === normalizedName
  );
}

/**
 * Проверить, является ли книга из Ветхого Завета
 */
export function isOldTestament(bookId: BibleBook): boolean {
  return BIBLE_BOOKS[bookId].testament === Testament.Old;
}

/**
 * Проверить, является ли книга из Нового Завета
 */
export function isNewTestament(bookId: BibleBook): boolean {
  return BIBLE_BOOKS[bookId].testament === Testament.New;
}

/**
 * Форматировать ссылку на стих (например: "Бытие 1:1" или "Genesis 1:1")
 */
export function formatVerseReference(
  bookId: BibleBook,
  chapter: number,
  verse: number,
  language: 'ru' | 'en' = 'ru'
): string {
  const bookName = language === 'ru' ? getBibleBookNameRu(bookId) : getBibleBookNameEn(bookId);
  return `${bookName} ${chapter}:${verse}`;
}

/**
 * Форматировать ссылку на диапазон стихов (например: "Бытие 1:1-3")
 */
export function formatVerseRangeReference(
  bookId: BibleBook,
  chapter: number,
  verseStart: number,
  verseEnd: number,
  language: 'ru' | 'en' = 'ru'
): string {
  const bookName = language === 'ru' ? getBibleBookNameRu(bookId) : getBibleBookNameEn(bookId);
  return `${bookName} ${chapter}:${verseStart}-${verseEnd}`;
}

