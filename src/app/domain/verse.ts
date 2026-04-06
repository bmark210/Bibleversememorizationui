import {
  getDisplayStatusFromFlow,
  normalizeVerseFlow,
  type VerseFlow,
} from "@/shared/domain/verseFlow";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import {
  coerceVerseDifficultyLevel,
  getDifficultyLevelByLetters,
  type VerseDifficultyLevel,
} from "@/shared/verses/difficulty";
import { resolveVerseState } from "@/shared/verseRules";

/** Frontend verse model — matches the VerseCardDto shape returned by the API. */
export type Verse = {
  id?: string | number;
  externalVerseId: string;
  difficultyLevel: VerseDifficultyLevel;
  status: DisplayVerseStatus;
  flow?: VerseFlow | null;
  masteryLevel: number;
  repetitions: number;
  reviewLapseStreak?: number;
  referenceScore?: number;
  incipitScore?: number;
  contextScore?: number;
  lastTrainingModeId?: number | null;
  lastReviewedAt: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  translation?: string;
  nextReview?: string | null;
  nextReviewAt: string | null;
  tags?: Array<{ id: string; slug: string; title: string }>;
  popularityScope?: "friends" | "players" | "self";
  popularityValue?: number;
  popularityPreviewUsers?: Array<{
    telegramId: string;
    name: string;
    avatarUrl: string | null;
  }>;
  text: string;
  reference: string;
  contextPromptText?: string;
  contextPromptReference?: string;
  queuePosition?: number | null;
};

export type AppVerseApiRecord = {
  id?: string | number | null;
  externalVerseId?: string | number | null;
  verse?: {
    externalVerseId?: string | null;
    difficultyLetters?: number | null;
    id?: string | null;
  } | null;
  difficultyLevel?: VerseDifficultyLevel | null;
  status?: string | null;
  flow?: unknown;
  masteryLevel?: number | null;
  repetitions?: number | null;
  reviewLapseStreak?: number | null;
  referenceScore?: number | null;
  incipitScore?: number | null;
  contextScore?: number | null;
  lastTrainingModeId?: number | null;
  lastReviewedAt?: string | null;
  nextReviewAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags?: Array<{ id: string; slug: string; title: string }> | null;
  popularityScope?: "friends" | "players" | "self" | null;
  popularityValue?: number | null;
  popularityPreviewUsers?:
    | Array<{
        telegramId?: string | null;
        name?: string | null;
        avatarUrl?: string | null;
      }>
    | null;
  text?: string | null;
  reference?: string | null;
  contextPromptText?: string | null;
  contextPromptReference?: string | null;
  queuePosition?: number | null;
};

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sortByUpdatedAtDesc(a: Verse, b: Verse) {
  const aUpdated = parseDateValue(a.updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bUpdated = parseDateValue(b.updatedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aUpdated !== bUpdated) return bUpdated - aUpdated;

  const aLast = parseDateValue(a.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bLast = parseDateValue(b.lastReviewedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aLast !== bLast) return bLast - aLast;

  const aCreated = parseDateValue(a.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bCreated = parseDateValue(b.createdAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aCreated !== bCreated) return bCreated - aCreated;

  return String(a.externalVerseId ?? a.id).localeCompare(String(b.externalVerseId ?? b.id));
}

export function mapUserVerseToAppVerse(verse: AppVerseApiRecord): Verse {
  const externalVerseId =
    verse.externalVerseId != null && String(verse.externalVerseId).trim()
      ? String(verse.externalVerseId)
      : String(verse.verse?.externalVerseId ?? "");
  const difficultyLevel =
    verse.difficultyLevel != null
      ? coerceVerseDifficultyLevel(verse.difficultyLevel)
      : getDifficultyLevelByLetters(verse.verse?.difficultyLetters ?? undefined);
  const flow = normalizeVerseFlow(verse.flow);
  const displayStatusFromFlow = getDisplayStatusFromFlow(flow);
  const nextReviewAt = verse.nextReviewAt ?? flow?.availableAt ?? null;
  return {
    id: verse.id ?? verse.verse?.id ?? undefined,
    externalVerseId,
    difficultyLevel,
    status: normalizeDisplayVerseStatus(displayStatusFromFlow ?? verse.status),
    flow,
    masteryLevel: Math.max(0, Math.round(Number(verse.masteryLevel ?? 0))),
    repetitions: Math.max(0, Math.round(Number(verse.repetitions ?? 0))),
    reviewLapseStreak: Math.max(0, Math.round(Number(verse.reviewLapseStreak ?? 0))),
    referenceScore: Math.max(0, Math.round(Number(verse.referenceScore ?? 0))),
    incipitScore: Math.max(0, Math.round(Number(verse.incipitScore ?? 0))),
    contextScore: Math.max(0, Math.round(Number(verse.contextScore ?? 0))),
    lastTrainingModeId: verse.lastTrainingModeId ?? null,
    lastReviewedAt: verse.lastReviewedAt ?? null,
    createdAt: verse.createdAt ?? null,
    updatedAt: verse.updatedAt ?? null,
    nextReviewAt,
    tags: verse.tags ?? [],
    popularityScope: verse.popularityScope ?? undefined,
    popularityValue: verse.popularityValue ?? undefined,
    popularityPreviewUsers:
      verse.popularityPreviewUsers
        ?.map((user) => {
          const telegramId = String(user.telegramId ?? "").trim();
          const name = String(user.name ?? "").trim();
          if (!telegramId || !name) return null;
          return {
            telegramId,
            name,
            avatarUrl:
              typeof user.avatarUrl === "string" && user.avatarUrl.trim()
                ? user.avatarUrl.trim()
                : null,
          };
        })
        .filter(
          (
            user
          ): user is {
            telegramId: string;
            name: string;
            avatarUrl: string | null;
          } => user != null
        ) ?? [],
    text: String(verse.text ?? ""),
    reference: String(verse.reference ?? verse.externalVerseId ?? ""),
    contextPromptText: typeof verse.contextPromptText === "string" ? verse.contextPromptText : undefined,
    contextPromptReference: typeof verse.contextPromptReference === "string" ? verse.contextPromptReference : undefined,
    queuePosition: typeof verse.queuePosition === "number" ? verse.queuePosition : null,
  };
}

function isTrainingDashboardVerse(verse: Verse) {
  const resolved = resolveVerseState(verse);
  return resolved.isLearning || resolved.isReview;
}

export function pickTrainingDashboardVerses(allVerses: Array<Verse>): Array<Verse> {
  return allVerses.filter(isTrainingDashboardVerse).sort(sortByUpdatedAtDesc);
}
