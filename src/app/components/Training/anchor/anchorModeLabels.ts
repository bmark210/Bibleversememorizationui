import type { TrainerModeId } from "./anchorTrainingTypes";

/** Короткие подписи режимов закрепления — в том же духе, что шапка основной тренировки */
export function getAnchorModeShortLabel(modeId: TrainerModeId): string {
  switch (modeId) {
    case "reference-choice":
      return "Ссылка · выбор";
    case "book-choice":
      return "Книга";
    case "reference-type":
      return "Ссылка · ввод";
    case "incipit-choice":
      return "Начало · выбор";
    case "incipit-tap":
      return "Начало · тап";
    case "incipit-type":
      return "Начало · буквы";
    case "ending-choice":
      return "Конец";
    case "context-reference-choice":
      return "Контекст v1";
    case "context-reference-type":
      return "Контекст v2";
    case "broken-mirror":
      return "Зеркало";
    case "skeleton-verse":
      return "Скелет";
    case "impostor-word":
      return "Самозванец";
    default:
      return "Закрепление";
  }
}
