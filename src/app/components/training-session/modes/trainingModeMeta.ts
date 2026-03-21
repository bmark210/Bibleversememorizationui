import { TrainingModeId } from "@/shared/training/modeEngine";

/** Короткое имя режима в шапке упражнения */
export function getTrainingModeShortLabel(modeId: TrainingModeId): string {
  switch (modeId) {
    case TrainingModeId.ClickChunks:
      return "Фрагменты";
    case TrainingModeId.ClickWordsHinted:
      return "Слова · подсказки";
    case TrainingModeId.ClickWordsNoHints:
      return "Слова";
    case TrainingModeId.FirstLettersWithWordHints:
      return "Буквы · слова";
    case TrainingModeId.FirstLettersTapNoHints:
      return "Буквы · тап";
    case TrainingModeId.FirstLettersTyping:
      return "Буквы · ввод";
    case TrainingModeId.FullRecall:
      return "Полный ввод";
    case TrainingModeId.VoiceRecall:
      return "Голос";
  }
}
