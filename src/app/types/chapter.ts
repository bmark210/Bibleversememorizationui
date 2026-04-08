export type ChapterProgressItem = {
  chapterNo: number;
  /** Verse count in the global catalog for this chapter */
  totalCatalog: number;
  /** How many verses the user has added (any non-deleted status) */
  userVerseCount: number;
  learningCount: number;
  reviewCount: number;
  masteredCount: number;
  stoppedCount: number;
  queueCount: number;
};

export type ChapterProgressResponse = {
  bookId: number;
  items: ChapterProgressItem[];
};

/** Identifies a specific Bible chapter for filtering/training. */
export type ChapterFilter = {
  bookId: number;
  chapterNo: number;
} | null;
