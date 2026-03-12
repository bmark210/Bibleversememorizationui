const SACRED_STEMS = [
  'бог', 'бож', 'господ', 'христ', 'иисус', 'дух',
  'всевышн', 'создател', 'творц', 'творец', 'спасител',
  'мессия', 'утешител', 'вседержител', 'саваоф', 'яхве', 'иегов',
  'сын', 'отц', 'отец', 'отч',
];

// Latin chars that look identical to Cyrillic - normalize to Cyrillic
const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у',
  k: 'к', n: 'н', t: 'т', m: 'м', b: 'в', h: 'н',
};

const DEFAULT_CHOICE_TRAY_WIDTH = 280;
const MIN_CHOICE_TRAY_WIDTH = 220;
const MAX_VISIBLE_CHOICE_ROWS = 4;
const MAX_VISIBLE_CHOICE_ITEMS = 15;
const MAX_LEADING_CONTEXT_CHOICES = 2;
const CHOICE_GAP_PX = 5;
const CHOICE_CHAR_WIDTH_PX = 7.4;
const CHOICE_BASE_WIDTH_PX = 20;
const CHOICE_MIN_WIDTH_PX = 44;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function latinToCyrillic(text: string): string {
  return text.replace(/[a-z]/g, (ch) => LATIN_TO_CYRILLIC[ch] ?? ch);
}

export function stripPunctuation(word: string): string {
  const stripped = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return stripped || word;
}

export function isPunctuationOnly(word: string): boolean {
  return !/[\p{L}\p{N}]/u.test(word);
}

export function isSacredWord(word: string): boolean {
  const lower = latinToCyrillic(stripPunctuation(word).toLowerCase().replace(/ё/g, 'е'));
  return SACRED_STEMS.some((stem) => lower.startsWith(stem));
}

export function cleanWordForDisplay(word: string): string {
  const stripped = stripPunctuation(word);
  if (isSacredWord(stripped)) return stripped;
  return stripped.toLowerCase();
}

export function normalizeWord(word: string): string {
  const stripped = latinToCyrillic(
    stripPunctuation(word).toLowerCase().replace(/ё/g, 'е')
  );
  return stripped || latinToCyrillic(word.toLowerCase().replace(/ё/g, 'е'));
}

export function tokenizeWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !isPunctuationOnly(w));
}

export function getMaxMistakes(totalWords: number): number {
  return Math.max(5, Math.floor(totalWords * 0.3));
}

export function getWordMask(word: string): string {
  const cleanedLength = stripPunctuation(word).length || word.length;
  return '•'.repeat(clamp(cleanedLength, 3, 10));
}

export function getWordMaskWidth(word: string): number {
  const cleanedLength = stripPunctuation(word).length || word.length;
  return clamp(cleanedLength * 8, 30, 140);
}

interface VisibleChoiceInput {
  displayText: string;
  normalized: string;
  totalCount?: number;
}

function getEffectiveTrayWidth(trayWidth: number) {
  if (Number.isFinite(trayWidth) && trayWidth >= MIN_CHOICE_TRAY_WIDTH) {
    return Math.floor(trayWidth);
  }

  return DEFAULT_CHOICE_TRAY_WIDTH;
}

function estimateChoiceWidth(choice: VisibleChoiceInput, trayWidth: number) {
  const textWidth = Math.ceil(choice.displayText.length * CHOICE_CHAR_WIDTH_PX);
  const badgeWidth =
    choice.totalCount && choice.totalCount > 1
      ? 18 + String(choice.totalCount).length * 7
      : 0;

  return clamp(
    textWidth + badgeWidth + CHOICE_BASE_WIDTH_PX,
    CHOICE_MIN_WIDTH_PX,
    trayWidth
  );
}

function packChoiceWindow<T extends VisibleChoiceInput>(
  choices: T[],
  startIndex: number,
  trayWidth: number,
  maxRows = MAX_VISIBLE_CHOICE_ROWS,
): T[] {
  if (choices.length === 0 || startIndex >= choices.length) return [];

  const effectiveTrayWidth = getEffectiveTrayWidth(trayWidth);
  const result: T[] = [];
  let currentRow = 1;
  let currentRowWidth = 0;

  for (let index = startIndex; index < choices.length; index += 1) {
    if (result.length >= MAX_VISIBLE_CHOICE_ITEMS) break;

    const choice = choices[index];
    const width = estimateChoiceWidth(choice, effectiveTrayWidth);
    const nextRowWidth =
      currentRowWidth === 0 ? width : currentRowWidth + CHOICE_GAP_PX + width;

    if (result.length === 0 || nextRowWidth <= effectiveTrayWidth) {
      result.push(choice);
      currentRowWidth = nextRowWidth;
      continue;
    }

    if (currentRow < maxRows) {
      currentRow += 1;
      result.push(choice);
      currentRowWidth = width;
      continue;
    }

    break;
  }

  return result;
}

export function pickVisibleChoices<T extends VisibleChoiceInput>(
  orderedChoices: T[],
  remainingCountByNormalized: Map<string, number>,
  correctNormalized: string | null,
  trayWidth: number,
): T[] {
  if (orderedChoices.length === 0) return [];

  const hasRemaining = (choice: T) =>
    (remainingCountByNormalized.get(choice.normalized) ?? 0) > 0;

  const remainingChoices = orderedChoices.filter(hasRemaining);
  if (remainingChoices.length === 0) return [];

  const defaultWindow = packChoiceWindow(remainingChoices, 0, trayWidth);
  if (defaultWindow.length === remainingChoices.length) {
    return remainingChoices;
  }

  if (!correctNormalized) {
    return defaultWindow;
  }

  const correctIndex = remainingChoices.findIndex(
    (choice) => choice.normalized === correctNormalized
  );

  if (correctIndex < 0) {
    return defaultWindow;
  }

  let startIndex = Math.max(0, correctIndex - MAX_LEADING_CONTEXT_CHOICES);
  let visibleChoices = packChoiceWindow(remainingChoices, startIndex, trayWidth);

  while (startIndex > 0 && visibleChoices.length < defaultWindow.length) {
    const candidateStartIndex = startIndex - 1;
    const candidateWindow = packChoiceWindow(
      remainingChoices,
      candidateStartIndex,
      trayWidth
    );

    if (!candidateWindow.some((choice) => choice.normalized === correctNormalized)) {
      break;
    }

    visibleChoices = candidateWindow;
    startIndex = candidateStartIndex;
  }

  return visibleChoices.length > 0 ? visibleChoices : defaultWindow;
}
