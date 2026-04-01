'use client';

import type { Ref } from 'react';
import { cn } from '@/app/components/ui/utils';
import type {
  FilterVisualTheme,
  VerseListStatusFilter,
} from '../constants';
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
  { dotClassName: string; activeClassName: string }
> = {
  catalog: {
    dotClassName: 'bg-text-muted',
    activeClassName:
      'border-border-default bg-bg-elevated text-text-primary shadow-[var(--shadow-soft)]',
  },
  my: {
    dotClassName: 'bg-status-collection',
    activeClassName:
      'border-status-collection/30 bg-status-collection-soft text-status-collection shadow-[var(--shadow-soft)]',
  },
};

export function VerseListPrimaryFilterDock({
  statusFilter,
  currentFilterTheme,
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
        <div className="relative overflow-hidden rounded-[22px] border border-border-subtle bg-bg-overlay/90 px-2 py-2 shadow-[0_-8px_24px_rgba(7,5,2,0.18),0_12px_32px_rgba(7,5,2,0.22)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent" />

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
              const activeClasses =
                isActive && key === 'my'
                  ? currentFilterTheme.activeTabClassName
                  : PRIMARY_FILTER_VISUALS[key].activeClassName;

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
                    'flex min-h-[44px] items-center justify-center rounded-[16px] border px-3 py-2 text-[13px] font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-200',
                    isActive
                      ? cn(activeClasses, 'translate-y-[-1px]')
                      : 'border-transparent text-text-muted hover:text-text-secondary',
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
