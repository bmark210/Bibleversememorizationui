import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Verse } from "@/app/domain/verse";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { SwipeableVerseCard } from "@/app/components/verse-list/components/SwipeableVerseCard";
import { VersePreviewCard } from "@/app/components/VerseGallery/components/VersePreviewCard";
import { getPreparedVersePreview } from "@/app/components/VerseGallery/previewModel";
import { VERSE_CARD_COLOR_CONFIG } from "@/app/components/verseCardColorConfig";

function createVerse(
  overrides: Partial<Verse> & Pick<Verse, "status">,
): Verse {
  return {
    id: "verse-1",
    externalVerseId: "john-3-16",
    difficultyLevel: "MEDIUM",
    status: overrides.status,
    masteryLevel: 0,
    repetitions: 0,
    reviewLapseStreak: 0,
    referenceScore: 0,
    incipitScore: 0,
    contextScore: 0,
    lastTrainingModeId: null,
    lastReviewedAt: null,
    createdAt: null,
    updatedAt: null,
    nextReview: null,
    nextReviewAt: null,
    tags: [],
    popularityPreviewUsers: [],
    text: "Ибо так возлюбил Бог мир.",
    reference: "Ин 3:16",
    ...overrides,
  };
}

function renderListCard(verse: Verse) {
  return renderToStaticMarkup(
    <SwipeableVerseCard
      verse={verse}
      onOpen={() => {}}
      onAddToLearning={() => {}}
      onStartTraining={() => {}}
      onPauseLearning={() => {}}
      onResumeLearning={() => {}}
    />,
  );
}

function renderGalleryCard(verse: Verse) {
  return renderToStaticMarkup(
    <VersePreviewCard
      preview={getPreparedVersePreview(verse)}
      isActionPending={false}
      onStartTraining={() => {}}
      onStatusAction={() => {}}
    />,
  );
}

function assertIncludesClassTokens(html: string, className: string) {
  for (const token of className.split(" ").filter(Boolean)) {
    assert.ok(html.includes(token), `Missing class token ${token}`);
  }
}

test("list cards do not render progress pill for catalog and my states", () => {
  const catalogHtml = renderListCard(createVerse({ status: "CATALOG" }));
  const myHtml = renderListCard(createVerse({ status: VerseStatus.MY }));

  assert.ok(!catalogHtml.includes('data-tour="verse-card-progress-button"'));
  assert.ok(!myHtml.includes('data-tour="verse-card-progress-button"'));
  assert.ok(!catalogHtml.includes("В изучении"));
  assert.ok(!myHtml.includes("В изучении"));
});

test("gallery cards do not render progress pill for catalog and my states", () => {
  const catalogHtml = renderGalleryCard(createVerse({ status: "CATALOG" }));
  const myHtml = renderGalleryCard(createVerse({ status: VerseStatus.MY }));

  assert.ok(!catalogHtml.includes("Показать путь прогресса стиха"));
  assert.ok(!myHtml.includes("Показать путь прогресса стиха"));
  assert.ok(!catalogHtml.includes("В изучении"));
  assert.ok(!myHtml.includes("В изучении"));
});

test("learning and review cards keep distinct status pills in list and gallery", () => {
  const learningHtml = renderListCard(
    createVerse({ status: VerseStatus.LEARNING, masteryLevel: 2 }),
  );
  const reviewHtml = renderGalleryCard(
    createVerse({
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 2,
      nextReviewAt: "2000-01-01T00:00:00.000Z",
    }),
  );

  assert.ok(learningHtml.includes("В изучении"));
  assert.ok(reviewHtml.includes("Повторение"));
  assert.ok(!learningHtml.includes("Изучение"));
  assert.ok(!reviewHtml.includes("В изучении"));
  assert.ok(!reviewHtml.includes("Ждёт повтора"));
});

test("list cards hide training CTA while gallery keeps it", () => {
  const learningListHtml = renderListCard(
    createVerse({ status: VerseStatus.LEARNING, masteryLevel: 2 }),
  );
  const reviewListHtml = renderListCard(
    createVerse({
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 2,
      nextReviewAt: "2000-01-01T00:00:00.000Z",
    }),
  );
  const galleryHtml = renderGalleryCard(
    createVerse({ status: VerseStatus.LEARNING, masteryLevel: 2 }),
  );

  assert.ok(!learningListHtml.includes("Тренироваться"));
  assert.ok(!reviewListHtml.includes("Тренироваться"));
  assert.ok(galleryHtml.includes("Тренироваться"));
});

test("gallery learning cards place pause inline next to training without visible label", () => {
  const galleryHtml = renderGalleryCard(
    createVerse({ status: VerseStatus.LEARNING, masteryLevel: 2 }),
  );

  assert.ok(galleryHtml.includes('data-tour="verse-gallery-inline-utility"'));
  assert.ok(galleryHtml.includes("Тренироваться"));
  assert.ok(!galleryHtml.includes(">Пауза<"));
});

test("waiting review shows waiting title and a separate next-step pill", () => {
  const listHtml = renderListCard(
    createVerse({
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 3,
      nextReviewAt: "2099-04-10T12:30:00.000Z",
    }),
  );
  const galleryHtml = renderGalleryCard(
    createVerse({
      status: "REVIEW",
      masteryLevel: 7,
      repetitions: 3,
      nextReviewAt: "2099-04-10T12:30:00.000Z",
    }),
  );

  assert.ok(listHtml.includes("В ожидании"));
  assert.ok(galleryHtml.includes("В ожидании"));
  assert.ok(!listHtml.includes("В изучении"));
  assert.ok(!galleryHtml.includes("В изучении"));
  assert.match(listHtml, /Доступно сегодня в|Доступно завтра в|Доступно /);
  assert.match(galleryHtml, /Доступно сегодня в|Доступно завтра в|Доступно /);
  assert.ok(!listHtml.includes("Ждёт повтора"));
  assert.ok(!galleryHtml.includes("Ждёт повтора"));
});

test("stopped and mastered keep their own distinct pills", () => {
  const stoppedHtml = renderListCard(
    createVerse({ status: VerseStatus.STOPPED, masteryLevel: 4 }),
  );
  const masteredHtml = renderGalleryCard(
    createVerse({ status: "MASTERED", masteryLevel: 7, repetitions: 7 }),
  );

  assert.ok(stoppedHtml.includes("На паузе"));
  assert.ok(masteredHtml.includes("Выучен"));
});

test("list and gallery tags share one neutral color treatment", () => {
  const verseWithTags = createVerse({
    status: VerseStatus.LEARNING,
    tags: [
      { id: "1", slug: "hope", title: "Надежда" },
      { id: "2", slug: "faith", title: "Вера" },
    ],
  });

  const listHtml = renderListCard(verseWithTags);
  const galleryHtml = renderGalleryCard(verseWithTags);

  assertIncludesClassTokens(listHtml, VERSE_CARD_COLOR_CONFIG.tagClassName);
  assertIncludesClassTokens(galleryHtml, VERSE_CARD_COLOR_CONFIG.tagClassName);
});
