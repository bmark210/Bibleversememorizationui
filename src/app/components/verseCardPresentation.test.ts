import assert from "node:assert/strict";
import test from "node:test";
import { VERSE_CARD_COLOR_CONFIG } from "@/app/components/verseCardColorConfig";
import {
  resolveVerseActionToneKey,
  resolveVerseActionTonePalette,
} from "@/app/components/verseCardPresentation";
import { OWNED_COLLECTION_CARD_TONE } from "@/app/components/verseStatusVisuals";
import { VerseStatus } from "@/shared/domain/verseStatus";

test("catalog actions always use the collection accent tone", () => {
  assert.equal(
    resolveVerseActionToneKey({
      displayStatus: "CATALOG",
      isCatalogMode: true,
    }),
    "my",
  );
  assert.equal(
    resolveVerseActionToneKey({
      displayStatus: VerseStatus.LEARNING,
      isCatalogMode: true,
    }),
    "my",
  );

  const palette = resolveVerseActionTonePalette(VERSE_CARD_COLOR_CONFIG, {
    displayStatus: "CATALOG",
    isCatalogMode: true,
  });

  assert.equal(
    palette.accentTextClassName,
    OWNED_COLLECTION_CARD_TONE.accentTextClassName,
  );
  assert.equal(
    palette.accentBorderClassName,
    OWNED_COLLECTION_CARD_TONE.accentBorderClassName,
  );
});

test("non-catalog actions keep their native status accent tone", () => {
  assert.equal(
    resolveVerseActionToneKey({ displayStatus: VerseStatus.LEARNING }),
    "learning",
  );
  assert.equal(resolveVerseActionToneKey({ displayStatus: "REVIEW" }), "review");
  assert.equal(
    resolveVerseActionToneKey({ displayStatus: "MASTERED" }),
    "mastered",
  );
  assert.equal(
    resolveVerseActionToneKey({ displayStatus: VerseStatus.STOPPED }),
    "stopped",
  );
  assert.equal(resolveVerseActionToneKey({ displayStatus: VerseStatus.MY }), "my");
  assert.equal(
    resolveVerseActionToneKey({ displayStatus: VerseStatus.QUEUE }),
    "queue",
  );
});
