export const VerseStatus = {
  MY: "MY",
  LEARNING: "LEARNING",
  STOPPED: "STOPPED",
  MASTERED: "MASTERED",
  REVIEW: "REVIEW",
} as const;

export type VerseStatus = (typeof VerseStatus)[keyof typeof VerseStatus];
