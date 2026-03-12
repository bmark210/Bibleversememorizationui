'use client'

import { useEffect, useRef } from 'react';

import { cn } from '@/app/components/ui/utils';

export type WordSequenceFieldItemState =
  | 'revealed'
  | 'filled'
  | 'active-gap'
  | 'future-gap';

export interface WordSequenceFieldItem {
  id: string;
  content: string;
  minWidth?: number;
  state: WordSequenceFieldItemState;
}

interface WordSequenceFieldProps {
  label: string;
  progressCurrent: number;
  progressTotal: number;
  items: WordSequenceFieldItem[];
  focusItemId: string | null;
  className?: string;
}

function getItemClassName(state: WordSequenceFieldItemState) {
  if (state === 'revealed') {
    return 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (state === 'filled') {
    return 'border border-primary/20 bg-primary/10 text-foreground';
  }

  if (state === 'active-gap') {
    return 'border-2 border-primary/40 bg-primary/5 text-primary/70';
  }

  return 'border border-border/60 bg-muted/20 text-muted-foreground';
}

export function WordSequenceField({
  label,
  progressCurrent,
  progressTotal,
  items,
  focusItemId,
  className,
}: WordSequenceFieldProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLSpanElement>());

  useEffect(() => {
    if (!focusItemId || typeof window === 'undefined') return;

    const frameId = window.requestAnimationFrame(() => {
      const container = scrollRef.current;
      const target = itemRefs.current.get(focusItemId);
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetTop =
        container.scrollTop +
        (targetRect.top - containerRect.top) -
        (container.clientHeight - target.clientHeight) * 0.5;

      const prefersReducedMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [focusItemId, items]);

  const setItemRef = (id: string) => (node: HTMLSpanElement | null) => {
    if (node) {
      itemRefs.current.set(id, node);
      return;
    }

    itemRefs.current.delete(id);
  };

  return (
    <div className={cn(
      'flex min-h-0 flex-col rounded-2xl border border-border/60 bg-background/70 pt-3 px-3',
      className
    )}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{progressCurrent}/{progressTotal}</span>
      </div>

        <div
          ref={scrollRef}
          data-card-swipe-ignore="true"
          className="h-full overflow-y-auto overscroll-contain py-2 pr-1 [scrollbar-gutter:stable]"
          role="group"
          aria-label="Поле ввода стиха"
        >
          <div className="flex flex-wrap content-start gap-1.5 leading-relaxed">
            {items.map((item) => (
              <span
                key={item.id}
                ref={setItemRef(item.id)}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-2 py-1 text-sm transition-colors',
                  getItemClassName(item.state)
                )}
                style={item.minWidth ? { minWidth: `${item.minWidth}px` } : undefined}
                aria-current={item.id === focusItemId ? 'step' : undefined}
                aria-label={
                  item.state === 'active-gap' || item.state === 'future-gap'
                    ? 'Скрытое слово'
                    : undefined
                }
              >
                {item.content}
              </span>
            ))}
          </div>
      </div>

      {/* {helperText ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {helperText}
        </p>
      ) : null} */}
    </div>
  );
}
