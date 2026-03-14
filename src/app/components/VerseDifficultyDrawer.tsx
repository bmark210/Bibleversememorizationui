"use client";

import React from "react";
import { BookOpen, Bookmark, Brain, Info, Trophy, type LucideIcon } from "lucide-react";
import type { Verse } from "@/app/App";
import { getVerseDifficultyBadgeClassName } from "@/app/utils/verseDifficulty";
import {
  EASY_THRESHOLD,
  HARD_THRESHOLD,
  MEDIUM_THRESHOLD,
  VERSE_DIFFICULTY_LABELS_RU,
  type VerseDifficultyLevel,
} from "@/shared/verses/difficulty";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { cn } from "./ui/utils";

type VerseDifficultyDrawerProps = {
  verse: Verse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DifficultyItem = {
  level: VerseDifficultyLevel;
  icon: LucideIcon;
  description: string;
};

const DIFFICULTY_ITEMS: DifficultyItem[] = [
  {
    level: "EASY",
    icon: Bookmark,
    description: "Короткий и легкий для первого захода формат.",
  },
  {
    level: "MEDIUM",
    icon: BookOpen,
    description: "Умеренная длина, требует чуть больше внимания.",
  },
  {
    level: "HARD",
    icon: Brain,
    description: "Длинный или насыщенный отрывок, обычно требует больше повторов.",
  },
  {
    level: "EXPERT",
    icon: Trophy,
    description: "Самый объемный формат с максимальной сложностью.",
  },
];

function getDifficultyRangeLabel(level: VerseDifficultyLevel): string {
  if (level === "EASY") return `До ${EASY_THRESHOLD} букв`;
  if (level === "MEDIUM") {
    return `${EASY_THRESHOLD + 1} - ${MEDIUM_THRESHOLD} букв`;
  }
  if (level === "HARD") {
    return `${MEDIUM_THRESHOLD + 1} - ${HARD_THRESHOLD} букв`;
  }
  return `От ${HARD_THRESHOLD + 1} букв`;
}

export function VerseDifficultyDrawer({
  verse,
  open,
  onOpenChange,
}: VerseDifficultyDrawerProps) {
  const currentLevel = verse?.difficultyLevel ?? null;
  const currentItem =
    currentLevel != null
      ? DIFFICULTY_ITEMS.find((item) => item.level === currentLevel) ?? null
      : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="rounded-t-[32px] border-border/70 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl backdrop-blur-xl sm:px-6">
        <DrawerHeader className="px-0 pb-0 pt-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
              {currentItem ? (
                <currentItem.icon className="h-4.5 w-4.5 text-foreground/72" />
              ) : (
                <Info className="h-4.5 w-4.5 text-foreground/60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="truncate text-lg text-foreground">
                Уровень сложности
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-foreground/56">
                {verse?.reference ?? "Стих"} · пояснение к плашке
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        {verse && currentLevel && currentItem ? (
          <div className="mt-5 max-h-[72vh] space-y-4 overflow-y-auto overscroll-contain pr-1">
            <section className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    getVerseDifficultyBadgeClassName(currentLevel)
                  )}
                >
                  {VERSE_DIFFICULTY_LABELS_RU[currentLevel]}
                </span>
                <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/60">
                  {getDifficultyRangeLabel(currentLevel)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-foreground/72">
                Плашка показывает примерную сложность стиха по длине текста.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-foreground/56">
                Мы считаем только буквы, без пробелов и знаков препинания.
                Уровень также влияет на XP за стих.
              </p>
            </section>

            <section className="rounded-3xl border border-border/60 bg-background/70 p-2">
              <div className="divide-y divide-border/50">
                {DIFFICULTY_ITEMS.map((item) => {
                  const isCurrent = item.level === currentLevel;

                  return (
                    <div
                      key={item.level}
                      className={cn(
                        "px-3 py-3",
                        isCurrent ? "rounded-2xl bg-primary/[0.04]" : ""
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground/88">
                          {VERSE_DIFFICULTY_LABELS_RU[item.level]}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                            getVerseDifficultyBadgeClassName(item.level)
                          )}
                        >
                          {getDifficultyRangeLabel(item.level)}
                        </span>
                        {isCurrent ? (
                          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/48">
                            Этот стих
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/62">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-border/60 bg-background/70 p-4 text-sm text-foreground/68">
            Выберите стих, чтобы увидеть пояснение по его уровню сложности.
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
