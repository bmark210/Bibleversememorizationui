import type { FlashcardMode } from "../types";
import type { FlashcardVerseItem } from "./services/flashcardApi";

export type FlashcardCardStatus = "hidden" | "revealed" | "answered";

export type FlashcardSessionCard = {
  externalVerseId: string;
  text: string;
  reference: string;
  mode: FlashcardMode;
  status: FlashcardCardStatus;
  remembered: boolean | null;
};

function pickRandomFlashcardMode(random: () => number): FlashcardMode {
  return random() < 0.5 ? "reference" : "verse";
}

export function buildRandomFlashcardModeDeck(
  count: number,
  random: () => number = Math.random,
): FlashcardMode[] {
  if (count <= 0) {
    return [];
  }

  const extraMode = pickRandomFlashcardMode(random);
  const referenceCount =
    Math.floor(count / 2) +
    (count % 2 === 1 && extraMode === "reference" ? 1 : 0);
  const verseCount = count - referenceCount;

  const deck: FlashcardMode[] = [
    ...Array.from({ length: referenceCount }, () => "reference" as const),
    ...Array.from({ length: verseCount }, () => "verse" as const),
  ];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex]!, deck[index]!];
  }

  return deck;
}

function mapVerseItem(
  v: FlashcardVerseItem,
): Omit<FlashcardSessionCard, "mode"> | null {
  const externalVerseId =
    v.verse?.externalVerseId ??
    (v as { externalVerseId?: string }).externalVerseId;
  if (!externalVerseId || !v.text || !v.reference) return null;
  return {
    externalVerseId,
    text: v.text,
    reference: v.reference,
    status: "hidden",
    remembered: null,
  };
}

export function buildFlashcardSessionCards(
  verses: FlashcardVerseItem[],
  random: () => number = Math.random,
): FlashcardSessionCard[] {
  const cards = verses
    .map(mapVerseItem)
    .filter(
      (card): card is Omit<FlashcardSessionCard, "mode"> => card !== null,
    );

  if (cards.length === 0) {
    return [];
  }

  const modeDeck = buildRandomFlashcardModeDeck(cards.length, random);
  return cards.map((card, index) => ({
    ...card,
    mode: modeDeck[index] ?? pickRandomFlashcardMode(random),
  }));
}
