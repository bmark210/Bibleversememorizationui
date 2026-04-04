'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BookOpen,
  ListOrdered,
  RefreshCw,
  Star,
  PauseCircle,
  Bookmark,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { LearningSlotPlaceholders } from './LearningSlotPlaceholders';
import { VerseListEmptyState } from './VerseListEmptyState';
import {
  SECTION_META,
  STATUS_BOX_THEME,
  type MyVersesSectionKey,
} from '../constants';
import type { Verse } from '@/app/domain/verse';

// ─── Icons per section ────────────────────────────────────────────────────────

const SECTION_ICONS: Record<
  MyVersesSectionKey,
  React.ComponentType<{ className?: string }>
> = {
  learning: BookOpen,
  queue:    ListOrdered,
  review:   RefreshCw,
  mastered: Star,
  stopped:  PauseCircle,
  my:       Bookmark,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type SectionData = {
  key: MyVersesSectionKey;
  verses: Verse[];
  alwaysShow?: boolean;
};

type MyVersesSectionsLayoutProps = {
  sections: SectionData[];
  renderVerseRow: (verse: Verse) => React.ReactNode;
  getItemKey: (verse: Verse) => string;
  learningCapacity: number;
  currentFilterLabel: string;
  onNavigateToCatalog: () => void;
};

// ─── Inline section header ────────────────────────────────────────────────────

function SectionInlineHeader({
  sectionKey,
  count,
}: {
  sectionKey: MyVersesSectionKey;
  count: number;
}) {
  const Icon  = SECTION_ICONS[sectionKey];
  const theme = STATUS_BOX_THEME[sectionKey];
  const meta  = SECTION_META[sectionKey];

  return (
    <div className="flex items-center gap-2.5 px-1 pb-2.5 pt-5 first:pt-2">
      {/* Icon chip */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          theme.softBgClass,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', theme.accentClass)} />
      </div>

      {/* Title */}
      <span className={cn('text-[13px] font-semibold tracking-tight', theme.accentClass)}>
        {meta.title}
      </span>

      {/* Count badge */}
      <span
        className={cn(
          'ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5',
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

// ─── Sticky nav banner (top = prev section / bottom = next section) ────────────

function SectionNavBanner({
  sectionKey,
  position,
  onClick,
}: {
  sectionKey: MyVersesSectionKey | null;
  position: 'top' | 'bottom';
  onClick: () => void;
}) {
  const isVisible = sectionKey !== null;

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out',
        isVisible ? 'max-h-[44px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
      )}
    >
      {sectionKey && (() => {
        const Icon  = SECTION_ICONS[sectionKey];
        const theme = STATUS_BOX_THEME[sectionKey];
        const meta  = SECTION_META[sectionKey];

        return (
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'flex h-[44px] w-full items-center gap-2.5 px-4',
              'bg-background/90 backdrop-blur-sm',
              'transition-colors duration-150 active:bg-bg-subtle/60',
              position === 'top'
                ? 'border-b border-border-subtle/50'
                : 'border-t border-border-subtle/50',
            )}
          >
            {/* Direction arrow (left side for top banner) */}
            {position === 'top' && (
              <ChevronUp className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            )}

            {/* Section icon chip */}
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                theme.softBgClass,
              )}
            >
              <Icon className={cn('h-3 w-3', theme.accentClass)} />
            </div>

            {/* Section name */}
            <span className={cn('text-[12px] font-medium', theme.accentClass)}>
              {meta.title}
            </span>

            {/* Direction arrow (right side for bottom banner) */}
            {position === 'bottom' && (
              <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-text-muted" />
            )}
          </button>
        );
      })()}
    </div>
  );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export function MyVersesSectionsLayout({
  sections,
  renderVerseRow,
  getItemKey,
  learningCapacity,
  currentFilterLabel,
  onNavigateToCatalog,
}: MyVersesSectionsLayoutProps) {
  const scrollRef   = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<MyVersesSectionKey, HTMLDivElement | null>>>({});

  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Only sections that have verses (or are always shown)
  const visibleSections = useMemo(
    () => sections.filter((s) => s.verses.length > 0 || s.alwaysShow),
    [sections],
  );

  const hasContent = useMemo(
    () =>
      visibleSections.some((s) => s.verses.length > 0) ||
      visibleSections.some((s) => s.alwaysShow),
    [visibleSections],
  );

  // ── Scroll tracking ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let newIndex = 0;

      visibleSections.forEach((section, index) => {
        const el = sectionRefs.current[section.key];
        if (!el) return;
        // Section "owns" the view once its anchor has passed the container top
        if (el.getBoundingClientRect().top <= containerTop + 1) {
          newIndex = index;
        }
      });

      setActiveSectionIndex((prev) => (prev === newIndex ? prev : newIndex));
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount so the initial state is correct
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [visibleSections]);

  // ── Jump to section ───────────────────────────────────────────────────────────
  const scrollToSection = useCallback((key: MyVersesSectionKey) => {
    const el        = sectionRefs.current[key];
    const container = scrollRef.current;
    if (!el || !container) return;

    const containerTop  = container.getBoundingClientRect().top;
    const elementTop    = el.getBoundingClientRect().top;
    const currentScroll = container.scrollTop;

    container.scrollTo({
      top: currentScroll + (elementTop - containerTop),
      behavior: 'smooth',
    });
  }, []);

  const prevSection =
    activeSectionIndex > 0 ? visibleSections[activeSectionIndex - 1] : null;
  const nextSection =
    activeSectionIndex < visibleSections.length - 1
      ? visibleSections[activeSectionIndex + 1]
      : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Top sticky nav: previous section ───────────────────────────────── */}
      <SectionNavBanner
        sectionKey={prevSection?.key ?? null}
        position="top"
        onClick={() => prevSection && scrollToSection(prevSection.key)}
      />

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 sm:px-4"
        style={{
          paddingBottom:
            'calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)',
        }}
      >
        {hasContent ? (
          <>
            {visibleSections.map(({ key, verses }) => (
              <div key={key}>
                {/* Anchor div for scroll detection */}
                <div
                  ref={(el) => {
                    sectionRefs.current[key] = el;
                  }}
                />

                {/* Section heading */}
                <SectionInlineHeader sectionKey={key} count={verses.length} />

                {/* Verse cards */}
                <div className="space-y-2 pb-2">
                  {verses.map((v) => (
                    <React.Fragment key={getItemKey(v)}>
                      {renderVerseRow(v)}
                    </React.Fragment>
                  ))}

                  {key === 'learning' && (
                    <LearningSlotPlaceholders
                      filledCount={verses.length}
                      capacity={learningCapacity}
                      onNavigateToCatalog={onNavigateToCatalog}
                    />
                  )}
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="w-full max-w-md px-4">
              <VerseListEmptyState
                currentFilterLabel={currentFilterLabel}
                isMyFilter
                onNavigateToCatalog={onNavigateToCatalog}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom sticky nav: next section ────────────────────────────────── */}
      <SectionNavBanner
        sectionKey={nextSection?.key ?? null}
        position="bottom"
        onClick={() => nextSection && scrollToSection(nextSection.key)}
      />

    </div>
  );
}
