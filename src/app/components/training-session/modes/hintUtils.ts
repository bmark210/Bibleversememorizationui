import { tokenizeWords } from './wordUtils';

/**
 * Единая система подсказок (modes 5+, learning & review):
 *
 * 1. «Подсказка» → первые 3-5 слов стиха (бесплатная).
 *    Кнопка трансформируется в «Сдаюсь».
 *    Из рейтинговых кнопок убирается «Забыл» — его роль играет «Сдаюсь».
 *
 * 2. «Сдаюсь» → полный текст стиха, ввод отключён, только «Забыл» (rating 0).
 */

export function generateHintFirstWords(verseText: string): string {
  const words = tokenizeWords(verseText);
  const count = Math.min(5, Math.max(3, Math.ceil(words.length * 0.15)));
  return words.slice(0, count).join(' ') + '\u2026';
}
