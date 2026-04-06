'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type LearningSlotPlaceholdersProps = {
  filledCount: number;
  capacity: number;
  onNavigateToCatalog: () => void;
};

export function LearningSlotPlaceholders({
  filledCount,
  capacity,
  onNavigateToCatalog,
}: LearningSlotPlaceholdersProps) {
  const emptySlots = Math.max(0, capacity - filledCount);

  if (emptySlots === 0) return null;

  return (
    <>
      {Array.from({ length: emptySlots }).map((_, i) => (
        <button
          key={`placeholder-${i}`}
          type="button"
          onClick={onNavigateToCatalog}
          className={cn(
            'group flex w-full items-center gap-3 rounded-2xl bg-bg-overlay h-[5rem] border border-border',
            'border border-dashed border-border-subtle/60 px-4 py-3.5',
            'text-left transition-colors duration-200',
            'hover:border-status-learning/30 hover:bg-status-learning-tint',
          )}
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
              'border border-dashed border-border-subtle/60 bg-bg-subtle/50',
              'transition-colors group-hover:border-status-learning/30 group-hover:bg-status-learning-soft',
            )}
          >
            <Plus className="h-3 w-3 text-text-subtle transition-colors group-hover:text-status-learning" />
          </div>
          <span className="text-[12px] font-medium text-text-subtle transition-colors group-hover:text-text-secondary">
            Свободный слот
          </span>
        </button>
      ))}
    </>
  );
}
