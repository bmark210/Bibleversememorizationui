export interface Verse {
  id: string;
  externalVerseId?: string;
  reference: string;
  text: string;
  translation: string;
  status?: string;
  masteryLevel: number;
  repetitions: number;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  nextReview?: string | null;
  tags: string[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  verseCount: number;
  createdAt: Date;
}
