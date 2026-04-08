"use client";

import dynamic from "next/dynamic";

const AnchorTrainingSession = dynamic(
  () =>
    import("@/app/components/Training/anchor/AnchorTrainingSession").then(
      (m) => m.AnchorTrainingSession,
    ),
  { loading: () => <div className="min-h-[60vh]" /> },
);

import type { AnchorModeGroup } from "../types";
import type { Verse } from "@/app/domain/verse";

export type AnchorTrainingSessionRootProps = {
  telegramId: string | null;
  boxId: string;
  sourceVerses?: Verse[];
  anchorModes?: AnchorModeGroup[];
  onSessionCommitted?: () => void;
  onClose: () => void;
};

export function AnchorTrainingSessionRoot(
  props: AnchorTrainingSessionRootProps,
) {
  return <AnchorTrainingSession {...props} />;
}
