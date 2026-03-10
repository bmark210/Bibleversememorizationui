export const VerseStatus = {
  MY: "MY",
  LEARNING: "LEARNING",
  STOPPED: "STOPPED",
} as const;

export type VerseStatus = (typeof VerseStatus)[keyof typeof VerseStatus];
