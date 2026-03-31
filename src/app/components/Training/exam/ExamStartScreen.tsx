"use client";

import { GraduationCap, Lock } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import type { ExamEligibleVersesResponse, LearningCapacityResponse } from "./types";
import { EXAM_MIN_ELIGIBLE } from "./types";

function formatCooldownLabel(cooldownUntil: string): string {
  const diff = new Date(cooldownUntil).getTime() - Date.now();
  if (diff <= 0) return "";
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  return `Следующий экзамен через ${hours} ч.`;
}

function pluralVerses(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "стих";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "стиха";
  return "стихов";
}

interface ExamStartScreenProps {
  eligible: ExamEligibleVersesResponse;
  capacity: LearningCapacityResponse | null;
  onStart: () => void;
  onClose: () => void;
}

export function ExamStartScreen({
  eligible,
  capacity,
  onStart,
  onClose,
}: ExamStartScreenProps) {
  const locked = !eligible.canStart;
  const cooldownLabel =
    eligible.cooldownUntil ? formatCooldownLabel(eligible.cooldownUntil) : null;
  const notEnoughLabel =
    !locked
      ? null
      : cooldownLabel ??
        `Нужно минимум ${EXAM_MIN_ELIGIBLE} ${pluralVerses(EXAM_MIN_ELIGIBLE)} в повторении (repetitions ≥ 2). Сейчас доступно: ${eligible.totalCount}.`;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <GraduationCap className="h-5 w-5 text-amber-500" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Экзамен</h2>
          <p className="text-xs text-text-secondary">
            Подтверди знание стихов — получи новые слоты
          </p>
        </div>
      </div>

      {/* Eligible verses count */}
      <div className="rounded-[1.4rem] border border-border-subtle bg-bg-elevated px-4 py-3.5 shadow-[var(--shadow-soft)]">
        <p className="text-sm font-medium text-text-primary">
          Стихов для проверки
        </p>
        <p className="mt-0.5 text-2xl font-bold text-amber-500">
          {eligible.totalCount}
          <span className="ml-1.5 text-sm font-normal text-text-secondary">
            из&nbsp;{EXAM_MIN_ELIGIBLE} минимум
          </span>
        </p>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">
          Стихи в фазе повторения (≥&nbsp;2 успешных повторения). Оценивается
          знание ссылки и начала стиха.
        </p>
      </div>

      {/* Capacity info */}
      {capacity && (
        <div className="rounded-[1.4rem] border border-border-subtle bg-bg-elevated px-4 py-3.5 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-medium text-text-primary">Слоты изучения</p>
          <p className="mt-0.5 text-2xl font-bold text-text-primary">
            {capacity.activeLearning}
            <span className="ml-1.5 text-sm font-normal text-text-secondary">
              / {capacity.capacity}
            </span>
          </p>
          {capacity.canAddMore ? (
            <p className="mt-1 text-xs text-text-secondary">
              Можно добавить ещё{" "}
              <span className="font-medium text-status-learning">
                {capacity.capacity - capacity.activeLearning}
              </span>{" "}
              {pluralVerses(capacity.capacity - capacity.activeLearning)} в изучение
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-500">
              Слоты заполнены. Пройди экзамен, чтобы подтвердить знание и
              открыть новые.
            </p>
          )}
        </div>
      )}

      {/* Exam rules */}
      <div className="rounded-[1.4rem] border border-border-subtle bg-bg-surface px-4 py-3.5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Как проходит
        </p>
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li className="flex gap-2">
            <span className="mt-0.5 text-amber-500">1.</span>
            <span>По каждому стиху — 2 вопроса: ссылка и начало</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-amber-500">2.</span>
            <span>Правильный ответ с первой попытки — стих засчитан</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-amber-500">3.</span>
            <span>
              За каждые 3 подтверждённых стиха открывается 1 новый слот
            </span>
          </li>
        </ul>
      </div>

      <div className="flex-1" />

      {/* CTA */}
      {locked ? (
        <div className="space-y-2">
          <Button
            type="button"
            size="lg"
            disabled
            className="h-12 w-full gap-2 rounded-2xl border border-border-subtle !bg-bg-surface text-sm font-medium text-text-muted shadow-none"
          >
            <Lock className="h-4 w-4" />
            Экзамен недоступен
          </Button>
          {notEnoughLabel && (
            <p className="px-1 text-xs leading-relaxed text-text-secondary">
              {notEnoughLabel}
            </p>
          )}
        </div>
      ) : (
        <Button
          type="button"
          size="lg"
          haptic="medium"
          onClick={onStart}
          className="h-12 w-full gap-2 rounded-2xl border border-amber-500/30 bg-amber-500 text-sm font-medium text-white !shadow-none hover:bg-amber-400"
        >
          <GraduationCap className="h-4 w-4" />
          Начать экзамен ({eligible.verses.length} стихов)
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClose}
        className={cn("w-full rounded-2xl text-text-muted")}
      >
        Закрыть
      </Button>
    </div>
  );
}
