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
