import { VerseStatus } from "@/generated/prisma";

export type DisplayVerseStatus = VerseStatus | "REVIEW" | "MASTERED";

export function normalizeDisplayVerseStatus(value: unknown): DisplayVerseStatus {
  if (value === "WAITING" || value === "REVIEW") return "REVIEW";
  if (value === "MASTERED") return "MASTERED";
  if (value === VerseStatus.LEARNING || value === "LEARNING") return VerseStatus.LEARNING;
  if (value === VerseStatus.STOPPED || value === "STOPPED") return VerseStatus.STOPPED;
  return VerseStatus.MY;
}

export function isActiveLearningLikeStatus(status: DisplayVerseStatus): boolean {
  return (
    status === VerseStatus.LEARNING ||
    status === "REVIEW" ||
    status === "MASTERED"
  );
}
