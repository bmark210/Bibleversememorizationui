import {
  REPEAT_THRESHOLD_FOR_MASTERED,
  TRAINING_STAGE_MASTERY_MAX,
} from "@/shared/training/constants";

export type VerseJourneyPhaseKey =
  | "collection"
  | "learning"
  | "review"
  | "mastered";

export const VERSE_JOURNEY_PHASE_TITLES: Record<VerseJourneyPhaseKey, string> = {
  collection: "В коллекции",
  learning: "Изучение",
  review: "Повторение",
  mastered: "Выучен",
};

export function getVerseJourneyOverviewItems() {
  return [
    {
      key: "collection" as const,
      title: VERSE_JOURNEY_PHASE_TITLES.collection,
      summary:
        "Сначала стих добавляется в вашу коллекцию и становится доступным для первых тренировок.",
    },
    {
      key: "learning" as const,
      title: VERSE_JOURNEY_PHASE_TITLES.learning,
      summary: `Дальше стих проходит ${TRAINING_STAGE_MASTERY_MAX} ступеней основного изучения.`,
    },
    {
      key: "review" as const,
      title: VERSE_JOURNEY_PHASE_TITLES.review,
      summary: `После изучения включаются ${REPEAT_THRESHOLD_FOR_MASTERED} повторов с интервалами.`,
    },
    {
      key: "mastered" as const,
      title: VERSE_JOURNEY_PHASE_TITLES.mastered,
      summary: "После всех шагов стих переходит в выученные и остаётся в поддерживающем цикле.",
    },
  ];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildVerseJourneyOverviewHtml() {
  const items = getVerseJourneyOverviewItems();

  return [
    '<div class="bible-memory-onboarding-journey">',
    '  <div class="bible-memory-onboarding-journey__rail" aria-hidden="true"></div>',
    ...items.map(
      (item, index) => `
        <div class="bible-memory-onboarding-journey__item">
          <div class="bible-memory-onboarding-journey__index">${index + 1}</div>
          <div class="bible-memory-onboarding-journey__content">
            <div class="bible-memory-onboarding-journey__title">${escapeHtml(item.title)}</div>
            <div class="bible-memory-onboarding-journey__summary">${escapeHtml(item.summary)}</div>
          </div>
        </div>
      `,
    ),
    "</div>",
  ].join("");
}
