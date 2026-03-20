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
    case "context-incipit-type":
      return "Контекст · ввод";
    case "context-incipit-tap":
      return "Контекст · тап";
    case "context-prefix-type":
      return "Контекст · буквы";
    default:
      return "Закрепление";
  }
}
