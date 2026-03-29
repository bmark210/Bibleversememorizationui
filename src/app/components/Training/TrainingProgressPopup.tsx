"use client";

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
      {popup ? (
        <div
          key={popup.id}
          className={cn(
            "w-full max-w-md overflow-hidden rounded-[28px] border shadow-[var(--shadow-floating)] backdrop-blur-2xl",
            popup.tone === "positive"
              ? "border-status-learning/25 bg-gradient-to-br from-status-learning-soft via-bg-elevated to-status-mastered-soft"
              : "border-status-paused/25 bg-gradient-to-br from-status-paused-soft via-bg-elevated to-bg-elevated"
          )}
        >
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0",
                popup.tone === "positive"
                  ? "bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-olive-rgb),0.2),transparent_52%),radial-gradient(circle_at_bottom_left,rgba(var(--accent-gold-rgb),0.14),transparent_56%)]"
                  : "bg-[radial-gradient(circle_at_top_right,rgba(var(--accent-wine-rgb),0.18),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(var(--accent-bronze-rgb),0.12),transparent_56%)]"
              )}
            />
            <div className="relative flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.18em]",
                    popup.tone === "positive"
                      ? "text-status-learning/85"
                      : "text-status-paused/85"
                  )}
                >
                  {popup.title}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-text-primary">
                  {popup.reference}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-medium",
                      popup.tone === "positive"
                        ? "border-status-learning/25 bg-status-learning-soft text-status-learning"
                        : "border-status-paused/25 bg-status-paused-soft text-status-paused"
                    )}
                  >
                    {popup.stageLabel}
                  </span>
                  {popup.detail ? (
                    <span className="truncate text-text-secondary">
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
                      ? "border-status-learning/25 bg-status-learning-soft text-status-learning"
                      : "border-status-paused/25 bg-status-paused-soft text-status-paused"
                  )}
                >
                  {formatXpDelta(popup.xpDelta)}
                </div>
              ) : null}
            </div>
        </div>
      ) : null}
    </div>
  );
}
