import { measureTextWidth } from '@/app/utils/textLayout';

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
const DEFAULT_CHOICE_TRAY_HEIGHT = 132;
const MIN_CHOICE_TRAY_WIDTH = 220;
const MIN_CHOICE_TRAY_HEIGHT = 72;
const MAX_VISIBLE_CHOICE_ROWS = 8;
const MAX_LEADING_CONTEXT_CHOICES = 2;
const CHOICE_GAP_PX = 5;
const CHOICE_CHAR_WIDTH_PX = 7.4;
const CHOICE_BASE_WIDTH_PX = 20;
const CHOICE_MIN_WIDTH_PX = 44;
const CHOICE_ROW_HEIGHT_PX = 34;
const CHOICE_VERTICAL_PADDING_PX = 16;
const CHOICE_FALLBACK_ROWS = 4;
const WORD_MASK_CELL_WIDTH_PX = 10;
const WORD_MASK_CELL_GAP_PX = 4;
const WORD_MASK_HORIZONTAL_PADDING_PX = 16;
const WORD_MASK_BORDER_ALLOWANCE_PX = 4;
const WORD_MASK_MIN_WIDTH_PX = 30;

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

export function getComparableFirstLetter(word: string): string {
  const cleaned = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return '';

  return latinToCyrillic(
    cleaned.charAt(0).toLowerCase().replace(/ё/g, 'е')
  );
}

export function tokenizeFirstLetters(text: string): string[] {
  return tokenizeWords(text)
    .map((word) => getComparableFirstLetter(word))
    .filter(Boolean);
}

export function getMaxMistakes(totalWords: number): number {
  return Math.max(5, Math.floor(totalWords * 0.3));
}

function getWordMaskLetterCount(word: string): number {
  const cleanedLength = stripPunctuation(word).length || word.length;
  return Math.max(1, cleanedLength);
}

export function getWordMask(word: string): string {
  return '•'.repeat(getWordMaskLetterCount(word));
}

export function getWordMaskWidth(word: string): number {
  const letterCount = getWordMaskLetterCount(word);
  const cellWidth =
    letterCount * WORD_MASK_CELL_WIDTH_PX +
    Math.max(0, letterCount - 1) * WORD_MASK_CELL_GAP_PX;

  return Math.max(
    WORD_MASK_MIN_WIDTH_PX,
    cellWidth + WORD_MASK_HORIZONTAL_PADDING_PX + WORD_MASK_BORDER_ALLOWANCE_PX
  );
}

/**
 * Font-aware version of getWordMaskWidth.
 *
 * Measures the actual rendered width of the word via @chenglou/pretext
 * instead of multiplying letter count by a fixed pixel constant.
 * This is more accurate for proportional fonts (e.g. "И" vs "ш" differ
 * significantly) and handles CJK / emoji / Cyrillic correctly.
 *
 * Falls back to the static estimate if pretext returns 0 (e.g. canvas
 * is unavailable during SSR or an unknown font is passed).
 *
 * @param word - The original word token (punctuation is stripped internally)
 * @param font - CSS font string, e.g. `buildFont(fontSizes.sm)` → "400 16px Inter"
 */
export function getWordMaskWidthWithFont(word: string, font: string): number {
  const text = stripPunctuation(word) || word;
  const textWidth = measureTextWidth(text, font);

  if (textWidth > 0) {
    return Math.max(
      WORD_MASK_MIN_WIDTH_PX,
      Math.ceil(textWidth) + WORD_MASK_HORIZONTAL_PADDING_PX + WORD_MASK_BORDER_ALLOWANCE_PX,
    );
  }

  // Graceful fallback: use the original letter-count estimate
  return getWordMaskWidth(word);
}

interface VisibleChoiceInput {
  displayText: string;
  normalized: string;
  totalCount?: number;
}

export interface VisibleChoiceLayoutOptions {
  trayWidth: number;
  trayHeight: number;
  estimatedCharWidthPx?: number;
  baseWidthPx?: number;
  minChoiceWidthPx?: number;
  gapPx?: number;
  rowHeightPx?: number;
  verticalPaddingPx?: number;
  fallbackRows?: number;
  leadingContextChoices?: number;
}

function getEffectiveTrayWidth(trayWidth: number) {
  if (Number.isFinite(trayWidth) && trayWidth >= MIN_CHOICE_TRAY_WIDTH) {
    return Math.floor(trayWidth);
  }

  return DEFAULT_CHOICE_TRAY_WIDTH;
}

function getEffectiveTrayHeight(trayHeight: number) {
  if (Number.isFinite(trayHeight) && trayHeight >= MIN_CHOICE_TRAY_HEIGHT) {
    return Math.floor(trayHeight);
  }

  return DEFAULT_CHOICE_TRAY_HEIGHT;
}

function resolveChoiceLayout(options: VisibleChoiceLayoutOptions) {
  const trayWidth = getEffectiveTrayWidth(options.trayWidth);
  const trayHeight = getEffectiveTrayHeight(options.trayHeight);
  const gapPx = options.gapPx ?? CHOICE_GAP_PX;
  const minChoiceWidthPx = options.minChoiceWidthPx ?? CHOICE_MIN_WIDTH_PX;
  const rowHeightPx = options.rowHeightPx ?? CHOICE_ROW_HEIGHT_PX;
  const verticalPaddingPx = options.verticalPaddingPx ?? CHOICE_VERTICAL_PADDING_PX;
  const fallbackRows = options.fallbackRows ?? CHOICE_FALLBACK_ROWS;
  const estimatedCharWidthPx = options.estimatedCharWidthPx ?? CHOICE_CHAR_WIDTH_PX;
  const baseWidthPx = options.baseWidthPx ?? CHOICE_BASE_WIDTH_PX;
  const leadingContextChoices = options.leadingContextChoices ?? MAX_LEADING_CONTEXT_CHOICES;
  const usableHeight = Math.max(rowHeightPx, trayHeight - verticalPaddingPx);
  const measuredRows = Math.floor((usableHeight + gapPx) / (rowHeightPx + gapPx));
  const maxRows = clamp(measuredRows || fallbackRows, 1, MAX_VISIBLE_CHOICE_ROWS);
  const estimatedMaxPerRow = Math.max(
    1,
    Math.floor((trayWidth + gapPx) / (minChoiceWidthPx + gapPx))
  );

  return {
    trayWidth,
    gapPx,
    minChoiceWidthPx,
    estimatedCharWidthPx,
    baseWidthPx,
    maxRows,
    maxVisibleItems: Math.max(1, estimatedMaxPerRow * maxRows),
    leadingContextChoices,
  };
}

function estimateChoiceWidth(
  choice: VisibleChoiceInput,
  trayWidth: number,
  estimatedCharWidthPx: number,
  baseWidthPx: number,
  minChoiceWidthPx: number,
) {
  const textWidth = Math.ceil(choice.displayText.length * estimatedCharWidthPx);

  return clamp(
    textWidth + baseWidthPx,
    minChoiceWidthPx,
    trayWidth
  );
}

function packChoiceWindow<T extends VisibleChoiceInput>(
  choices: T[],
  startIndex: number,
  layout: ReturnType<typeof resolveChoiceLayout>,
): T[] {
  if (choices.length === 0 || startIndex >= choices.length) return [];

  const result: T[] = [];
  let currentRow = 1;
  let currentRowWidth = 0;

  for (let index = startIndex; index < choices.length; index += 1) {
    if (result.length >= layout.maxVisibleItems) break;

    const choice = choices[index];
    const width = estimateChoiceWidth(
      choice,
      layout.trayWidth,
      layout.estimatedCharWidthPx,
      layout.baseWidthPx,
      layout.minChoiceWidthPx
    );
    const nextRowWidth =
      currentRowWidth === 0 ? width : currentRowWidth + layout.gapPx + width;

    if (result.length === 0 || nextRowWidth <= layout.trayWidth) {
      result.push(choice);
      currentRowWidth = nextRowWidth;
      continue;
    }

    if (currentRow < layout.maxRows) {
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
  layoutOptions: VisibleChoiceLayoutOptions,
): T[] {
  if (orderedChoices.length === 0) return [];

  const hasRemaining = (choice: T) =>
    (remainingCountByNormalized.get(choice.normalized) ?? 0) > 0;

  const remainingChoices = orderedChoices.filter(hasRemaining);
  if (remainingChoices.length === 0) return [];

  const layout = resolveChoiceLayout(layoutOptions);
  const defaultWindow = packChoiceWindow(remainingChoices, 0, layout);
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

  let startIndex = Math.max(0, correctIndex - layout.leadingContextChoices);
  let visibleChoices = packChoiceWindow(remainingChoices, startIndex, layout);

  while (startIndex > 0 && visibleChoices.length < defaultWindow.length) {
    const candidateStartIndex = startIndex - 1;
    const candidateWindow = packChoiceWindow(remainingChoices, candidateStartIndex, layout);

    if (!candidateWindow.some((choice) => choice.normalized === correctNormalized)) {
      break;
    }

    visibleChoices = candidateWindow;
    startIndex = candidateStartIndex;
  }

  return visibleChoices.length > 0 ? visibleChoices : defaultWindow;
}
