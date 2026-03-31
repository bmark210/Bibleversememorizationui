'use client';

import { GraduationCap, ListOrdered, Plus } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { LearningCapacityResponse } from '@/app/components/Training/exam/types';

type VerseListSlotCardProps = {
  learningCapacity: LearningCapacityResponse | null;
  onNavigateToCatalog: () => void;
  onNavigateToExam: () => void;
  queueCount?: number;
};

/** Dots showing filled / free / overflow slots */
function SlotPips({
  activeLearning,
  capacity,
}: {
  activeLearning: number;
  capacity: number;
}) {
  // Show at most 7 pips; if more — show number
  const maxPips = 7;
  const showPips = capacity <= maxPips;

  if (!showPips) {
    return (
      <span className="text-[11px] font-semibold tabular-nums text-text-muted">
        {activeLearning}/{capacity}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-[5px]">
      {Array.from({ length: capacity }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-[7px] w-[7px] rounded-full transition-colors',
            i < activeLearning
              ? 'bg-status-learning'
              : 'border border-border-subtle bg-bg-subtle',
          )}
        />
      ))}
    </div>
  );
}

export function VerseListSlotCard({
  learningCapacity,
  onNavigateToCatalog,
  onNavigateToExam,
  queueCount = 0,
}: VerseListSlotCardProps) {
  // Loading / no data yet — show a minimal "browse catalog" hint
  if (!learningCapacity) {
    return (
      <button
        type="button"
        onClick={onNavigateToCatalog}
        className={cn(
          'group mx-3 mt-1 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3.5 rounded-2xl',
          'border border-dashed border-border-subtle/60 bg-transparent px-4 py-3.5',
          'text-left transition-colors duration-200',
          'hover:border-border-subtle hover:bg-bg-subtle/50',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed border-border-subtle bg-bg-subtle/60">
          <Plus className="h-3.5 w-3.5 text-text-subtle" />
        </div>
        <p className="text-[13px] font-medium text-text-subtle">
          Добавить стих в свои стихи
        </p>
      </button>
    );
  }

  const { activeLearning, capacity, canAddMore } = learningCapacity;
  const freeSlots = Math.max(0, capacity - activeLearning);

  // All slots full — show queue count if any, otherwise exam CTA
  if (!canAddMore) {
    if (queueCount > 0) {
      return (
        <button
          type="button"
          onClick={onNavigateToExam}
          className={cn(
            'group mx-3 mt-1 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3.5 rounded-2xl',
            'border border-border bg-bg-subtle/40 px-4 py-3.5',
            'text-left transition-colors duration-200',
            'hover:bg-bg-subtle/70',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-subtle">
            <ListOrdered className="h-3.5 w-3.5 text-text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-text-secondary">
              Очередь · {queueCount} {queueCount === 1 ? 'стих' : queueCount < 5 ? 'стиха' : 'стихов'}
            </p>
            <p className="mt-0.5 text-[11px] text-text-subtle">
              Первый стих продвинется, как только освободится слот
            </p>
          </div>
          <SlotPips activeLearning={activeLearning} capacity={capacity} />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onNavigateToExam}
        className={cn(
          'group mx-3 mt-1 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3.5 rounded-2xl',
          'border border-amber-500/20 bg-amber-500/6 px-4 py-3.5',
          'text-left transition-colors duration-200',
          'hover:border-amber-500/35 hover:bg-amber-500/10',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/12">
          <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-amber-600 dark:text-amber-400">
            Все слоты заняты
          </p>
          <p className="mt-0.5 text-[11px] text-text-subtle">
            Сдайте экзамен, чтобы добавить больше стихов
          </p>
        </div>
        <SlotPips activeLearning={activeLearning} capacity={capacity} />
      </button>
    );
  }

  // Free slots available → beautiful CTA to catalog
  return (
    <button
      type="button"
      onClick={onNavigateToCatalog}
      className={cn(
        'group mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3.5 rounded-2xl',
        'border border-dashed border-border-subtle bg-transparent px-4 py-3.5',
        'text-left transition-colors duration-200',
        'hover:border-brand-primary/30 hover:bg-brand-primary/5',
      )}
    >
      {/* Plus icon */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
        'border border-dashed border-border-subtle bg-bg-subtle/70',
        'transition-colors group-hover:border-brand-primary/40 group-hover:bg-brand-primary/8',
      )}>
        <Plus className="h-3.5 w-3.5 text-text-muted transition-colors group-hover:text-brand-primary" />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-text-secondary transition-colors group-hover:text-text-primary">
          {freeSlots === 1 ? 'Свободен 1 слот' : `Свободно ${freeSlots} слота`}
        </p>
        <p className="mt-0.5 text-[11px] text-text-subtle">
          Добавьте стих из каталога для изучения
        </p>
      </div>

      {/* Slot pips */}
      <SlotPips activeLearning={activeLearning} capacity={capacity} />
    </button>
  );
}
