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
  onSessionCommitted?: () => void;
  onClose: () => void;
}

export function AnchorSession({
  telegramId,
  initialTrack,
  onSessionCommitted,
  onClose,
}: AnchorSessionProps) {
  return (
    <AnchorTrainingSession
      telegramId={telegramId}
      initialTrack={initialTrack}
      onSessionCommitted={onSessionCommitted}
      onClose={onClose}
    />
  );
}
