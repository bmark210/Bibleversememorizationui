'use client';

import type { Ref } from 'react';
import { cn } from '@/app/components/ui/utils';
import type { FilterVisualTheme, VerseListStatusFilter } from '../constants';
import {
  getVerseListPrimaryFilterKey,
  getVisibleVerseListPrimaryFilterOptions,
  type VerseListPrimaryFilterKey,
} from './primaryFilterTabs';

type VerseListPrimaryFilterDockProps = {
  statusFilter: VerseListStatusFilter;
  currentFilterLabel: string;
  currentFilterTheme: FilterVisualTheme;
  totalCount: number;
  onTabClick: (filter: VerseListStatusFilter, label: string) => void;
  className?: string;
  rootRef?: Ref<HTMLDivElement>;
};

const PRIMARY_FILTER_VISUALS: Record<
  VerseListPrimaryFilterKey,
  { activeClassName: string }
> = {
  catalog: {
    activeClassName:
      'border-border/60 bg-background/60 text-foreground/88',
  },
  my: {
    activeClassName:
      'border-border/60 bg-background/60 text-foreground/88',
  },
};

export function VerseListPrimaryFilterDock({
  statusFilter,
  onTabClick,
  className,
  rootRef,
}: VerseListPrimaryFilterDockProps) {
  const activeRootTab = getVerseListPrimaryFilterKey(statusFilter);
  const visibleRootTabs = getVisibleVerseListPrimaryFilterOptions();

  return (
    <div
      ref={rootRef}
      className={cn(
        'pointer-events-none fixed inset-x-0 z-30 px-4 md:hidden',
        className,
      )}
      style={{ bottom: 'calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)' }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-xl">
        <div className="relative overflow-hidden rounded-[24px] border border-border/70 bg-card px-2 py-2 transition-[opacity,transform] duration-200">
          <div
            role="tablist"
            aria-label="Основной фильтр списка стихов"
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${visibleRootTabs.length}, minmax(0, 1fr))`,
            }}
          >
            {visibleRootTabs.map(({ key, label }) => {
              const isActive = activeRootTab === key;
              const activeClasses = PRIMARY_FILTER_VISUALS[key].activeClassName;

              return (
                <button
                  key={key}
                  type="button"
                  data-tour={`verse-filter-dock-tab-${key}`}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() =>
                    onTabClick(
                      key === 'my' ? 'my' : key,
                      key === 'my' ? 'Мои стихи' : label,
                    )
                  }
                  className={cn(
                    'flex min-h-[40px] items-center justify-center rounded-[18px] border px-3 py-1.5 text-sm font-medium transition-[background-color,border-color,color] duration-200',
                    isActive
                      ? activeClasses
                      : 'border-transparent bg-transparent text-foreground/56 hover:bg-background/35 hover:text-foreground/72',
                  )}
                >
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
