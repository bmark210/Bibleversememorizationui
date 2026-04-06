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
import {
  OWNED_COLLECTION_BADGE_CLASS_NAME,
  OWNED_COLLECTION_CARD_TONE,
} from "@/app/components/verseStatusVisuals";

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

function renderListCard(
  verse: Verse,
  options?: { isCatalogMode?: boolean; withOwnersHandler?: boolean },
) {
  return renderToStaticMarkup(
    <SwipeableVerseCard
      verse={verse}
      onOpen={() => {}}
      onOpenOwners={options?.withOwnersHandler ? () => {} : undefined}
      onAddToLearning={() => {}}
      onStartTraining={() => {}}
      onPauseLearning={() => {}}
      onResumeLearning={() => {}}
      isCatalogMode={options?.isCatalogMode}
    />,
  );
}

function renderGalleryCard(
  verse: Verse,
  options?: { sourceMode?: "my" | "catalog" },
) {
  return renderToStaticMarkup(
    <VersePreviewCard
      preview={getPreparedVersePreview(verse)}
      sourceMode={options?.sourceMode}
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

test("catalog gallery preview uses brighter chrome for reference tags and players pill", () => {
  const html = renderGalleryCard(
    createVerse({
      status: "CATALOG",
      tags: [
        { id: "1", slug: "apologetics", title: "Апологетика" },
        { id: "2", slug: "truth", title: "Истина" },
      ],
      popularityScope: "players",
      popularityValue: 5,
    }),
    { sourceMode: "catalog" },
  );

  assertIncludesClassTokens(
    html,
    VERSE_CARD_COLOR_CONFIG.previewChrome.catalog.referenceClassName,
  );
  assertIncludesClassTokens(
    html,
    VERSE_CARD_COLOR_CONFIG.previewChrome.catalog.tagClassName,
  );
  assertIncludesClassTokens(
    html,
    VERSE_CARD_COLOR_CONFIG.previewChrome.catalog.metaPanelClassName,
  );
});

test("catalog actions in list and gallery use the collection accent tone", () => {
  const catalogListHtml = renderListCard(
    createVerse({ status: "CATALOG" }),
    { isCatalogMode: true },
  );
  const catalogGalleryHtml = renderGalleryCard(
    createVerse({ status: "CATALOG" }),
    { sourceMode: "catalog" },
  );

  assertIncludesClassTokens(
    catalogListHtml,
    `${OWNED_COLLECTION_CARD_TONE.accentBorderClassName} ${OWNED_COLLECTION_CARD_TONE.accentTextClassName}`,
  );
  assertIncludesClassTokens(
    catalogGalleryHtml,
    `${OWNED_COLLECTION_CARD_TONE.accentBorderClassName} ${OWNED_COLLECTION_CARD_TONE.accentTextClassName}`,
  );
});

test("my verses reuse the same owned collection presentation as catalog cards", () => {
  const myHtml = renderListCard(createVerse({ status: VerseStatus.MY }));
  const catalogOwnedHtml = renderGalleryCard(
    createVerse({ status: VerseStatus.MY }),
    { sourceMode: "catalog" },
  );

  assert.ok(myHtml.includes("В моих"));
  assert.ok(myHtml.includes("Начать изучение"));
  assert.ok(!myHtml.includes("Убрать из моих"));
  assert.ok(myHtml.includes("bg-[#8c6a3b]/85"));
  assert.ok(catalogOwnedHtml.includes("Убрать из моих"));
  assertIncludesClassTokens(myHtml, OWNED_COLLECTION_BADGE_CLASS_NAME);
  assert.ok(
    catalogOwnedHtml.includes(OWNED_COLLECTION_BADGE_CLASS_NAME),
  );
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

test("gallery learning cards keep the primary training CTA without assuming inline pause", () => {
  const galleryHtml = renderGalleryCard(
    createVerse({ status: VerseStatus.LEARNING, masteryLevel: 2 }),
  );

  assert.ok(galleryHtml.includes("Тренироваться"));
  assert.ok(!galleryHtml.includes('data-tour="verse-gallery-inline-utility"'));
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

test("list cards and gallery share the same icon and palette tokens for core statuses", () => {
  const cases = [
    {
      verse: createVerse({ status: VerseStatus.LEARNING, masteryLevel: 2 }),
      iconClass: "lucide-brain",
      classTokens: [
        "border-status-learning/25",
        "bg-status-learning-soft",
        "text-status-learning/85",
        "text-status-learning",
      ],
    },
    {
      verse: createVerse({
        status: "REVIEW",
        masteryLevel: 7,
        repetitions: 2,
        nextReviewAt: "2000-01-01T00:00:00.000Z",
      }),
      iconClass: "lucide-refresh-cw",
      classTokens: [
        "border-status-review/25",
        "bg-status-review-soft",
        "text-status-review/85",
        "text-status-review",
      ],
    },
    {
      verse: createVerse({ status: "MASTERED", masteryLevel: 7, repetitions: 7 }),
      iconClass: "lucide-trophy",
      classTokens: [
        "border-status-mastered/25",
        "bg-status-mastered-soft",
        "text-status-mastered/85",
        "text-status-mastered",
      ],
    },
    {
      verse: createVerse({ status: VerseStatus.STOPPED, masteryLevel: 4 }),
      iconClass: "lucide-pause",
      classTokens: [
        "border-status-paused/25",
        "bg-status-paused-soft",
        "text-status-paused/85",
        "text-status-paused",
      ],
    },
  ];

  for (const { verse, iconClass, classTokens } of cases) {
    const listHtml = renderListCard(verse);
    const galleryHtml = renderGalleryCard(verse);

    assert.ok(listHtml.includes(iconClass));
    assert.ok(galleryHtml.includes(iconClass));
    assertIncludesClassTokens(listHtml, classTokens.join(" "));
    assertIncludesClassTokens(galleryHtml, classTokens.join(" "));
  }
});

test("list footer keeps status social badge and progress on one horizontal line", () => {
  const html = renderListCard(
    createVerse({
      status: VerseStatus.LEARNING,
      masteryLevel: 2,
      popularityScope: "players",
      popularityValue: 9,
      popularityPreviewUsers: [
        {
          telegramId: "1",
          name: "User One",
          avatarUrl: null,
        },
      ],
    }),
  );

  const statusIndex = html.indexOf("В изучении");
  const socialIndex = html.indexOf("lucide-users");
  const progressIndex = html.indexOf('aria-label="Освоение ');

  assert.notEqual(statusIndex, -1);
  assert.notEqual(socialIndex, -1);
  assert.notEqual(progressIndex, -1);
  assert.ok(statusIndex < socialIndex);
  assert.ok(socialIndex < progressIndex);
  assert.ok(
    html.includes(
      "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-3",
    ),
  );
});

test("catalog list cards keep the players pill left-aligned in the footer", () => {
  const html = renderListCard(
    createVerse({
      status: "CATALOG",
      popularityScope: "players",
      popularityValue: 2,
      popularityPreviewUsers: [
        {
          telegramId: "1",
          name: "User One",
          avatarUrl: null,
        },
      ],
    }),
    { isCatalogMode: true, withOwnersHandler: true },
  );

  assert.ok(html.includes("У игроков: "));
  assert.ok(html.includes("flex items-center justify-start pt-3"));
  assert.ok(
    !html.includes(
      "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-3",
    ),
  );
});

test("owned collection cards keep status left and players in the center row", () => {
  const html = renderListCard(
    createVerse({
      status: VerseStatus.MY,
      popularityScope: "players",
      popularityValue: 3,
      popularityPreviewUsers: [
        {
          telegramId: "1",
          name: "User One",
          avatarUrl: null,
        },
      ],
    }),
    { isCatalogMode: true, withOwnersHandler: true },
  );

  const socialIndex = html.indexOf("У игроков: ");
  const badgeIndex = html.indexOf("В моих");

  assert.notEqual(socialIndex, -1);
  assert.notEqual(badgeIndex, -1);
  assert.ok(badgeIndex < socialIndex);
  assert.ok(
    html.includes(
      "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 pt-3",
    ),
  );
  assert.ok(!html.includes("space-y-2 pt-3"));
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
