"use client";

import { Badge } from "./ui/badge";
import { VerseStatus } from "@/generated/prisma";

const getMasteryColor = (status: VerseStatus) => {
  if (status === VerseStatus.STOPPED) return "text-destructive";
  if (status === VerseStatus.NEW) return "text-destructive";
  if (status === VerseStatus.LEARNING) return "text-orange-500";
  if (status === VerseStatus.MASTERED) return "text-[#059669]";
};

const getMasteryLabel = (status: VerseStatus) => {
  if (status === VerseStatus.STOPPED) return "Остановлено";
  if (status === VerseStatus.NEW) return "Новое";
  if (status === VerseStatus.LEARNING) return "Изучение";
  if (status === VerseStatus.MASTERED) return "Освоено";

  return "Освоено";
};

type MasteryBadgeProps = {
  status: VerseStatus;
};

export function MasteryBadge({ status }: MasteryBadgeProps) {
  return (
    <Badge variant="outline" className={`text-xs ${getMasteryColor(status)}`}>
      {getMasteryLabel(status)}
    </Badge>
  );
}
