import assert from "node:assert/strict";
import test from "node:test";
import { VerseStatus } from "@/shared/domain/verseStatus";
import {
  getGalleryPreviewTone,
  isCatalogGalleryMode,
  isCatalogGalleryOwnedVerse,
  shouldShowGalleryDelete,
} from "./presentation";

test("catalog gallery keeps catalog tone and hides delete for catalog verses", () => {
  assert.equal(isCatalogGalleryMode("catalog"), true);
  assert.equal(isCatalogGalleryOwnedVerse("catalog", "CATALOG"), false);
  assert.equal(getGalleryPreviewTone("catalog", "review"), "catalog");
  assert.equal(shouldShowGalleryDelete("catalog", "CATALOG"), false);
});

test("catalog gallery treats owned verses as collection items without delete footer", () => {
  assert.equal(isCatalogGalleryOwnedVerse("catalog", VerseStatus.MY), true);
  assert.equal(isCatalogGalleryOwnedVerse("catalog", "REVIEW"), true);
  assert.equal(getGalleryPreviewTone("catalog", "learning"), "catalog");
  assert.equal(shouldShowGalleryDelete("catalog", "REVIEW"), false);
});

test("my verses gallery preserves native status tone and delete footer", () => {
  assert.equal(isCatalogGalleryMode("my"), false);
  assert.equal(isCatalogGalleryOwnedVerse("my", VerseStatus.MY), false);
  assert.equal(getGalleryPreviewTone("my", "review"), "review");
  assert.equal(shouldShowGalleryDelete("my", "REVIEW"), true);
});
