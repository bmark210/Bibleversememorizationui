"use client";

import { TextsScreen } from "./texts/TextsScreen";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import type { TrainingBoxScope } from "@/app/types/textBox";

type VerseListProps = {
  reopenTextBoxId?: string | null;
  reopenTextBoxTitle?: string | null;
  onReopenTextBoxHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
  onNavigateToTraining?: (launch: DirectLaunchVerse) => void;
  onNavigateToTrainingBox?: (scope: TrainingBoxScope) => void;
  telegramId?: string | null;
};

export function VerseList(props: VerseListProps) {
  return <TextsScreen {...props} />;
}
