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
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onToggleVisibility(section.key)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5',
            'text-[11px] font-medium transition-all duration-200',
            section.isVisible
              ? [
                  section.softBgClass,
                  section.accentClass,
                  'border-transparent',
                ]
              : 'border-border-subtle/60 bg-transparent text-text-subtle opacity-50',
          )}
        >
          <span
            className={cn(
              'h-[5px] w-[5px] rounded-full transition-opacity',
              section.isVisible ? section.dotClass : 'bg-text-muted',
            )}
          />
          <span>{section.title}</span>
          <span className="tabular-nums opacity-70">{section.count}</span>
        </button>
      ))}
    </div>
  );
}
