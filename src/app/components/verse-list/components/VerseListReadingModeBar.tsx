'use client';

import { useState } from 'react';
import { ChevronLeft, Eye } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Switch } from '@/app/components/ui/switch';

type Props = {
  isFocusMode: boolean;
  onToggle: () => void;
};

export function VerseListReadingModeBar({ isFocusMode, onToggle }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("pointer-events-none absolute inset-x-0 bottom-full z-20 flex justify-end pb-6")}>
      <div className="pointer-events-auto">
        {/* Pill — fixed height, expands horizontally to the left */}
        <div
          className={cn(
            'flex h-9 items-center overflow-hidden',
            'rounded-l-full rounded-r-none border border-border-subtle bg-bg-overlay/98 shadow-[var(--shadow-soft)] backdrop-blur-xl',
            'transition-[width] duration-300 ease-out',
            isOpen ? 'w-60' : 'w-[60px]',
          )}
        >
          {/* ── Left: label + toggle (hidden when collapsed) ── */}
          <div
            className={cn(
              'flex h-full items-center gap-3 overflow-hidden whitespace-nowrap',
              'transition-opacity duration-150',
              isOpen ? 'opacity-100 delay-150 pl-4 flex-1' : 'opacity-0 delay-0',
            )}
          >
            <span className="flex-1 truncate text-[12px] font-medium text-text-secondary">
              {isFocusMode ? 'Чтение вкл.' : 'Режим чтения'}
            </span>
            <Switch
              checked={isFocusMode}
              onCheckedChange={() => onToggle()}
              aria-label="Режим чтения"
            />
          </div>

          {/* ── Right: trigger (always visible) ── */}
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Свернуть' : 'Режим чтения'}
            onClick={() => setIsOpen((p) => !p)}
            className="flex h-full shrink-0 items-center justify-center gap-1.5 px-3"
          >
            <ChevronLeft
              className={cn(
                'size-4 transition-transform duration-300',
                isFocusMode ? 'text-brand-primary' : 'text-text-muted',
                isOpen && 'rotate-180',
              )}
            />
            <Eye
              className={cn(
                'size-4 transition-colors duration-200',
                isFocusMode ? 'text-brand-primary' : 'text-text-muted',
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
