import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VerseListSkeletonCards } from "@/app/components/verse-list/components/VerseListSkeletonCards";
import { FILTER_VISUAL_THEME } from "@/app/components/verse-list/constants";

test("catalog skeleton keeps the same row wrapper inset as the virtualized list", () => {
  const html = renderToStaticMarkup(
    <VerseListSkeletonCards count={2} mode="catalog" />,
  );

  assert.ok(html.includes("px-2 pb-3 sm:px-4"));
  assert.ok(html.includes(FILTER_VISUAL_THEME.catalog.cardClassName));
  assert.ok(!html.includes("border-b border-border/55 bg-background/92 backdrop-blur-xl"));
});

test("my verses skeleton renders section strip and collection-toned cards", () => {
  const html = renderToStaticMarkup(
    <VerseListSkeletonCards count={2} mode="my" />,
  );

  assert.ok(html.includes("border-b border-border/55 bg-background/92 backdrop-blur-xl"));
  assert.ok(html.includes("overflow-y-auto"));
  assert.ok(html.includes(FILTER_VISUAL_THEME.my.cardClassName));
  assert.ok(html.includes("Изучение"));
  assert.ok(html.includes("В очереди"));
  assert.ok(html.includes("Повторение"));
  assert.ok(html.includes("Выучены"));
  assert.ok(html.includes("На паузе"));
  assert.ok(html.includes("В моих"));
  assert.ok(!html.includes("bg-current/20"));
});
