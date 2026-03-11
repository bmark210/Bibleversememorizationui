"use client";

import dynamic from "next/dynamic";
import type { AnchorTrainingTrack } from "../types";

const AnchorTrainingSession = dynamic(
  () =>
    import("@/app/components/Training/anchor/AnchorTrainingSession").then(
      (m) => m.AnchorTrainingSession
    ),
  { loading: () => <div className="min-h-[60vh]" /> }
);

interface AnchorSessionProps {
  telegramId: string | null;
  initialTrack: AnchorTrainingTrack;
  bookId?: number;
  onSessionCommitted?: () => void;
  onClose: () => void;
}

export function AnchorSession({
  telegramId,
  initialTrack,
  bookId,
  onSessionCommitted,
  onClose,
}: AnchorSessionProps) {
  return (
    <AnchorTrainingSession
      telegramId={telegramId}
      initialTrack={initialTrack}
      bookId={bookId}
      onSessionCommitted={onSessionCommitted}
      onClose={onClose}
    />
  );
}
