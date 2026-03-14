'use client'

import { useCallback, useEffect, useRef, useState } from 'react';

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

const SHADOW_SIZE = 16;

function isMaskedState(state: WordSequenceFieldItemState) {
  return state === 'active-gap' || state === 'future-gap';
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

function renderItemContent(item: WordSequenceFieldItem) {
  if (!isMaskedState(item.state)) {
    return item.content;
  }

  return (
    <span aria-hidden="true" className="grid grid-flow-col auto-cols-[10px] gap-1">
      {Array.from(item.content).map((char, index) => (
        <span
          key={`${item.id}-${index}`}
          className="flex h-4 items-center justify-center font-mono text-[11px] leading-none"
        >
          {char}
        </span>
      ))}
    </span>
  );
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
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const threshold = 2;
    setAtTop(scrollTop <= threshold);
    setAtBottom(scrollTop + clientHeight >= scrollHeight - threshold);
  }, []);

  // Track scroll position changes
  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  const handleScroll = useCallback(() => {
    measure();
  }, [measure]);

  // Re-measure after programmatic smooth scroll finishes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScrollEnd = () => measure();
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, [measure]);

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

  const showTopShadow = !atTop;
  const showBottomShadow = !atBottom;

  return (
    <div className={cn(
      'relative flex min-h-0 flex-col rounded-2xl border border-border/60 bg-background/70 pt-3 px-3',
      className
    )}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{progressCurrent}/{progressTotal}</span>
      </div>

      {/* Top shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 z-10 rounded-t-lg transition-opacity duration-200"
        style={{
          top: 36,
          height: SHADOW_SIZE,
          opacity: showTopShadow ? 1 : 0,
          background:
            'linear-gradient(to bottom, var(--color-background, hsl(0 0% 100%)) 0%, transparent 100%)',
        }}
      />

      <div
        ref={scrollRef}
        data-scroll-shadow="true"
        data-swipe-scroll="true"
        data-at-top={atTop}
        data-at-bottom={atBottom}
        className="h-full overflow-hidden overscroll-contain py-2 pr-1"
        onScroll={handleScroll}
        role="group"
        aria-label="Поле ввода стиха"
      >
        <div className="flex flex-wrap content-start gap-1.5 leading-relaxed">
          {items.map((item) => (
            <span
              key={item.id}
              ref={setItemRef(item.id)}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-2 py-1 text-sm whitespace-nowrap transition-colors',
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
              {renderItemContent(item)}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 bottom-0 z-10 rounded-b-lg transition-opacity duration-200"
        style={{
          height: SHADOW_SIZE,
          opacity: showBottomShadow ? 1 : 0,
          background:
            'linear-gradient(to top, var(--color-background, hsl(0 0% 100%)) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
