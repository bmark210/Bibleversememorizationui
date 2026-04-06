import React from 'react';
import { cn } from '@/app/components/ui/utils';
import { VERSE_STATUS_ICONS } from '@/app/components/verseStatusVisuals';
import {
  FILTER_VISUAL_THEME,
  SECTION_META,
  STATUS_BOX_THEME,
  type MyVersesSectionKey,
} from '../constants';

type VerseListSkeletonMode = 'catalog' | 'my';

type VerseListSkeletonCardsProps = {
  count: number;
  mode?: VerseListSkeletonMode;
};

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn('animate-pulse rounded-md bg-foreground/[0.08]', className)} />;
}

function VerseCardSkeleton({
  surfaceClassName,
}: {
  surfaceClassName: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[164px] flex-col rounded-[1.9rem] border border-border/70 p-4 shadow-sm sm:min-h-[180px] sm:p-5',
        surfaceClassName,
      )}
      aria-hidden="true"
    >
      <SkeletonBlock className="h-5 w-24 rounded-full" />
      <div className="mt-5 flex-1">
        <div className="h-full min-h-[92px] animate-pulse rounded-[1.35rem] bg-foreground/[0.05]" />
      </div>
    </div>
  );
}

function CatalogSkeletonStack({ count }: { count: number }) {
  const surfaceClassName = FILTER_VISUAL_THEME.catalog.cardClassName;

  return (
    <div className="space-y-0">
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={`verse-list-skeleton-catalog-${idx}`}
          className="px-2 pb-3 sm:px-4"
        >
          <VerseCardSkeleton surfaceClassName={surfaceClassName} />
        </div>
      ))}
    </div>
  );
}

function MyVersesJumpStripSkeleton() {
  const sections: MyVersesSectionKey[] = [
    'learning',
    'queue',
    'review',
    'mastered',
    'stopped',
    'my',
  ];

  return (
    <div className="shrink-0 border-b border-border/55 bg-background/92 backdrop-blur-xl">
      <div className="px-2 py-2 sm:px-4">
        <div className="flex min-w-full gap-2 overflow-hidden">
          {sections.map((sectionKey, index) => {
            const theme = STATUS_BOX_THEME[sectionKey];
            const meta = SECTION_META[sectionKey];
            const Icon = VERSE_STATUS_ICONS[sectionKey];
            const isActive = index === 0;

            return (
              <div
                key={sectionKey}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2',
                  isActive
                    ? cn(
                        theme.borderClass,
                        theme.softBgClass,
                        theme.accentClass,
                        'shadow-[var(--shadow-soft)]',
                      )
                    : 'border-border/60 bg-bg-overlay text-text-secondary',
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    isActive ? theme.tintBgClass : 'bg-bg-subtle',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      isActive ? theme.accentClass : 'text-text-muted',
                    )}
                  />
                </div>
                <span className="text-[12px] font-semibold tracking-tight">
                  {meta.title}
                </span>
                <span
                  className={cn(
                    'inline-flex min-w-[1.45rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    isActive
                      ? 'bg-background/80 text-current'
                      : 'bg-bg-subtle text-text-muted',
                  )}
                >
                  0
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MyVersesSectionHeaderSkeleton() {
  const theme = STATUS_BOX_THEME.learning;

  return (
    <div className="px-2 sm:px-4" aria-hidden="true">
      <div className="flex items-center gap-2.5 px-1 pb-3 pt-4">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
            theme.softBgClass,
          )}
        >
          <SkeletonBlock className="h-3.5 w-3.5 rounded-full bg-current/25" />
        </div>
        <SkeletonBlock className="h-3.5 w-20 rounded-full" />
        <SkeletonBlock className="ml-auto h-5 w-7 rounded-full" />
      </div>
    </div>
  );
}

function MyVersesSkeletonStack({ count }: { count: number }) {
  const surfaceClassName = FILTER_VISUAL_THEME.my.cardClassName;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MyVersesJumpStripSkeleton />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MyVersesSectionHeaderSkeleton />
        {Array.from({ length: count }, (_, idx) => (
          <div
            key={`verse-list-skeleton-my-${idx}`}
            className="px-2 pb-3 sm:px-4"
          >
            <VerseCardSkeleton surfaceClassName={surfaceClassName} />
          </div>
        ))}
        <div
          aria-hidden="true"
          style={{
            paddingBottom: 'calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)',
          }}
        />
      </div>
    </div>
  );
}

export function VerseListSkeletonCards({
  count,
  mode = 'catalog',
}: VerseListSkeletonCardsProps) {
  if (mode === 'my') {
    return <MyVersesSkeletonStack count={count} />;
  }

  return <CatalogSkeletonStack count={count} />;
}
