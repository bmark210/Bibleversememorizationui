'use client';

import { ListOrdered, Lock, Plus } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type LearningSlotsSummary = {
  activeLearning: number;
  capacity: number;
  canAddMore: boolean;
};

type VerseListSlotCardProps = {
  learningCapacity: LearningSlotsSummary | null;
  onNavigateToCatalog: () => void;
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

function pluralizeQueueVerses(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'стих';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return 'стиха';
  }
  return 'стихов';
}

export function VerseListSlotCard({
  learningCapacity,
  onNavigateToCatalog,
  queueCount = 0,
}: VerseListSlotCardProps) {
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

  if (!canAddMore) {
    return (
      <div
        className={cn(
          'mx-3 mt-1 mb-3 flex w-[calc(100%-1.5rem)] items-center gap-3.5 rounded-2xl',
          'border border-border bg-bg-subtle/40 px-4 py-3.5 text-left',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-subtle">
          <Lock className="h-3.5 w-3.5 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-text-primary">Все слоты заняты</p>
          <p className="mt-0.5 text-[11px] text-text-subtle">
            Завершите текущие стихи, чтобы добавить новые
          </p>
          {queueCount > 0 ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-subtle px-2.5 py-1 text-[11px] text-text-muted">
              <ListOrdered className="h-3 w-3" />
              <span>
                {queueCount} {pluralizeQueueVerses(queueCount)} в очереди
              </span>
            </div>
          ) : null}
        </div>
        <SlotPips activeLearning={activeLearning} capacity={capacity} />
      </div>
    );
  }

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
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          'border border-dashed border-border-subtle bg-bg-subtle/70',
          'transition-colors group-hover:border-brand-primary/40 group-hover:bg-brand-primary/8',
        )}
      >
        <Plus className="h-3.5 w-3.5 text-text-muted transition-colors group-hover:text-brand-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-text-secondary transition-colors group-hover:text-text-primary">
          {freeSlots === 1 ? 'Свободен 1 слот' : `Свободно ${freeSlots} слота`}
        </p>
        <p className="mt-0.5 text-[11px] text-text-subtle">
          Добавьте стих из каталога для изучения
        </p>
      </div>

      <SlotPips activeLearning={activeLearning} capacity={capacity} />
    </button>
  );
}
