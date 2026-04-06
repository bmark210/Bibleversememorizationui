import type { Verse } from "@/app/domain/verse";

export type VerseIdentityRef = {
  id?: string | number | null;
  externalVerseId?: string | null;
};

export type VerseMutablePatch = {
  status?: Verse["status"];
  flow?: Verse["flow"] | null;
  masteryLevel?: number | null;
  repetitions?: number | null;
  reviewLapseStreak?: number | null;
  lastReviewedAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type VersePatchEvent = {
  target: VerseIdentityRef;
  patch: VerseMutablePatch;
};
