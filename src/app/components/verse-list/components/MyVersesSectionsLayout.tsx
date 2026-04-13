'use client';

import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type LucideIcon,
} from 'lucide-react';
import { Virtuoso, type ListRange, type VirtuosoHandle } from 'react-virtuoso';
import { cn } from '@/app/components/ui/utils';
import { VERSE_STATUS_ICONS } from '@/app/components/verseStatusVisuals';
import { LearningSlotPlaceholders } from './LearningSlotPlaceholders';
import { VerseListEmptyState } from './VerseListEmptyState';
import {
  SECTION_META,
  STATUS_BOX_THEME,
  type MyVersesSectionKey,
} from '../constants';
import {
  buildMyVersesVirtualModel,
  type MyVersesSectionData,
  type MyVersesVirtualRow,
} from '../myVersesSections';
import type { Verse } from '@/app/domain/verse';

const DEFAULT_ITEM_HEIGHT_ESTIMATE = 176;
const SECTION_HEADER_HEIGHT_ESTIMATE = 56;
const LEARNING_SLOT_HEIGHT_ESTIMATE = 58;
const SLOT_STACK_GAP_PX = 8;
const ITEM_ROW_BOTTOM_PADDING = 12;
const SCROLL_SEEK_ENTER_VELOCITY = 720;
const SCROLL_SEEK_EXIT_VELOCITY = 140;
const OVERSCAN_TOP_PX = DEFAULT_ITEM_HEIGHT_ESTIMATE * 3;
const OVERSCAN_BOTTOM_PX = DEFAULT_ITEM_HEIGHT_ESTIMATE * 4;

const SECTION_ICONS: Record<MyVersesSectionKey, LucideIcon> = {
  learning: VERSE_STATUS_ICONS.learning,
  queue: VERSE_STATUS_ICONS.queue,
  review: VERSE_STATUS_ICONS.review,
  mastered: VERSE_STATUS_ICONS.mastered,
  stopped: VERSE_STATUS_ICONS.stopped,
  my: VERSE_STATUS_ICONS.my,
};

type MyVersesSectionsLayoutProps = {
  sections: MyVersesSectionData[];
  renderVerseRow: (verse: Verse) => React.ReactNode;
  learningCapacity: number;
  currentFilterLabel: string;
  onNavigateToCatalog: () => void;
  getVerseHeightEstimate?: (verse: Verse) => number;
};

function estimateLearningPlaceholderRowHeight(emptyCount: number): number {
  if (emptyCount <= 0) {
    return 0;
  }

  return (
    emptyCount * LEARNING_SLOT_HEIGHT_ESTIMATE +
    Math.max(0, emptyCount - 1) * SLOT_STACK_GAP_PX +
    ITEM_ROW_BOTTOM_PADDING
  );
}

function estimateRowHeight(
  row: MyVersesVirtualRow,
  getVerseHeightEstimate?: (verse: Verse) => number,
): number {
  switch (row.kind) {
    case 'section':
      return SECTION_HEADER_HEIGHT_ESTIMATE;
    case 'learning-placeholders':
      return estimateLearningPlaceholderRowHeight(row.emptyCount);
    case 'verse':
      return getVerseHeightEstimate?.(row.verse) ?? DEFAULT_ITEM_HEIGHT_ESTIMATE;
    default:
      return DEFAULT_ITEM_HEIGHT_ESTIMATE;
  }
}

function makeScrollSeekPlaceholder(
  rows: readonly MyVersesVirtualRow[],
  getVerseHeightEstimate?: (verse: Verse) => number,
) {
  return function ScrollSeekPlaceholder({
    height,
    index,
  }: {
    height: number;
    index: number;
  }) {
    const row = rows[index];
    const resolvedHeight = row
      ? estimateRowHeight(row, getVerseHeightEstimate)
      : Number.isFinite(height) && height > 0
        ? height
        : DEFAULT_ITEM_HEIGHT_ESTIMATE;

    return (
      <div className="px-3 pb-3 sm:px-4" aria-hidden="true">
        <div
          className="rounded-2xl border border-border/60 bg-card/55 animate-pulse"
          style={{ minHeight: resolvedHeight }}
        />
      </div>
    );
  };
}

function SectionInlineHeader({
  sectionKey,
  count,
}: {
  sectionKey: MyVersesSectionKey;
  count: number;
}) {
  const Icon = SECTION_ICONS[sectionKey];
  const theme = STATUS_BOX_THEME[sectionKey];
  const meta = SECTION_META[sectionKey];

  return (
    <div className="flex items-center gap-2.5 px-1 pb-3 pt-4">
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
          theme.softBgClass,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', theme.accentClass)} />
      </div>
      <span
        className={cn('text-[13px] font-semibold tracking-tight', theme.accentClass)}
      >
        {meta.title}
      </span>
      <span
        className={cn(
          'ml-auto inline-flex h-5 min-w-[1.35rem] items-center justify-center rounded-full px-1.5',
          'text-[11px] font-semibold tabular-nums',
          theme.softBgClass,
          theme.accentClass,
        )}
      >
        {count}
      </span>
    </div>
  );
}

function SectionJumpStrip({
  activeSectionKey,
  onJump,
  rows,
  scrolled,
}: {
  activeSectionKey: MyVersesSectionKey | null;
  onJump: (sectionIndex: number) => void;
  rows: ReturnType<typeof buildMyVersesVirtualModel>['navItems'];
  scrolled: boolean;
}) {
  const buttonRefs = useRef<Partial<Record<MyVersesSectionKey, HTMLButtonElement | null>>>(
    {},
  );

  useEffect(() => {
    if (!activeSectionKey) {
      return;
    }

    buttonRefs.current[activeSectionKey]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeSectionKey]);

  return (
    <div
      className={cn(
        'shrink-0 border-b bg-bg-overlay backdrop-blur-xl transition-[border-color,box-shadow] duration-300',
        scrolled
          ? 'border-border/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.10)]'
          : 'border-border/30 shadow-none',
      )}
    >
      <div className="px-2 py-2 sm:px-4">
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-full gap-2">
            {rows.map((item) => {
              const meta = SECTION_META[item.key];
              const theme = STATUS_BOX_THEME[item.key];
              const Icon = SECTION_ICONS[item.key];
              const isActive = activeSectionKey === item.key;

              return (
                <button
                  key={item.key}
                  ref={(node) => {
                    buttonRefs.current[item.key] = node;
                  }}
                  type="button"
                  onClick={() => onJump(item.sectionIndex)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30',
                    isActive
                      ? cn(
                          theme.borderClass,
                          theme.softBgClass,
                          theme.accentClass,
                          'shadow-[var(--shadow-soft)]',
                        )
                      : 'border-border/60 bg-bg-overlay text-text-secondary hover:bg-bg-elevated',
                  )}
                  aria-pressed={isActive}
                  aria-label={`Перейти к разделу ${meta.title}`}
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
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyVersesSectionsLayout({
  sections,
  renderVerseRow,
  learningCapacity,
  currentFilterLabel,
  onNavigateToCatalog,
  getVerseHeightEstimate,
}: MyVersesSectionsLayoutProps) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const activeSectionIndexRef = useRef(0);
  const { navItems, rows } = useMemo(
    () => buildMyVersesVirtualModel(sections, learningCapacity),
    [learningCapacity, sections],
  );
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    const maxIndex = Math.max(0, navItems.length - 1);
    const clampedIndex = Math.min(activeSectionIndexRef.current, maxIndex);

    if (activeSectionIndexRef.current !== clampedIndex) {
      activeSectionIndexRef.current = clampedIndex;
    }

    setActiveSectionIndex((current) => (current === clampedIndex ? current : clampedIndex));
  }, [navItems.length]);

  const handleJumpToSection = useCallback(
    (sectionIndex: number) => {
      const target = navItems[sectionIndex];
      if (!target) {
        return;
      }

      activeSectionIndexRef.current = target.sectionIndex;
      startTransition(() => {
        setActiveSectionIndex(target.sectionIndex);
      });

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      virtuosoRef.current?.scrollToIndex({
        index: target.rowIndex,
        align: 'start',
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [navItems],
  );

  const handleRangeChanged = useCallback(
    (range: ListRange) => {
      const nextSectionIndex = rows[range.startIndex]?.sectionIndex ?? 0;
      if (activeSectionIndexRef.current === nextSectionIndex) {
        return;
      }

      activeSectionIndexRef.current = nextSectionIndex;
      startTransition(() => {
        setActiveSectionIndex(nextSectionIndex);
      });
    },
    [rows],
  );

  const FooterComponent = useMemo(() => {
    const MyVersesFooter = () => (
      <div
        aria-hidden="true"
        style={{
          paddingBottom: 'calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)',
        }}
      />
    );

    return MyVersesFooter;
  }, []);

  const ScrollSeekPlaceholder = useMemo(
    () => makeScrollSeekPlaceholder(rows, getVerseHeightEstimate),
    [getVerseHeightEstimate, rows],
  );

  const virtuosoComponents = useMemo(
    () => ({
      Footer: FooterComponent,
      ScrollSeekPlaceholder,
    }),
    [FooterComponent, ScrollSeekPlaceholder],
  );

  const activeSectionKey = navItems[activeSectionIndex]?.key ?? null;
  const shouldEnableScrollSeek = rows.length > 40;

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <VerseListEmptyState
            currentFilterLabel={currentFilterLabel}
            isMyFilter
            onNavigateToCatalog={onNavigateToCatalog}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SectionJumpStrip
        activeSectionKey={activeSectionKey}
        onJump={handleJumpToSection}
        rows={navItems}
        scrolled={!atTop}
      />

      <div
        className="relative min-h-0 flex-1"
        style={(() => {
          if (atBottom) return {};
          const mask = `linear-gradient(to bottom, black 0px, black calc(100% - 52px), transparent 100%)`;
          return { maskImage: mask, WebkitMaskImage: mask };
        })()}
      >
        <Virtuoso<MyVersesVirtualRow>
          ref={virtuosoRef}
          data={rows}
          className="h-full w-full"
          style={{ height: '100%' }}
          components={virtuosoComponents}
          computeItemKey={(_, row) => row.rowKey}
          defaultItemHeight={DEFAULT_ITEM_HEIGHT_ESTIMATE}
          atTopStateChange={setAtTop}
          atBottomStateChange={setAtBottom}
          rangeChanged={handleRangeChanged}
          scrollSeekConfiguration={
            shouldEnableScrollSeek
              ? {
                  enter: (velocity: number) =>
                    Math.abs(velocity) > SCROLL_SEEK_ENTER_VELOCITY,
                  exit: (velocity: number) =>
                    Math.abs(velocity) < SCROLL_SEEK_EXIT_VELOCITY,
                }
              : undefined
          }
          increaseViewportBy={{ top: OVERSCAN_TOP_PX, bottom: OVERSCAN_BOTTOM_PX }}
          overscan={Math.max(OVERSCAN_TOP_PX, OVERSCAN_BOTTOM_PX)}
          itemContent={(_, row) => {
            if (row.kind === 'section') {
              return (
                <div className="px-3 sm:px-4">
                  <SectionInlineHeader
                    sectionKey={row.sectionKey}
                    count={row.count}
                  />
                </div>
              );
            }

            if (row.kind === 'learning-placeholders') {
              return (
                <div className="space-y-2 px-3 pb-3 sm:px-4">
                  <LearningSlotPlaceholders
                    filledCount={row.filledCount}
                    capacity={row.capacity}
                    onNavigateToCatalog={onNavigateToCatalog}
                  />
                </div>
              );
            }

            return (
              <div className="px-3 pb-3 sm:px-4">
                {renderVerseRow(row.verse)}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
