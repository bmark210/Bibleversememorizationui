'use client';

import { cn } from '@/app/components/ui/utils';
import type { MyVersesSectionKey } from '../constants';

type FilterChip = {
  key: MyVersesSectionKey;
  title: string;
  count: number;
  isVisible: boolean;
  dotClass: string;
  accentClass: string;
  softBgClass: string;
};

type MyVersesFilterBarProps = {
  sections: FilterChip[];
  onToggleVisibility: (key: MyVersesSectionKey) => void;
};

export function MyVersesFilterBar({
  sections,
  onToggleVisibility,
}: MyVersesFilterBarProps) {
  if (sections.length === 0) return null;

  return (
    <div className="py-3">
      <div className="flex gap-2 overflow-x-auto rounded-[22px] border border-border/60 bg-background/88 p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl scrollbar-hide">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onToggleVisibility(section.key)}
          aria-pressed={section.isVisible}
          className={cn(
            'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-1.5',
            'text-[11px] font-medium transition-all duration-200',
            section.isVisible
              ? [
                  'border-transparent bg-foreground/[0.035] text-foreground/82 shadow-[0_1px_3px_rgba(15,23,42,0.08)]',
                ]
              : 'border-border-subtle/60 bg-transparent text-text-subtle opacity-70',
          )}
        >
          <span
            className={cn(
              'h-[6px] w-[6px] rounded-full transition-opacity',
              section.isVisible ? section.dotClass : 'bg-text-muted',
            )}
          />
          <span className="whitespace-nowrap">{section.title}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors',
              section.isVisible
                ? [section.softBgClass, section.accentClass]
                : 'bg-bg-subtle text-text-subtle',
            )}
          >
            {section.count}
          </span>
        </button>
      ))}
      </div>
    </div>
  );
}
