"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";

export type DailyGoalCompletionPopupPayload = {
  dayKey: string;
  learningDone: number;
  learningTotal: number;
  reviewDone: number;
  reviewTotal: number;
  reviewSkipped: boolean;
  reviewPending: boolean;
};

type DailyGoalCompletionPopupProps = {
  popup: DailyGoalCompletionPopupPayload | null;
  onClose: () => void;
};

function formatDayKey(dayKey: string): string {
  const [yearRaw, monthRaw, dayRaw] = dayKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return dayKey;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return dayKey;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatPill(props: {
  title: string;
  value: string;
  className: string;
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-left", props.className)}>
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground/80">
        {props.title}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{props.value}</div>
    </div>
  );
}

export function DailyGoalCompletionPopup({
  popup,
  onClose,
}: DailyGoalCompletionPopupProps) {
  useEffect(() => {
    if (!popup) return;
    const timer = window.setTimeout(onClose, 12_000);
    return () => window.clearTimeout(timer);
  }, [popup, onClose]);

  useEffect(() => {
    if (!popup) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [popup, onClose]);

  return (
    <AnimatePresence>
      {popup ? (
        <motion.div
          key={popup.dayKey}
          className="fixed inset-0 z-[460] flex items-center justify-center bg-background/72 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Ежедневная цель выполнена"
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-background via-background to-emerald-500/6 p-6 shadow-[0_36px_80px_rgba(0,0,0,0.45)] sm:p-7"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/12 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl"
            />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Цель дня закрыта
              </div>

              <div className="mt-4 flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-500/35 bg-amber-500/14 text-amber-700 dark:text-amber-300">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold leading-tight sm:text-[1.9rem]">
                    Ежедневная цель выполнена
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDayKey(popup.dayKey)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatPill
                  title="Изучение"
                  value={`${popup.learningDone}/${popup.learningTotal}`}
                  className="border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                />
                <StatPill
                  title={popup.reviewSkipped ? "Повторение (пропущено)" : popup.reviewPending ? "Повторение (не готово)" : "Повторение"}
                  value={popup.reviewSkipped ? "Пропущено" : popup.reviewPending ? "Позже" : `${popup.reviewDone}/${popup.reviewTotal}`}
                  className="border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                />
              </div>

              <div className="mt-6 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Прогресс сохранён. Можно продолжать тренировку.
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button type="button" onClick={onClose} className="min-w-[130px]">
                  Отлично
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

