'use client';

import { Clock, X } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { QueueVerseItem } from '@/app/components/Training/exam/types';

type VerseListQueueSectionProps = {
  items: QueueVerseItem[];
  freeSlots: number;
  onRemove: (externalVerseId: string) => void;
  className?: string;
};

export function VerseListQueueSection({
  items,
  freeSlots,
  onRemove,
  className,
}: VerseListQueueSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn('mx-3 mt-1 mb-1', className)}>
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <Clock className="h-3.5 w-3.5 text-text-muted" />
        <span className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          В очереди · {items.length}
        </span>
        {freeSlots > 0 && (
          <span className="ml-auto text-[11px] text-text-subtle">
            {freeSlots === 1 ? '1 слот свободен' : `${freeSlots} слота свободно`}
          </span>
        )}
      </div>

      {/* Queue items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.externalVerseId}
            className={cn(
              'flex items-center gap-3 rounded-2xl',
              'border border-border-subtle bg-bg-subtle/40 px-3.5 py-2.5',
            )}
          >
            {/* Position number */}
            <span className="min-w-[1.25rem] text-center text-[12px] font-semibold tabular-nums text-text-muted">
              {item.queuePosition}
            </span>

            {/* Verse info */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight text-text-secondary">
                {item.reference}
              </p>
              {item.text && (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-text-subtle">
                  {item.text}
                </p>
              )}
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(item.externalVerseId)}
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                'text-text-subtle transition-colors hover:bg-bg-elevated hover:text-text-secondary',
              )}
              aria-label={`Убрать ${item.reference} из очереди`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mt-3 mb-1 flex items-center gap-2 px-1">
        <div className="h-px flex-1 bg-border-subtle/50" />
        <span className="text-[11px] text-text-subtle">Активное изучение</span>
        <div className="h-px flex-1 bg-border-subtle/50" />
      </div>
    </div>
  );
}
