"use client";

import dynamic from "next/dynamic";
import type { AnchorTrainingTrack } from "../types";

const AnchorTrainingSession = dynamic(
  () =>
    import("@/app/components/Training/anchor/AnchorTrainingSession").then(
      (m) => m.AnchorTrainingSession,
    ),
  { loading: () => <div className="min-h-[60vh]" /> },
);

export type AnchorTrainingSessionRootProps = {
  telegramId: string | null;
  initialTrack: AnchorTrainingTrack;
  onSessionCommitted?: () => void;
  onClose: () => void;
};

export function AnchorTrainingSessionRoot(props: AnchorTrainingSessionRootProps) {
  return <AnchorTrainingSession {...props} />;
}
