import type { Verse } from "@/app/domain/verse";
import type { VerseIdentityRef, VerseMutablePatch } from "@/app/types/verseSync";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { normalizeVerseFlow } from "@/shared/domain/verseFlow";

type VerseLikeIdentity = Pick<Verse, "id" | "externalVerseId">;

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNullableString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  return typeof value === "string" ? value : String(value);
}

function readNullableNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
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
  if (!isRecord(raw)) return null;
  const responseRecord = raw;
  const patch: VerseMutablePatch = {};
  let hasPatchFields = false;

  if (hasOwn(responseRecord, "status")) {
    patch.status = normalizeDisplayVerseStatus(responseRecord.status);
    hasPatchFields = true;
  }
  if (hasOwn(responseRecord, "flow")) {
    patch.flow = normalizeVerseFlow(responseRecord.flow);
    hasPatchFields = true;
  }
  if (hasOwn(responseRecord, "masteryLevel")) {
    patch.masteryLevel = readNullableNumber(responseRecord.masteryLevel);
    hasPatchFields = true;
  }
  if (hasOwn(responseRecord, "repetitions")) {
    patch.repetitions = readNullableNumber(responseRecord.repetitions);
    hasPatchFields = true;
  }
  if (hasOwn(responseRecord, "reviewLapseStreak")) {
    patch.reviewLapseStreak = readNullableNumber(
      responseRecord.reviewLapseStreak
    );
    hasPatchFields = true;
  }
  if (hasOwn(responseRecord, "lastReviewedAt")) {
    patch.lastReviewedAt = readNullableString(responseRecord.lastReviewedAt);
    hasPatchFields = true;
  }
  if (hasOwn(responseRecord, "nextReviewAt")) {
    patch.nextReviewAt = readNullableString(responseRecord.nextReviewAt);
    hasPatchFields = true;
  }
  if (hasOwn(responseRecord, "updatedAt")) {
    patch.updatedAt = readNullableString(responseRecord.updatedAt);
    hasPatchFields = true;
  }

  return hasPatchFields ? patch : null;
}

export function mergeVersePatch<T extends Verse>(verse: T, patch: VerseMutablePatch): T {
  if (!patch || Object.keys(patch).length === 0) return verse;
  return {
    ...verse,
    ...patch,
  } as T;
}
