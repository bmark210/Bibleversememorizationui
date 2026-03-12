'use client'

import { useEffect, useMemo, useRef } from 'react';

import { Button } from '@/app/components/ui/button';
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
  expanded: boolean;
  onToggleExpanded: () => void;
  reviewHint?: string;
}

function getItemClassName(state: WordSequenceFieldItemState) {
  if (state === 'revealed') {
    return 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (state === 'filled') {
    return 'border border-primary/20 bg-primary/10 text-foreground';
  }

  if (state === 'active-gap') {
    return 'border-2 border-primary/40 bg-primary/5 text-primary/65';
  }

  return 'border border-border/60 bg-muted/20 text-muted-foreground';
}

export function WordSequenceField({
  label,
  progressCurrent,
  progressTotal,
  items,
  expanded,
  onToggleExpanded,
  reviewHint,
}: WordSequenceFieldProps) {
  const collapsedScrollRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLSpanElement>());

  const activeItemId = useMemo(
    () => items.find((item) => item.state === 'active-gap')?.id ?? null,
    [items]
  );

  useEffect(() => {
    if (expanded || !activeItemId || typeof window === 'undefined') return;

    const frameId = window.requestAnimationFrame(() => {
      const container = collapsedScrollRef.current;
      const target = itemRefs.current.get(activeItemId);
      if (!container || !target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextLeft =
        container.scrollLeft +
        (targetRect.left - containerRect.left) -
        (containerRect.width - targetRect.width) / 2;

      const prefersReducedMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
      container.scrollTo({
        left: Math.max(0, nextLeft),
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [expanded, activeItemId, items]);

  const setItemRef = (id: string) => (node: HTMLSpanElement | null) => {
    if (node) {
      itemRefs.current.set(id, node);
      return;
    }

    itemRefs.current.delete(id);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-full px-2.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
          >
            {expanded ? 'Свернуть' : 'Весь стих'}
          </Button>
          <span className="tabular-nums">{progressCurrent}/{progressTotal}</span>
        </div>
      </div>

      {expanded ? (
        <>
          <div className="flex flex-wrap gap-1.5 leading-relaxed">
            {items.map((item) => (
              <span
                key={item.id}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-2 py-1 text-sm transition-colors',
                  getItemClassName(item.state)
                )}
                style={item.minWidth ? { minWidth: `${item.minWidth}px` } : undefined}
                aria-label={item.state === 'active-gap' || item.state === 'future-gap' ? 'Скрытое слово' : undefined}
              >
                {item.content}
              </span>
            ))}
          </div>

          {reviewHint ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {reviewHint}
            </p>
          ) : null}
        </>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/10 px-2 py-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background/95 via-background/65 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/95 via-background/65 to-transparent"
          />
          <div
            ref={collapsedScrollRef}
            className="overflow-hidden"
            role="group"
            aria-label="Текущая строка стиха"
          >
            <div className="inline-flex min-w-full items-center gap-1.5 py-0.5">
              {items.map((item) => (
                <span
                  key={item.id}
                  ref={setItemRef(item.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-md px-2 py-1 text-sm transition-colors',
                    getItemClassName(item.state)
                  )}
                  style={item.minWidth ? { minWidth: `${item.minWidth}px` } : undefined}
                  aria-current={item.state === 'active-gap' ? 'step' : undefined}
                  aria-label={item.state === 'active-gap' || item.state === 'future-gap' ? 'Скрытое слово' : undefined}
                >
                  {item.content}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}