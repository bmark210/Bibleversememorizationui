"use client";

import dynamic from "next/dynamic";

const ReferenceTrainer = dynamic(
  () =>
    import("@/app/components/ReferenceTrainer/ReferenceTrainer").then(
      (m) => m.ReferenceTrainer
    ),
  { loading: () => <div className="min-h-[60vh]" /> }
);

interface AnchorSessionProps {
  telegramId: string | null;
}

export function AnchorSession({ telegramId }: AnchorSessionProps) {
  return <ReferenceTrainer telegramId={telegramId} />;
}
