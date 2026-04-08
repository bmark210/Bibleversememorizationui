"use client";

import dynamic from "next/dynamic";
import type { FlashcardMode } from "../types";

const FlashcardSessionDynamic = dynamic(
  () =>
    import("@/app/components/Training/flashcard/FlashcardSession").then(
      (m) => m.FlashcardSession,
    ),
  { loading: () => <div className="min-h-[60vh]" /> },
);

export type FlashcardSessionRootProps = {
  telegramId: string | null;
  boxId: string;
  flashcardMode: FlashcardMode;
  onClose: () => void;
  onSessionCommitted?: () => void;
};

export function FlashcardSessionRoot(props: FlashcardSessionRootProps) {
  return <FlashcardSessionDynamic {...props} />;
}
