'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/app/components/ui/utils';

const ITEM_HEIGHT = 46;
const VISIBLE_ITEMS = 5; // must be odd

type WheelPickerProps = {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export function WheelPicker({ values, value, onChange, className }: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<number>(value);

  const scrollToIndex = useCallback((idx: number, smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    const top = idx * ITEM_HEIGHT;
    if (smooth) {
      el.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollTop = top;
    }
  }, []);

  // Scroll to initial value on mount without animation
  useEffect(() => {
    const idx = values.indexOf(value);
    if (idx >= 0) scrollToIndex(idx, false);
    lastCommittedRef.current = value;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If external value changes, scroll to it
  useEffect(() => {
    if (value === lastCommittedRef.current) return;
    const idx = values.indexOf(value);
    if (idx >= 0) {
      scrollToIndex(idx, true);
      lastCommittedRef.current = value;
    }
  }, [value, values, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const rawIdx = el.scrollTop / ITEM_HEIGHT;
      const idx = Math.round(rawIdx);
      const clamped = Math.max(0, Math.min(idx, values.length - 1));
      // Snap
      scrollToIndex(clamped, true);
      const picked = values[clamped];
      if (picked !== undefined && picked !== lastCommittedRef.current) {
        lastCommittedRef.current = picked;
        onChange(picked);
      }
    }, 80);
  }, [onChange, values, scrollToIndex]);

  const totalHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
  const padding = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div
      className={cn('relative select-none overflow-hidden', className)}
      style={{ height: totalHeight }}
    >
      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: padding,
          background: 'linear-gradient(to bottom, var(--color-bg-primary, white) 20%, transparent)',
        }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: padding,
          background: 'linear-gradient(to top, var(--color-bg-primary, white) 20%, transparent)',
        }}
      />
      {/* Selection highlight */}
      <div
        className="pointer-events-none absolute inset-x-6 z-10 rounded-xl bg-bg-elevated/70 border border-border/60"
        style={{ top: padding, height: ITEM_HEIGHT }}
      />

      {/* Scrollable wheel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: padding,
          paddingBottom: padding,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {values.map((v, idx) => (
          <div
            key={v}
            style={{ scrollSnapAlign: 'center', height: ITEM_HEIGHT }}
            className="flex cursor-pointer items-center justify-center"
            onClick={() => {
              scrollToIndex(idx, true);
              if (v !== lastCommittedRef.current) {
                lastCommittedRef.current = v;
                onChange(v);
              }
            }}
          >
            <span
              className={cn(
                'text-[24px] font-semibold tabular-nums transition-all duration-150',
                v === value
                  ? 'text-text-primary scale-100'
                  : 'text-text-muted scale-90',
              )}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
