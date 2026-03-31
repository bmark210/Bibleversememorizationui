"use client";

import { Check, GraduationCap, X } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import type { ExamSessionOutput } from "./types";
import type { VerseResultEntry } from "./ExamSession";

interface ExamResultScreenProps {
  output: ExamSessionOutput;
  verseResults: VerseResultEntry[];
  onClose: () => void;
}

function pluralVerses(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "стих";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "стиха";
  return "стихов";
}

export function ExamResultScreen({
  output,
  verseResults,
  onClose,
}: ExamResultScreenProps) {
  const passPercent =
    output.verseCount > 0
      ? Math.round((output.passCount / output.verseCount) * 100)
      : 0;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header result banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-[1.4rem] border px-4 py-4",
          output.passed
            ? "border-amber-500/25 bg-amber-500/10"
            : "border-border-subtle bg-bg-elevated",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            output.passed
              ? "border-amber-500/25 bg-amber-500/15 text-amber-500"
              : "border-border-subtle bg-bg-surface text-text-muted",
          )}
        >
          <GraduationCap className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-base font-semibold",
              output.passed ? "text-amber-500" : "text-text-secondary",
            )}
          >
            {output.passed ? "Экзамен пройден!" : "Попробуй ещё раз"}
          </p>
          <p className="text-sm text-text-secondary">
            {output.passCount} из {output.verseCount}{" "}
            {pluralVerses(output.verseCount)} — {passPercent}%
          </p>
        </div>
      </div>

      {/* Capacity unlock */}
      {output.newlyConfirmedCount > 0 && (
        <div className="rounded-[1.4rem] border border-status-learning/20 bg-status-learning-soft px-4 py-3.5">
          <p className="text-sm font-semibold text-status-learning">
            +{output.newlyConfirmedCount} новых{" "}
            {pluralVerses(output.newlyConfirmedCount)} подтверждено
          </p>
          <p className="mt-0.5 text-xs text-status-learning/80">
            Новая ёмкость изучения: {output.newCapacity} слотов
          </p>
        </div>
      )}

      {/* Per-verse results */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-[1.4rem] border border-border-subtle bg-bg-elevated pb-2 shadow-[var(--shadow-soft)]">
        <div className="px-4 pt-3.5 pb-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
            Результаты
          </p>
        </div>
        <div className="divide-y divide-border-subtle">
          {verseResults.map((r) => (
            <div
              key={r.externalVerseId}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  r.passed
                    ? "bg-status-learning/15 text-status-learning"
                    : "bg-bg-surface text-text-muted",
                )}
              >
                {r.passed ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {r.reference || r.externalVerseId}
                </p>
                {r.text && (
                  <p className="truncate text-xs text-text-secondary">
                    {r.text.split(" ").slice(0, 6).join(" ")}…
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        size="lg"
        haptic="light"
        onClick={onClose}
        className="h-12 w-full rounded-2xl border border-amber-500/30 bg-amber-500 text-sm font-medium text-white !shadow-none hover:bg-amber-400"
      >
        Готово
      </Button>
    </div>
  );
}
