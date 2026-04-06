import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FILTER_VISUAL_THEME,
  SECTION_META,
  STATUS_BOX_THEME,
} from "@/app/components/verse-list/constants";
import {
  OWNED_COLLECTION_BADGE_CLASS_NAME,
  OWNED_COLLECTION_FILTER_THEME,
  OWNED_COLLECTION_SECTION_THEME,
  VERSE_STATUS_ICONS,
} from "@/app/components/verseStatusVisuals";

function assertIncludesClassTokens(value: string, className: string) {
  for (const token of className.split(" ").filter(Boolean)) {
    assert.ok(value.includes(token), `Missing class token ${token}`);
  }
}

test("my section visuals reuse the owned collection palette and copy", () => {
  assert.equal(SECTION_META.my.title, "В моих");
  assert.equal(FILTER_VISUAL_THEME.my.activeTabClassName, OWNED_COLLECTION_FILTER_THEME.activeTabClassName);
  assert.equal(FILTER_VISUAL_THEME.my.currentBadgeClassName, OWNED_COLLECTION_FILTER_THEME.currentBadgeClassName);
  assert.equal(STATUS_BOX_THEME.my.accentClass, OWNED_COLLECTION_SECTION_THEME.accentClass);
  assert.equal(STATUS_BOX_THEME.my.borderClass, OWNED_COLLECTION_SECTION_THEME.borderClass);
  assertIncludesClassTokens(OWNED_COLLECTION_BADGE_CLASS_NAME, "border-[#8c6a3b]/45 bg-[#8c6a3b]/16 text-[#c49a6c]");
});

test("section icons align with the status icons used by cards", () => {
  const cases = [
    { key: "learning", expectedClass: "lucide-brain" },
    { key: "queue", expectedClass: "lucide-clock" },
    { key: "review", expectedClass: "lucide-refresh-cw" },
    { key: "mastered", expectedClass: "lucide-trophy" },
    { key: "stopped", expectedClass: "lucide-pause" },
    { key: "my", expectedClass: "lucide-book-marked" },
  ] as const;

  for (const { key, expectedClass } of cases) {
    const html = renderToStaticMarkup(
      React.createElement(VERSE_STATUS_ICONS[key], { className: "h-4 w-4" }),
    );
    assert.ok(html.includes(expectedClass), `Expected ${expectedClass} for ${key}`);
  }
});
