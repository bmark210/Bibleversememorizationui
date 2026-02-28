"use client";

import { Badge } from "./ui/badge";
import { VerseStatus } from "@/generated/prisma";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";

const getMasteryColor = (status: DisplayVerseStatus) => {
  if (status === VerseStatus.STOPPED) return "text-destructive";
  if (status === "CATALOG") return "text-gray-600";
  if (status === VerseStatus.MY) return "text-sky-600";
  if (status === "MASTERED") return "text-emerald-600";
  if (status === "REVIEW") return "text-violet-600";
  if (status === VerseStatus.LEARNING) return "text-orange-500";
  return "text-foreground";
};

const getMasteryLabel = (status: DisplayVerseStatus) => {
  if (status === VerseStatus.STOPPED) return "Остановлено";
  if (status === VerseStatus.MY) return "Мой";
  if (status === "CATALOG") return "Каталог";
  if (status === "REVIEW") return "Повторение";
  if (status === "MASTERED") return "Выучено";
  return "Изучение";
};

type MasteryBadgeProps = {
  status: DisplayVerseStatus;
  masteryLevel: number;
};

export function MasteryBadge({ status, masteryLevel }: MasteryBadgeProps) {
  return (
    <Badge variant="outline" className={`text-xs ${getMasteryColor(status)}`}>
      {getMasteryLabel(status)}
    </Badge>
  );
}
