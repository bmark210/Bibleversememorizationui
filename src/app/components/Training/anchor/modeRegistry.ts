/**
 * Mode registry — all 13 training strategies registered in one place.
 * To add a new mode: write a builder, then add an entry here.
 */

import type { ModeStrategy } from "./types/modeRegistry";
import { extractWordTokens } from "./services/validation";

import {
  buildReferenceChoiceQuestion,
  buildBookChoiceQuestion,
  buildReferenceTypeQuestion,
} from "./modes/builders/referenceBuilders";
import {
  buildIncipitChoiceQuestion,
  buildIncipitTapQuestion,
  buildIncipitTypeQuestion,
} from "./modes/builders/incipitBuilders";
import { buildEndingChoiceQuestion } from "./modes/builders/endingBuilders";
import {
  buildContextReferenceChoiceQuestion,
  buildContextReferenceTypeQuestion,
} from "./modes/builders/contextBuilders";
import {
  buildBrokenMirrorQuestion,
  buildSkeletonVerseQuestion,
} from "./modes/builders/recallBuilders";
import { buildImpostorWordQuestion } from "./modes/builders/aiBuilders";
import { hasContextPrompt } from "./modes/builders/builderUtils";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const MODE_STRATEGIES: readonly ModeStrategy[] = [
  // --- reference ---
  {
    id: "reference-choice",
    group: "reference-v1",
    category: "client",
    interaction: "choice",
    hint: "Выберите правильную ссылку",
    weight: 2,
    requiresAI: false,
    canBuild: (verse, pool) =>
      buildReferenceChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) =>
      buildReferenceChoiceQuestion(verse, pool, order),
  },
  {
    id: "book-choice",
    group: "reference-v1",
    category: "client",
    interaction: "choice",
    hint: "Выберите правильную книгу",
    weight: 1,
    requiresAI: false,
    canBuild: (verse, pool) =>
      buildBookChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) =>
      buildBookChoiceQuestion(verse, pool, order),
  },
  {
    id: "reference-type",
    group: "reference-v2",
    category: "client",
    interaction: "type",
    hint: "Введите ссылку вручную",
    weight: 2,
    requiresAI: false,
    canBuild: () => true,
    buildQuestion: (verse, _pool, order) =>
      buildReferenceTypeQuestion(verse, order),
  },

  // --- incipit ---
  {
    id: "incipit-choice",
    group: "incipit",
    category: "client",
    interaction: "choice",
    hint: "Выберите правильное начало стиха",
    weight: 2,
    requiresAI: false,
    canBuild: (verse, pool) =>
      buildIncipitChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) =>
      buildIncipitChoiceQuestion(verse, pool, order),
  },
  {
    id: "incipit-tap",
    group: "incipit",
    category: "client",
    interaction: "tap",
    hint: "Соберите начало стиха по словам",
    weight: 1,
    requiresAI: false,
    canBuild: (verse, pool) =>
      buildIncipitTapQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) =>
      buildIncipitTapQuestion(verse, pool, order),
  },
  {
    id: "incipit-type",
    group: "incipit",
    category: "client",
    interaction: "type",
    hint: "Введите первые буквы начала стиха",
    weight: 2,
    requiresAI: false,
    canBuild: (verse) =>
      buildIncipitTypeQuestion(verse, -1) !== null,
    buildQuestion: (verse, _pool, order) =>
      buildIncipitTypeQuestion(verse, order),
  },

  // --- ending ---
  {
    id: "ending-choice",
    group: "ending",
    category: "client",
    interaction: "choice",
    hint: "Выберите правильный конец стиха",
    weight: 2,
    requiresAI: false,
    canBuild: (verse, pool) =>
      buildEndingChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) =>
      buildEndingChoiceQuestion(verse, pool, order),
  },

  // --- context ---
  {
    id: "context-reference-choice",
    group: "context-v1",
    category: "client",
    interaction: "choice",
    hint: "Выберите ссылку на стих по контексту",
    weight: 2,
    requiresAI: false,
    canBuild: (verse, pool) =>
      hasContextPrompt(verse) &&
      buildContextReferenceChoiceQuestion(verse, pool, -1) !== null,
    buildQuestion: (verse, pool, order) =>
      buildContextReferenceChoiceQuestion(verse, pool, order),
  },
  {
    id: "context-reference-type",
    group: "context-v2",
    category: "client",
    interaction: "type",
    hint: "Введите ссылку на стих по контексту",
    weight: 3,
    requiresAI: false,
    canBuild: (verse) =>
      hasContextPrompt(verse) &&
      buildContextReferenceTypeQuestion(verse, -1) !== null,
    buildQuestion: (verse, _pool, order) =>
      buildContextReferenceTypeQuestion(verse, order),
  },

  // --- recall (new MVP) ---
  {
    id: "broken-mirror",
    group: "broken-mirror",
    category: "client",
    interaction: "drag",
    hint: "Расположите фрагменты стиха в правильном порядке",
    weight: 2,
    requiresAI: false,
    canBuild: (verse) => extractWordTokens(verse.text).length >= 8,
    buildQuestion: (verse, pool, order) =>
      buildBrokenMirrorQuestion(verse, pool, order),
  },
  {
    id: "skeleton-verse",
    group: "skeleton-verse",
    category: "client",
    interaction: "type",
    hint: "Восстановите текст стиха по первым буквам",
    weight: 2,
    requiresAI: false,
    canBuild: (verse) => extractWordTokens(verse.text).length >= 4,
    buildQuestion: (verse, pool, order) =>
      buildSkeletonVerseQuestion(verse, pool, order),
  },

  // --- AI (new MVP) ---
  {
    id: "impostor-word",
    group: "impostor-word",
    category: "ai",
    interaction: "choice",
    hint: "Найдите слово, которое было заменено",
    weight: 2,
    requiresAI: true,
    canBuild: (_verse, _pool, aiAvailable) =>
      aiAvailable && extractWordTokens(_verse.text).length >= 5,
    buildQuestion: (verse, pool, order, aiData) =>
      buildImpostorWordQuestion(verse, pool, order, aiData),
  },
];

// ---------------------------------------------------------------------------
// Weighted random pick
// ---------------------------------------------------------------------------

export function pickWeightedStrategy(
  strategies: readonly ModeStrategy[],
): ModeStrategy | null {
  if (strategies.length === 0) return null;

  const totalWeight = strategies.reduce(
    (sum, s) => sum + Math.max(1, s.weight),
    0,
  );

  let rand = Math.random() * totalWeight;
  for (const s of strategies) {
    rand -= Math.max(1, s.weight);
    if (rand <= 0) return s;
  }

  return strategies[strategies.length - 1] ?? null;
}
