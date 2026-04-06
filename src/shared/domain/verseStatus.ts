export const VerseStatus = {
  MY: "MY",
  QUEUE: "QUEUE",
  LEARNING: "LEARNING",
  STOPPED: "STOPPED",
} as const;

export type VerseStatus = (typeof VerseStatus)[keyof typeof VerseStatus];

export const VerseDisplayStatus = {
  CATALOG: "CATALOG",
  MY: VerseStatus.MY,
  QUEUE: VerseStatus.QUEUE,
  LEARNING: VerseStatus.LEARNING,
  REVIEW: "REVIEW",
  MASTERED: "MASTERED",
  STOPPED: VerseStatus.STOPPED,
} as const;

export type VerseDisplayStatus =
  (typeof VerseDisplayStatus)[keyof typeof VerseDisplayStatus];

export function normalizeDisplayVerseStatus(
  value: unknown,
): VerseDisplayStatus {
  if (value === VerseDisplayStatus.CATALOG) return VerseDisplayStatus.CATALOG;
  if (value === "WAITING" || value === VerseDisplayStatus.REVIEW) {
    return VerseDisplayStatus.REVIEW;
  }
  if (value === VerseDisplayStatus.MASTERED) {
    return VerseDisplayStatus.MASTERED;
  }
  if (value === VerseStatus.LEARNING || value === "LEARNING") {
    return VerseDisplayStatus.LEARNING;
  }
  if (value === VerseStatus.STOPPED || value === "STOPPED") {
    return VerseDisplayStatus.STOPPED;
  }
  if (value === VerseStatus.QUEUE || value === "QUEUE") {
    return VerseDisplayStatus.QUEUE;
  }
  return VerseDisplayStatus.MY;
}

export function isActiveLearningLikeStatus(
  status: VerseDisplayStatus,
): boolean {
  return (
    status === VerseDisplayStatus.LEARNING ||
    status === VerseDisplayStatus.REVIEW ||
    status === VerseDisplayStatus.MASTERED
  );
}
