import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFlashcardSessionCards,
  buildRandomFlashcardModeDeck,
} from "./flashcardSessionModel";

function createRandomSequence(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test("buildRandomFlashcardModeDeck keeps modes balanced", () => {
  const deck = buildRandomFlashcardModeDeck(
    6,
    createRandomSequence([0.1, 0.9, 0.2, 0.8, 0.3, 0.7]),
  );

  assert.equal(deck.length, 6);
  assert.equal(deck.filter((mode) => mode === "reference").length, 3);
  assert.equal(deck.filter((mode) => mode === "verse").length, 3);
});

test("buildFlashcardSessionCards assigns a mode to each mapped card", () => {
  const cards = buildFlashcardSessionCards(
    [
      { externalVerseId: "45-8-1", text: "a", reference: "Рим 8:1" },
      { externalVerseId: "45-8-2", text: "b", reference: "Рим 8:2" },
      { externalVerseId: "45-8-3", text: "c", reference: "Рим 8:3" },
      { externalVerseId: "45-8-4", text: "d", reference: "Рим 8:4" },
    ],
    createRandomSequence([0.4, 0.2, 0.8, 0.1, 0.6]),
  );

  assert.equal(cards.length, 4);
  assert.deepEqual(cards.map((card) => card.mode).sort(), [
    "reference",
    "reference",
    "verse",
    "verse",
  ]);
});
