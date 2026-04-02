'use client';

import { X } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { QueueVerseItem } from '@/app/components/Training/exam/types';

type VerseListQueueSectionProps = {
  items: QueueVerseItem[];
  onRemove: (externalVerseId: string) => void;
  onEditPosition: (item: QueueVerseItem) => void;
  className?: string;
};

export function VerseListQueueSection({
  items,
  onRemove,
  onEditPosition,
  className,
}: VerseListQueueSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn('mb-1', className)}>
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-px flex-1 bg-border-subtle/50" />
        <span className="text-[11px] text-text-subtle">В очереди</span>
        <div className="h-px flex-1 bg-border-subtle/50" />
      </div>

      {/* Cards */}
      <div className="space-y-3 pb-1">
        {items.map((item) => (
          <div
            key={item.externalVerseId}
            className={cn(
              'relative rounded-3xl border border-border/70 bg-card/70 px-4 py-4',
              'shadow-sm',
            )}
          >
            {/* Position badge — tappable to change order */}
            <button
              type="button"
              onClick={() => onEditPosition(item)}
              className={cn(
                'mb-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
                'border border-border-subtle bg-bg-subtle/60 text-text-muted',
                'text-[11px] font-semibold uppercase tracking-wide',
                'transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/8 hover:text-brand-primary',
                'active:scale-95',
              )}
              aria-label={`Позиция в очереди: ${item.queuePosition}. Нажмите, чтобы изменить`}
            >
              {item.queuePosition === 1 ? (
                <span>Следующий</span>
              ) : (
                <span className="tabular-nums">#{item.queuePosition}</span>
              )}
              <span className="text-text-subtle">·</span>
              <span>В очереди</span>
            </button>

            {/* Reference */}
            <p className="text-[15px] font-bold leading-snug text-text-primary">
              {item.reference}
            </p>

            {/* Text snippet */}
            {item.text && (
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
                {item.text}
              </p>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(item.externalVerseId)}
              className={cn(
                'absolute right-3 top-3',
                'flex h-7 w-7 items-center justify-center rounded-full',
                'text-text-subtle transition-colors hover:bg-bg-elevated hover:text-text-secondary',
              )}
              aria-label={`Убрать ${item.reference} из очереди`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
