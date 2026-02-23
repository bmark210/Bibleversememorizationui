"use client";

import { Badge } from "./ui/badge";
import { VerseStatus } from "@/generated/prisma";
import { TRAINING_STAGE_MASTERY_MAX } from "@/shared/training/constants";

const getMasteryColor = (status: VerseStatus, masteryLevel: number) => {
  if (status === VerseStatus.STOPPED) return "text-destructive";
  if (status === VerseStatus.NEW) return "text-destructive";
  if (status === VerseStatus.LEARNING) return masteryLevel < TRAINING_STAGE_MASTERY_MAX ? "text-orange-500" : "text-violet-600";
};

const getMasteryLabel = (status: VerseStatus, masteryLevel: number) => {
  if (status === VerseStatus.STOPPED) return "Остановлено";
  if (status === VerseStatus.NEW) return "Новый";
  if (status === VerseStatus.LEARNING) return masteryLevel < TRAINING_STAGE_MASTERY_MAX ? "Изучение" : "Повторение";

  return "Освоено";
};

type MasteryBadgeProps = {
  status: VerseStatus;
  masteryLevel: number;
};

export function MasteryBadge({ status, masteryLevel }: MasteryBadgeProps) {
  return (
    <Badge variant="outline" className={`text-xs ${getMasteryColor(status, masteryLevel)}`}>
      {getMasteryLabel(status, masteryLevel)}
    </Badge>
  );
}
