import { Users, type LucideIcon } from "lucide-react";
import type { Verse } from "@/app/domain/verse";
import {
  resolveVerseCardActionModel,
  type VerseCardActionModel,
} from "@/app/components/verseCardActionModel";
import type { VerseCardPreviewTone, VerseCardTag } from "@/app/components/VerseCard";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { VerseStatus } from "@/shared/domain/verseStatus";
import type { VersePreviewOverride } from "./types";
import {
  computeTotalProgressPercent,
  getVerseIdentity,
  mergePreviewOverrides,
  normalizeVerseStatus,
  parseDate,
} from "./utils";

export type PreparedPreviewUser = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
};

export type PreparedPopularityBadge = {
  icon: LucideIcon;
  label: string;
  className: string;
};

export type PreparedVersePreview = {
  key: string;
  verse: Verse;
  status: DisplayVerseStatus;
  actionModel: VerseCardActionModel;
  tone: VerseCardPreviewTone | undefined;
  totalProgressPercent: number;
  normalizedTags: VerseCardTag[];
  previewUsers: PreparedPreviewUser[];
  popularityValue: number | null;
  popularityBadge: PreparedPopularityBadge | null;
};

const PREVIEW_CACHE_LIMIT = 96;
const preparedPreviewCache = new Map<string, PreparedVersePreview>();

function getTagsCacheSignature(verse: Verse): string {
  if (!Array.isArray(verse.tags) || verse.tags.length === 0) return "";

  return verse.tags
    .map((tag) =>
      [String(tag?.id ?? ""), String(tag?.slug ?? ""), String(tag?.title ?? "")]
        .join(":")
    )
    .join("|");
}

function getUsersCacheSignature(verse: Verse): string {
  if (
    !Array.isArray(verse.popularityPreviewUsers) ||
    verse.popularityPreviewUsers.length === 0
  ) {
    return "";
  }

  return verse.popularityPreviewUsers
    .map((user) =>
      [
        String(user?.telegramId ?? ""),
        String(user?.name ?? ""),
        String(user?.avatarUrl ?? ""),
      ].join(":")
    )
    .join("|");
}

function getPreviewCacheKey(verse: Verse, isAnchorEligible: boolean): string {
  const nextReviewRaw =
    (verse as Record<string, unknown>).nextReviewAt ??
    (verse as Record<string, unknown>).nextReview ??
    "";
  const flowRaw = (verse as Record<string, unknown>).flow;
  const flowSignature =
    flowRaw && typeof flowRaw === "object"
      ? JSON.stringify(flowRaw)
      : String(flowRaw ?? "");

  return [
    getVerseIdentity(verse),
    String(verse.status ?? ""),
    flowSignature,
    String(nextReviewRaw),
    String(verse.masteryLevel ?? ""),
    String(verse.repetitions ?? ""),
    String(verse.popularityScope ?? ""),
    String(verse.popularityValue ?? ""),
    getTagsCacheSignature(verse),
    getUsersCacheSignature(verse),
    isAnchorEligible ? "1" : "0",
  ].join("~");
}

function rememberPreparedPreview(
  cacheKey: string,
  preview: PreparedVersePreview
): PreparedVersePreview {
  if (preparedPreviewCache.has(cacheKey)) {
    preparedPreviewCache.delete(cacheKey);
  }
  preparedPreviewCache.set(cacheKey, preview);

  while (preparedPreviewCache.size > PREVIEW_CACHE_LIMIT) {
    const oldestKey = preparedPreviewCache.keys().next().value;
    if (!oldestKey) break;
    preparedPreviewCache.delete(oldestKey);
  }

  return preview;
}

function normalizeTags(verse: Verse): VerseCardTag[] {
  if (!Array.isArray(verse.tags) || verse.tags.length === 0) return [];

  const seen = new Set<string>();
  return verse.tags.reduce<VerseCardTag[]>((acc, tag) => {
    const title = String(tag?.title ?? "").trim();
    if (!title) return acc;

    const key = String(tag?.id ?? tag?.slug ?? title.toLowerCase());
    if (seen.has(key)) return acc;
    seen.add(key);

    acc.push({
      id: tag?.id,
      slug: tag?.slug,
      title,
    });
    return acc;
  }, []);
}

function normalizePreviewUsers(verse: Verse): PreparedPreviewUser[] {
  if (!Array.isArray(verse.popularityPreviewUsers)) return [];

  const seen = new Set<string>();
  return verse.popularityPreviewUsers
    .reduce<PreparedPreviewUser[]>((acc, user) => {
      const telegramId = String(user?.telegramId ?? "").trim();
      const name = String(user?.name ?? "").trim();
      if (!telegramId || !name || seen.has(telegramId)) return acc;
      seen.add(telegramId);

      acc.push({
        telegramId,
        name,
        avatarUrl:
          typeof user?.avatarUrl === "string" && user.avatarUrl.trim()
            ? user.avatarUrl.trim()
            : null,
      });
      return acc;
    }, [])
    .slice(0, 4);
}

function getPreviewTone(status: DisplayVerseStatus): VerseCardPreviewTone | undefined {
  if (status === "CATALOG") return "catalog";
  if (status === VerseStatus.MY) return "my";
  if (status === VerseStatus.STOPPED) return "stopped";
  if (status === "MASTERED") return "mastered";
  if (status === "REVIEW") return "review";
  return "learning";
}

function getPopularityBadge(
  verse: Verse,
  popularityValue: number | null
): PreparedPopularityBadge | null {
  if (popularityValue == null) return null;

  if (verse.popularityScope === "friends") {
    return {
      icon: Users,
      label: `У друзей ${popularityValue}`,
      className:
        "border-cyan-500/35 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
    };
  }

  if (verse.popularityScope === "players") {
    return {
      icon: Users,
      label: `У игроков ${popularityValue}`,
      className:
        "border-slate-500/35 bg-slate-500/12 text-slate-700 dark:text-slate-300",
    };
  }

  return null;
}

export function getPreparedVersePreviewAtIndex(
  verses: Verse[],
  index: number,
  previewOverrides: Map<string, VersePreviewOverride>,
  isAnchorEligible: boolean
): PreparedVersePreview | null {
  const verse = verses[index];
  if (!verse) return null;
  return getPreparedVersePreview(
    mergePreviewOverrides(verse, previewOverrides),
    isAnchorEligible
  );
}

export function getPreparedVersePreview(
  verse: Verse,
  isAnchorEligible = false
): PreparedVersePreview {
  const cacheKey = getPreviewCacheKey(verse, isAnchorEligible);
  const cached = preparedPreviewCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const status = normalizeVerseStatus(verse.status);
  const rawMasteryLevel = Number(verse.masteryLevel ?? 0);
  const repetitionsCount = Math.max(0, Number(verse.repetitions ?? 0));
  const popularityValue =
    typeof verse.popularityValue === "number"
      ? Math.max(0, Math.round(verse.popularityValue))
      : null;

  return rememberPreparedPreview(cacheKey, {
    key: getVerseIdentity(verse),
    verse,
    status,
    actionModel: resolveVerseCardActionModel({
      status,
      flow: verse.flow,
      nextReviewAt: parseDate(
        (verse as Record<string, unknown>).nextReviewAt ??
          (verse as Record<string, unknown>).nextReview
      ),
      isAnchorEligible,
    }),
    tone: getPreviewTone(status),
    totalProgressPercent: computeTotalProgressPercent(
      rawMasteryLevel,
      repetitionsCount
    ),
    normalizedTags: normalizeTags(verse),
    previewUsers: normalizePreviewUsers(verse),
    popularityValue,
    popularityBadge: getPopularityBadge(verse, popularityValue),
  });
}
