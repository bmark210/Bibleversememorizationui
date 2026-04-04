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
  Bookmark,
  ChevronDown,
  ChevronUp,
  ListOrdered,
  PauseCircle,
  RefreshCw,
  Star,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { LearningSlotPlaceholders } from './LearningSlotPlaceholders';
import { VerseListEmptyState } from './VerseListEmptyState';
import {
  SECTION_META,
  STATUS_BOX_THEME,
  type MyVersesSectionKey,
} from '../constants';
import {
  getVisibleMyVersesSections,
  type MyVersesSectionData,
} from '../myVersesSections';
import type { Verse } from '@/app/domain/verse';

// How far from the container top a section header must be to be considered "active"
const SECTION_ACTIVE_OFFSET_PX = 14;
// How far past the section start (beyond SECTION_ACTIVE_OFFSET_PX) before
// the "К началу" button appears instead of "previous section"
const SECTION_RETURN_THRESHOLD_PX = 100;

const SECTION_ICONS: Record<
  MyVersesSectionKey,
  React.ComponentType<{ className?: string }>
> = {
  learning: BookOpen,
  queue: ListOrdered,
  review: RefreshCw,
  mastered: Star,
  stopped: PauseCircle,
  my: Bookmark,
};

type MyVersesSectionsLayoutProps = {
  sections: MyVersesSectionData[];
  renderVerseRow: (verse: Verse) => React.ReactNode;
  getItemKey: (verse: Verse) => string;
  learningCapacity: number;
  currentFilterLabel: string;
  onNavigateToCatalog: () => void;
};

type SectionNavigationState = {
  activeSectionIndex: number;
  isPastCurrentSectionStart: boolean;
};

type SectionEdgeAction = {
  kind: 'current-start' | 'adjacent';
  direction: 'up' | 'down';
  targetIndex: number;
  section: MyVersesSectionData;
};

// ─── Pure geometry helpers ────────────────────────────────────────────────────

function getSectionOffsetFromContainer(
  container: HTMLDivElement,
  sectionElement: HTMLDivElement,
) {
  return (
    sectionElement.getBoundingClientRect().top -
    container.getBoundingClientRect().top
  );
}

function resolveActiveSectionIndex(
  container: HTMLDivElement,
  sections: MyVersesSectionData[],
  refs: Partial<Record<MyVersesSectionKey, HTMLDivElement | null>>,
) {
  let activeIndex = 0;

  for (let index = 0; index < sections.length; index += 1) {
    const sectionElement = refs[sections[index].key];
    if (!sectionElement) continue;

    if (
      getSectionOffsetFromContainer(container, sectionElement) <=
      SECTION_ACTIVE_OFFSET_PX
    ) {
      activeIndex = index;
      continue;
    }

    break;
  }

  return activeIndex;
}

function isPastSectionStart(
  container: HTMLDivElement,
  sectionElement: HTMLDivElement,
) {
  return (
    getSectionOffsetFromContainer(container, sectionElement) <
    SECTION_ACTIVE_OFFSET_PX - SECTION_RETURN_THRESHOLD_PX
  );
}

function getScrollTarget(
  container: HTMLDivElement,
  sectionElement: HTMLDivElement,
) {
  return Math.max(
    0,
    container.scrollTop +
      getSectionOffsetFromContainer(container, sectionElement) -
      SECTION_ACTIVE_OFFSET_PX,
  );
}

// ─── Action resolvers ─────────────────────────────────────────────────────────

function resolveTopAction(
  sections: MyVersesSectionData[],
  navigationState: SectionNavigationState,
): SectionEdgeAction | null {
  const currentSection = sections[navigationState.activeSectionIndex];
  if (!currentSection) return null;

  // Scrolled deep into section → offer "К началу [current section]"
  if (navigationState.isPastCurrentSectionStart) {
    return {
      kind: 'current-start',
      direction: 'up',
      targetIndex: navigationState.activeSectionIndex,
      section: currentSection,
    };
  }

  // At the very first section → nothing above
  if (navigationState.activeSectionIndex === 0) {
    return null;
  }

  // At section start → offer previous section
  return {
    kind: 'adjacent',
    direction: 'up',
    targetIndex: navigationState.activeSectionIndex - 1,
    section: sections[navigationState.activeSectionIndex - 1],
  };
}

function resolveBottomAction(
  sections: MyVersesSectionData[],
  navigationState: SectionNavigationState,
): SectionEdgeAction | null {
  const targetIndex = navigationState.activeSectionIndex + 1;
  const targetSection = sections[targetIndex];
  if (!targetSection) return null;

  return {
    kind: 'adjacent',
    direction: 'down',
    targetIndex,
    section: targetSection,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-2.5 px-1 pb-3 pt-5 first:pt-2">
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
          theme.softBgClass,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', theme.accentClass)} />
      </div>

      <span className={cn('text-[13px] font-semibold tracking-tight', theme.accentClass)}>
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

/**
 * Collapsible edge navigation button — animates in/out via max-height + opacity.
 * py-1.5 / py-0 pairing makes the `padding` transition meaningful and gives
 * the button breathing room above and below.
 */
function SectionEdgeButton({
  action,
  onClick,
}: {
  action: SectionEdgeAction | null;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden px-3 transition-[max-height,opacity,padding] duration-200 sm:px-5',
        action
          ? 'max-h-[4rem] py-1.5 opacity-100'
          : 'pointer-events-none max-h-0 py-0 opacity-0',
      )}
    >
      {action ? <SectionEdgeButtonInner action={action} onClick={onClick} /> : null}
    </div>
  );
}

function SectionEdgeButtonInner({
  action,
  onClick,
}: {
  action: SectionEdgeAction;
  onClick: () => void;
}) {
  const { direction, kind, section } = action;
  const Icon = SECTION_ICONS[section.key];
  const theme = STATUS_BOX_THEME[section.key];
  const meta = SECTION_META[section.key];
  const DirectionIcon = direction === 'up' ? ChevronUp : ChevronDown;
  const hasSecondaryLabel = kind === 'current-start';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        kind === 'current-start'
          ? `Вернуться к началу раздела ${meta.title}`
          : `Перейти к разделу ${meta.title}`
      }
      className={cn(
        'flex h-11 w-full items-center gap-3 rounded-[22px] border px-4',
        'bg-bg-overlay/70 shadow-[var(--shadow-soft)] backdrop-blur-lg',
        'transition-[color,background-color,transform] duration-150',
        'hover:bg-bg-overlay/90 active:scale-[0.97] active:bg-bg-overlay/50',
        theme.borderClass,
      )}
    >
      {direction === 'up' ? (
        <DirectionIcon className="h-4 w-4 shrink-0 text-text-muted" />
      ) : null}

      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
          theme.softBgClass,
        )}
      >
        <Icon className={cn('h-3.5 w-3.5', theme.accentClass)} />
      </div>

      <div className="min-w-0 flex-1">
        {hasSecondaryLabel ? (
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            К началу
          </div>
        ) : null}
        <div className={cn('truncate text-[13px] font-semibold', theme.accentClass)}>
          {meta.title}
        </div>
      </div>

      <span
        className={cn(
          'inline-flex h-5 min-w-[1.35rem] items-center justify-center rounded-full px-1.5',
          'text-[11px] font-semibold tabular-nums',
          theme.softBgClass,
          theme.accentClass,
        )}
      >
        {section.verses.length}
      </span>

      {direction === 'down' ? (
        <DirectionIcon className="h-4 w-4 shrink-0 text-text-muted" />
      ) : null}
    </button>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<
    Partial<Record<MyVersesSectionKey, HTMLDivElement | null>>
  >({});

  const visibleSections = useMemo(
    () => getVisibleMyVersesSections(sections),
    [sections],
  );
  const hasContent = useMemo(
    () =>
      visibleSections.some((section) => section.verses.length > 0) ||
      visibleSections.some((section) => section.alwaysShow),
    [visibleSections],
  );
  const [navigationState, setNavigationState] = useState<SectionNavigationState>({
    activeSectionIndex: 0,
    isPastCurrentSectionStart: false,
  });

  // Clamp activeSectionIndex when the section list shrinks
  useEffect(() => {
    setNavigationState((current) => {
      const nextActiveIndex =
        visibleSections.length === 0
          ? 0
          : Math.min(current.activeSectionIndex, visibleSections.length - 1);

      if (
        current.activeSectionIndex === nextActiveIndex &&
        current.isPastCurrentSectionStart === false
      ) {
        return current;
      }

      return {
        activeSectionIndex: nextActiveIndex,
        isPastCurrentSectionStart: false,
      };
    });
  }, [visibleSections.length]);

  // Sync navigation state on scroll / resize
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || visibleSections.length === 0) return;

    let frameId = 0;

    const syncNavigationState = () => {
      frameId = 0;

      const activeSectionIndex = resolveActiveSectionIndex(
        container,
        visibleSections,
        sectionRefs.current,
      );
      const activeSection = visibleSections[activeSectionIndex];
      const activeSectionElement = activeSection
        ? sectionRefs.current[activeSection.key]
        : null;
      const isPastCurrentSectionStart = activeSectionElement
        ? isPastSectionStart(container, activeSectionElement)
        : false;

      setNavigationState((current) =>
        current.activeSectionIndex === activeSectionIndex &&
        current.isPastCurrentSectionStart === isPastCurrentSectionStart
          ? current
          : { activeSectionIndex, isPastCurrentSectionStart },
      );
    };

    const scheduleSync = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(syncNavigationState);
    };

    scheduleSync();
    container.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync, { passive: true });

    return () => {
      container.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [visibleSections]);

  const scrollToSection = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      const targetSection = visibleSections[index];
      const sectionElement = targetSection
        ? sectionRefs.current[targetSection.key]
        : null;
      if (!container || !sectionElement) return;

      container.scrollTo({
        top: getScrollTarget(container, sectionElement),
        behavior: 'smooth',
      });
    },
    [visibleSections],
  );

  const topAction = useMemo(
    () => resolveTopAction(visibleSections, navigationState),
    [navigationState, visibleSections],
  );
  const bottomAction = useMemo(
    () => resolveBottomAction(visibleSections, navigationState),
    [navigationState, visibleSections],
  );

  const hasMultipleSections = visibleSections.length > 1;

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Top edge: к началу / previous section ── */}
      {hasMultipleSections ? (
        <SectionEdgeButton
          action={topAction}
          onClick={() => topAction && scrollToSection(topAction.targetIndex)}
        />
      ) : null}

      {/* ── Scrollable content ── */}
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
              <section key={key}>
                <div
                  ref={(element) => {
                    sectionRefs.current[key] = element;
                  }}
                />

                <SectionInlineHeader sectionKey={key} count={verses.length} />

                <div className="space-y-2 pb-2">
                  {verses.map((verse) => (
                    <React.Fragment key={getItemKey(verse)}>
                      {renderVerseRow(verse)}
                    </React.Fragment>
                  ))}

                  {key === 'learning' ? (
                    <LearningSlotPlaceholders
                      filledCount={verses.length}
                      capacity={learningCapacity}
                      onNavigateToCatalog={onNavigateToCatalog}
                    />
                  ) : null}
                </div>
              </section>
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

      {/* ── Bottom navigation: dots + next section ─────────────────────────────
           Dots are always visible (when 2+ sections): show current position
           and allow direct jumps to any section.
           The edge button slides in/out below the dots.
      ── */}
      {hasMultipleSections ? (
        <>
          <SectionEdgeButton
            action={bottomAction}
            onClick={() => bottomAction && scrollToSection(bottomAction.targetIndex)}
          />
        </>
      ) : null}
    </div>
  );
}
