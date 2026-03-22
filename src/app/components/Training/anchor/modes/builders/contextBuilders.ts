/**
 * Context-track question builder:
 * Shows a nearby verse (1–3 positions away) WITHOUT its reference.
 * The user must enter the reference of their memorized verse.
 */

import type { TrainingVerse, TypeQuestion } from "../../types";
import { matchesReferenceWithTolerance } from "../../services/validation";
import {
  CONFIG,
  hasContextPrompt,
  buildContextPrompt,
  getContextTargetDescriptor,
} from "./builderUtils";

// ---------------------------------------------------------------------------
// context-reference-type
// ---------------------------------------------------------------------------

/**
 * Builds a context question where the user sees a nearby verse
 * and must type the reference of their memorized verse.
 */
export function buildContextReferenceTypeQuestion(
  verse: TrainingVerse,
  order: number,
): TypeQuestion | null {
  if (!hasContextPrompt(verse)) return null;

  const promptText = buildContextPrompt(verse);
  if (!promptText) return null;

  const descriptor = getContextTargetDescriptor(verse);

  return {
    id: `context-reference-type-${order}-${verse.externalVerseId}`,
    modeId: "context-reference-type",
    modeHint: `Введите ссылку на ${descriptor}.`,
    verse,
    prompt: promptText,
    answerLabel: verse.reference,
    interaction: "type",
    placeholder: "Иоанна 3:16",
    maxAttempts: CONFIG.MAX_TYPING_ATTEMPTS,
    isCorrectInput: (value: string) =>
      matchesReferenceWithTolerance(value, verse.reference),
  };
}
