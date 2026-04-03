import type { VerseCardPreviewTone } from "@/app/components/VerseCard";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import type { VerseGallerySourceMode } from "./types";

export function isCatalogGalleryMode(
  sourceMode: VerseGallerySourceMode
): boolean {
  return sourceMode === "catalog";
}

export function isCatalogGalleryOwnedVerse(
  sourceMode: VerseGallerySourceMode,
  status: DisplayVerseStatus
): boolean {
  return isCatalogGalleryMode(sourceMode) && status !== "CATALOG";
}

export function getGalleryPreviewTone(
  sourceMode: VerseGallerySourceMode,
  tone: VerseCardPreviewTone | undefined
): VerseCardPreviewTone | undefined {
  return isCatalogGalleryMode(sourceMode) ? "catalog" : tone;
}

export function shouldShowGalleryDelete(
  sourceMode: VerseGallerySourceMode,
  status: DisplayVerseStatus
): boolean {
  return !isCatalogGalleryMode(sourceMode) && status !== "CATALOG";
}
