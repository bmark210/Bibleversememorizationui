"use client";

import { AnchorTrainingSession } from "@/app/components/Training/anchor/AnchorTrainingSession";
import type { AnchorTrainingTrack } from "@/app/components/Training/types";

type ReferenceTrainerProps = {
  telegramId: string | null;
  initialTrack?: AnchorTrainingTrack;
  onClose?: () => void;
};

export function ReferenceTrainer({
  telegramId,
  initialTrack,
  onClose,
}: ReferenceTrainerProps) {
  return (
    <AnchorTrainingSession
      telegramId={telegramId}
      initialTrack={initialTrack}
      onClose={onClose ?? (() => {})}
    />
  );
}
