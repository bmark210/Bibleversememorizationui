"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/app/components/ui/utils";
import type { TrainingProgressPopupPayload } from "./trainingProgressFeedback";

type TrainingProgressPopupProps = {
  popup: TrainingProgressPopupPayload | null;
  className?: string;
};

const xpDeltaFormatter = new Intl.NumberFormat("ru-RU");

function formatXpDelta(value: number) {
  const sign = value > 0 ? "+" : "-";
  return `${sign}${xpDeltaFormatter.format(Math.abs(value))} XP`;
}

export function TrainingProgressPopup({
  popup,
  className,
}: TrainingProgressPopupProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-4 pt-2 sm:px-6",
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence initial={false}>
        {popup ? (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{
              duration: 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "w-full max-w-md overflow-hidden rounded-[28px] border shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)] backdrop-blur-2xl",
              popup.tone === "positive"
                ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.12] via-background/96 to-amber-500/[0.10]"
                : "border-rose-500/30 bg-gradient-to-br from-rose-500/[0.12] via-background/96 to-background"
            )}
          >
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0",
                popup.tone === "positive"
                  ? "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_52%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.14),transparent_56%)]"
                  : "bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(225,29,72,0.14),transparent_56%)]"
              )}
            />
            <div className="relative flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.18em]",
                    popup.tone === "positive"
                      ? "text-emerald-800/80 dark:text-emerald-300/85"
                      : "text-rose-800/80 dark:text-rose-300/85"
                  )}
                >
                  {popup.title}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground/90">
                  {popup.reference}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-medium",
                      popup.tone === "positive"
                        ? "border-emerald-500/25 bg-emerald-500/[0.10] text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/25 bg-rose-500/[0.10] text-rose-800 dark:text-rose-300"
                    )}
                  >
                    {popup.stageLabel}
                  </span>
                  {popup.detail ? (
                    <span className="truncate text-foreground/65">
                      {popup.detail}
                    </span>
                  ) : null}
                </div>
              </div>

              {popup.xpDelta !== 0 ? (
                <div
                  className={cn(
                    "shrink-0 rounded-[20px] border px-3 py-2 text-sm font-bold",
                    popup.tone === "positive"
                      ? "border-emerald-500/25 bg-emerald-500/[0.12] text-emerald-800 dark:text-emerald-300"
                      : "border-rose-500/25 bg-rose-500/[0.12] text-rose-800 dark:text-rose-300"
                  )}
                >
                  {formatXpDelta(popup.xpDelta)}
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
