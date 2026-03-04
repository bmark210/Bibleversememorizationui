export function normalizeComparableWord(word: string) {
  return word
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

export function normalizeComparableText(text: string) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function tokenizeComparableWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => normalizeComparableWord(word))
    .filter(Boolean);
}

function sanitizeGuidedInput(text: string) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+/g, '');
}

function joinGuidedWords(words: string[], trailingSpace: boolean) {
  const base = words.join(' ');
  if (!base) return '';
  return trailingSpace ? `${base} ` : base;
}

function startsWithPrefix(word: string, prefix: string) {
  if (!prefix) return false;
  return word.startsWith(prefix);
}

export interface GuidedInputAnalysis {
  normalizedInput: string;
  typedWords: string[];
  completedWords: string[];
  hasTrailingSpace: boolean;
  currentWordIndex: number;
  currentPrefix: string;
  expectedWord: string | null;
  expectedLetter: string | null;
}

export function analyzeGuidedInput(
  userInput: string,
  targetWords: string[]
): GuidedInputAnalysis {
  const normalizedInput = sanitizeGuidedInput(userInput);
  const hasTrailingSpace = normalizedInput.endsWith(' ');
  const typedWords = normalizedInput
    .split(' ')
    .map((word) => word.trim())
    .filter(Boolean);

  const completedWords = hasTrailingSpace
    ? typedWords
    : typedWords.slice(0, Math.max(typedWords.length - 1, 0));

  const currentWordIndex = hasTrailingSpace
    ? typedWords.length
    : Math.max(typedWords.length - 1, 0);

  const currentPrefix = hasTrailingSpace ? '' : (typedWords[typedWords.length - 1] ?? '');
  const expectedWord = targetWords[currentWordIndex] ?? null;
  const expectedLetter =
    expectedWord && currentPrefix.length < expectedWord.length
      ? expectedWord[currentPrefix.length] ?? null
      : null;

  return {
    normalizedInput,
    typedWords,
    completedWords,
    hasTrailingSpace,
    currentWordIndex,
    currentPrefix,
    expectedWord,
    expectedLetter,
  };
}

function shouldEarlyAutocompletePrefix(
  nextPrefix: string,
  expectedWord: string,
  remainingTargetWords: string[],
  minAutocompletePrefixLength: number
) {
  if (nextPrefix.length < minAutocompletePrefixLength) return false;
  if (nextPrefix.length >= expectedWord.length) return false;

  let matches = 0;
  let onlyMatch: string | null = null;

  for (const word of remainingTargetWords) {
    if (!startsWithPrefix(word, nextPrefix)) continue;
    matches += 1;
    onlyMatch = word;
    if (matches > 1) return false;
  }

  return matches === 1 && onlyMatch === expectedWord;
}

export type MobileFullRecallKeyResult =
  | { kind: 'accepted' | 'accepted_autocomplete'; nextInput: string; analysis: GuidedInputAnalysis; expectedLetter: string | null }
  | { kind: 'hard_mismatch'; nextInput: string; analysis: GuidedInputAnalysis; expectedLetter: string | null }
  | { kind: 'noop'; nextInput: string; analysis: GuidedInputAnalysis; expectedLetter: string | null };

export function applyMobileFullRecallKey(params: {
  userInput: string;
  key: string;
  targetWords: string[];
  minAutocompletePrefixLength?: number;
}): MobileFullRecallKeyResult {
  const {
    userInput,
    key,
    targetWords,
    minAutocompletePrefixLength = 3,
  } = params;

  const normalizedKey = normalizeComparableWord(key);
  const analysis = analyzeGuidedInput(userInput, targetWords);

  if (!normalizedKey) {
    return {
      kind: 'noop',
      nextInput: analysis.normalizedInput,
      analysis,
      expectedLetter: analysis.expectedLetter,
    };
  }

  if (!analysis.expectedWord) {
    return {
      kind: 'noop',
      nextInput: analysis.normalizedInput,
      analysis,
      expectedLetter: null,
    };
  }

  const nextPrefix = `${analysis.currentPrefix}${normalizedKey}`;
  if (!analysis.expectedWord.startsWith(nextPrefix)) {
    return {
      kind: 'hard_mismatch',
      nextInput: analysis.normalizedInput,
      analysis,
      expectedLetter: analysis.expectedLetter,
    };
  }

  let nextWord = nextPrefix;
  let kind: 'accepted' | 'accepted_autocomplete' = 'accepted';
  if (shouldEarlyAutocompletePrefix(
    nextPrefix,
    analysis.expectedWord,
    targetWords.slice(analysis.currentWordIndex),
    minAutocompletePrefixLength
  )) {
    nextWord = analysis.expectedWord;
    kind = 'accepted_autocomplete';
  }

  const completedCurrentWord = nextWord === analysis.expectedWord;
  const isLastWord = analysis.currentWordIndex >= targetWords.length - 1;
  const nextInput = joinGuidedWords(
    [...analysis.completedWords, nextWord],
    completedCurrentWord && !isLastWord
  );
  return {
    kind,
    nextInput,
    analysis,
    expectedLetter: analysis.expectedLetter,
  };
}

export type MobileFullRecallSpaceResult =
  | { kind: 'accepted' | 'accepted_autocomplete'; nextInput: string; analysis: GuidedInputAnalysis }
  | { kind: 'hard_mismatch'; nextInput: string; analysis: GuidedInputAnalysis }
  | { kind: 'noop'; nextInput: string; analysis: GuidedInputAnalysis };

export function applyMobileFullRecallSpace(params: {
  userInput: string;
  targetWords: string[];
}): MobileFullRecallSpaceResult {
  const { userInput, targetWords } = params;
  const analysis = analyzeGuidedInput(userInput, targetWords);

  if (!analysis.expectedWord) {
    // Already finished or nothing to type: keep normalized input, no duplicate spaces.
    return {
      kind: 'noop',
      nextInput: analysis.normalizedInput,
      analysis,
    };
  }

  if (analysis.hasTrailingSpace) {
    return {
      kind: 'noop',
      nextInput: analysis.normalizedInput,
      analysis,
    };
  }

  if (!analysis.currentPrefix) {
    return {
      kind: 'hard_mismatch',
      nextInput: analysis.normalizedInput,
      analysis,
    };
  }

  if (!analysis.expectedWord.startsWith(analysis.currentPrefix)) {
    return {
      kind: 'hard_mismatch',
      nextInput: analysis.normalizedInput,
      analysis,
    };
  }

  const completedWord = analysis.expectedWord;
  const nextCompletedWords = [...analysis.completedWords, completedWord];
  const isLastWord = analysis.currentWordIndex >= targetWords.length - 1;
  const nextInput = joinGuidedWords(nextCompletedWords, !isLastWord);

  return {
    kind: analysis.currentPrefix === completedWord ? 'accepted' : 'accepted_autocomplete',
    nextInput,
    analysis,
  };
}
