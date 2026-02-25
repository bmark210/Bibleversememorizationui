import type { Verse } from "@/app/App";
import type { VerseIdentityRef, VerseMutablePatch } from "@/app/types/verseSync";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";

type VerseLikeIdentity = Pick<Verse, "id" | "externalVerseId">;

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function getVerseSyncKey(ref: VerseIdentityRef | VerseLikeIdentity): string {
  return String(ref.externalVerseId ?? ref.id ?? "");
}

export function isSameVerseByRef(
  verse: VerseLikeIdentity,
  target: VerseIdentityRef | VerseLikeIdentity
): boolean {
  const verseExternal = verse.externalVerseId != null ? String(verse.externalVerseId) : null;
  const targetExternal = target.externalVerseId != null ? String(target.externalVerseId) : null;
  if (verseExternal && targetExternal) {
    return verseExternal === targetExternal;
  }
  return getVerseSyncKey(verse) === getVerseSyncKey(target);
}

export function pickMutableVersePatchFromApiResponse(raw: unknown): VerseMutablePatch | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const patch: VerseMutablePatch = {};
  let hasAny = false;

  if (hasOwn(data, "status")) {
    patch.status = normalizeDisplayVerseStatus(data.status);
    hasAny = true;
  }
  if (hasOwn(data, "masteryLevel")) {
    patch.masteryLevel =
      typeof data.masteryLevel === "number" && Number.isFinite(data.masteryLevel)
        ? data.masteryLevel
        : data.masteryLevel == null
          ? null
          : Number(data.masteryLevel);
    hasAny = true;
  }
  if (hasOwn(data, "repetitions")) {
    patch.repetitions =
      typeof data.repetitions === "number" && Number.isFinite(data.repetitions)
        ? data.repetitions
        : data.repetitions == null
          ? null
          : Number(data.repetitions);
    hasAny = true;
  }
  if (hasOwn(data, "lastReviewedAt")) {
    patch.lastReviewedAt =
      typeof data.lastReviewedAt === "string" || data.lastReviewedAt == null
        ? (data.lastReviewedAt as string | null)
        : String(data.lastReviewedAt);
    hasAny = true;
  }
  if (hasOwn(data, "nextReviewAt")) {
    patch.nextReviewAt =
      typeof data.nextReviewAt === "string" || data.nextReviewAt == null
        ? (data.nextReviewAt as string | null)
        : String(data.nextReviewAt);
    hasAny = true;
  }
  if (hasOwn(data, "updatedAt")) {
    patch.updatedAt =
      typeof data.updatedAt === "string" || data.updatedAt == null
        ? (data.updatedAt as string | null)
        : String(data.updatedAt);
    hasAny = true;
  }

  return hasAny ? patch : null;
}

export function mergeVersePatch<T extends Verse>(verse: T, patch: VerseMutablePatch): T {
  if (!patch || Object.keys(patch).length === 0) return verse;
  return {
    ...verse,
    ...patch,
  } as T;
}

