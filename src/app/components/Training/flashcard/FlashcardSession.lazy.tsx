"use client";

import dynamic from "next/dynamic";

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
  onClose: () => void;
  onSessionCommitted?: () => void;
};

export function FlashcardSessionRoot(props: FlashcardSessionRootProps) {
  return <FlashcardSessionDynamic {...props} />;
}
