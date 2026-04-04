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

// Height of each navigation button overlay (wrapper py-1.5×2 + button h-11).
// SECTION_ACTIVE_OFFSET_PX equals this so scrollToSection() always lands the
// section header just below the overlay — never hidden behind it.
const NAV_BUTTON_OVERLAY_HEIGHT_PX = 56;
const SECTION_ACTIVE_OFFSET_PX = NAV_BUTTON_OVERLAY_HEIGHT_PX;

// How deep past the section start triggers "К началу" instead of "prev section".
// Symmetric: how far the next section must be below the fold to trigger "К концу".
const SECTION_THRESHOLD_PX = 120;

// How long (ms) to hold the optimistic nav state after a button press,
// preventing mid-smooth-scroll position jitter from corrupting button labels.
const NAV_LOCK_MS = 380;

// ─── Icons ────────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

type MyVersesSectionsLayoutProps = {
  sections: MyVersesSectionData[];
  renderVerseRow: (verse: Verse) => React.ReactNode;
  getItemKey: (verse: Verse) => string;
  learningCapacity: number;
  currentFilterLabel: string;
  onNavigateToCatalog: () => void;
};

type SectionNavState = {
  activeSectionIndex: number;
  /** True when we've scrolled deeply enough into the section to warrant a "К началу" button. */
  isPastCurrentSectionStart: boolean;
  /** True when the next section is still far enough below the fold to warrant a "К концу" button. */
  isBeforeCurrentSectionEnd: boolean;
};

type SectionEdgeAction = {
  kind: 'current-start' | 'current-end' | 'adjacent';
  direction: 'up' | 'down';
  /** Index of the section to scroll to. */
  targetIndex: number;
  /** Section whose icon/title/count is shown on the button. */
  section: MyVersesSectionData;
};

// ─── Pure geometry helpers ────────────────────────────────────────────────────

function getSectionOffset(container: HTMLDivElement, el: HTMLDivElement): number {
  return el.getBoundingClientRect().top - container.getBoundingClientRect().top;
}

/**
 * Returns the index of the last section whose marker is at or above
 * SECTION_ACTIVE_OFFSET_PX from the container top (+1 px tolerance for
 * sub-pixel rounding after programmatic scroll).
 */
function resolveActiveSectionIndex(
  container: HTMLDivElement,
  sections: MyVersesSectionData[],
  refs: Partial<Record<MyVersesSectionKey, HTMLDivElement | null>>,
): number {
  let active = 0;
  for (let i = 0; i < sections.length; i += 1) {
    const el = refs[sections[i].key];
    if (!el) continue;
    if (getSectionOffset(container, el) <= SECTION_ACTIVE_OFFSET_PX + 1) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

/** True when the current section's header has scrolled past the "return to start" threshold. */
function checkIsPastStart(container: HTMLDivElement, el: HTMLDivElement): boolean {
  return getSectionOffset(container, el) < SECTION_ACTIVE_OFFSET_PX - SECTION_THRESHOLD_PX;
}

/** True when the next section is still far enough below the fold to show "К концу". */
function checkIsBeforeEnd(container: HTMLDivElement, nextEl: HTMLDivElement): boolean {
  return getSectionOffset(container, nextEl) > container.clientHeight - SECTION_THRESHOLD_PX;
}

/** Scroll target that lands the section marker exactly at SECTION_ACTIVE_OFFSET_PX. */
function getScrollTarget(container: HTMLDivElement, el: HTMLDivElement): number {
  return Math.max(0, container.scrollTop + getSectionOffset(container, el) - SECTION_ACTIVE_OFFSET_PX);
}

// ─── Action resolvers ─────────────────────────────────────────────────────────

/**
 * Top button logic:
 *   deep inside section  →  "К началу [current]"
 *   at section start     →  "К [previous section]"
 *   at very first section start  →  null (button hidden)
 */
function resolveTopAction(
  sections: MyVersesSectionData[],
  nav: SectionNavState,
): SectionEdgeAction | null {
  const current = sections[nav.activeSectionIndex];
  if (!current) return null;

  if (nav.isPastCurrentSectionStart) {
    return {
      kind: 'current-start',
      direction: 'up',
      targetIndex: nav.activeSectionIndex,
      section: current,
    };
  }

  if (nav.activeSectionIndex === 0) return null;

  return {
    kind: 'adjacent',
    direction: 'up',
    targetIndex: nav.activeSectionIndex - 1,
    section: sections[nav.activeSectionIndex - 1],
  };
}

/**
 * Bottom button logic (mirror of top):
 *   next section far below fold  →  "К концу [current]" (scrolls to next section start)
 *   next section near/visible    →  "К [next section]"
 *   at last section              →  null (button hidden)
 */
function resolveBottomAction(
  sections: MyVersesSectionData[],
  nav: SectionNavState,
): SectionEdgeAction | null {
  const current = sections[nav.activeSectionIndex];
  if (!current) return null;

  const nextIndex = nav.activeSectionIndex + 1;
  const next = sections[nextIndex];

  if (!next) {
    // Last section: show "К концу" when not yet at the bottom of the list.
    if (nav.isBeforeCurrentSectionEnd) {
      return {
        kind: 'current-end',
        direction: 'down',
        targetIndex: -1, // sentinel: scroll to absolute bottom
        section: current,
      };
    }
    return null;
  }

  if (nav.isBeforeCurrentSectionEnd) {
    return {
      kind: 'current-end',
      direction: 'down',
      targetIndex: nextIndex,
      section: current,
    };
  }

  return {
    kind: 'adjacent',
    direction: 'down',
    targetIndex: nextIndex,
    section: next,
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
      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-xl', theme.softBgClass)}>
        <Icon className={cn('h-3.5 w-3.5', theme.accentClass)} />
      </div>
      <span className={cn('text-[13px] font-semibold tracking-tight', theme.accentClass)}>
        {meta.title}
      </span>
      <span className={cn(
        'ml-auto inline-flex h-5 min-w-[1.35rem] items-center justify-center rounded-full px-1.5',
        'text-[11px] font-semibold tabular-nums',
        theme.softBgClass, theme.accentClass,
      )}>
        {count}
      </span>
    </div>
  );
}

/** Collapses to zero height/opacity when action is null — no phantom padding. */
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
        'overflow-hidden transition-[max-height,opacity,padding] duration-200',
        action
          ? 'max-h-[3.5rem] py-1.5 opacity-100'
          : 'pointer-events-none max-h-0 py-0 opacity-0',
      )}
    >
      {action ? <SectionEdgeButtonContent action={action} onClick={onClick} /> : null}
    </div>
  );
}

function SectionEdgeButtonContent({
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
  // const sublabel =
  //   kind === 'current-start' ? 'К началу' :
  //   kind === 'current-end' ? 'К концу' :
  //   null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        kind === 'current-start' ? `Вернуться к началу раздела ${meta.title}` :
        kind === 'current-end'   ? `К концу раздела ${meta.title}` :
        `Перейти к разделу ${meta.title}`
      }
      className={cn(
        'flex h-11 w-full items-center gap-3 rounded-[22px] border px-4',
        'bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-sm',
        'transition-[background-color,transform] duration-150',
        'hover:bg-bg-elevated active:scale-[0.97] active:bg-bg-elevated/80',
        theme.borderClass,
      )}
    >
      {direction === 'up' && <DirectionIcon className="h-4 w-4 shrink-0 text-text-muted" />}

      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-xl', theme.softBgClass)}>
        <Icon className={cn('h-3.5 w-3.5', theme.accentClass)} />
      </div>

      <div className="min-w-0 flex-1">
        {/* {sublabel && (
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {sublabel}
          </div>
        )} */}
        <div className={cn('truncate text-[13px] font-semibold', theme.accentClass)}>
          {meta.title}
        </div>
      </div>

      <span className={cn(
        'inline-flex h-5 min-w-[1.35rem] items-center justify-center rounded-full px-1.5',
        'text-[11px] font-semibold tabular-nums',
        theme.softBgClass, theme.accentClass,
      )}>
        {section.verses.length}
      </span>

      {direction === 'down' && <DirectionIcon className="h-4 w-4 shrink-0 text-text-muted" />}
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
  const sectionRefs = useRef<Partial<Record<MyVersesSectionKey, HTMLDivElement | null>>>({});

  // Navigation lock: prevents mid-animation scroll position from corrupting
  // button state immediately after a button press.
  const navLockedRef = useRef(false);
  const navLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleSections = useMemo(() => getVisibleMyVersesSections(sections), [sections]);

  const hasContent = useMemo(
    () => visibleSections.some((s) => s.verses.length > 0 || s.alwaysShow),
    [visibleSections],
  );

  const [nav, setNav] = useState<SectionNavState>({
    activeSectionIndex: 0,
    isPastCurrentSectionStart: false,
    isBeforeCurrentSectionEnd: true,
  });

  const [scrollEdges, setScrollEdges] = useState({ atTop: true, atBottom: false });

  // Clamp activeSectionIndex when visible section count changes.
  useEffect(() => {
    if (visibleSections.length === 0) return;
    setNav((cur) => {
      const clamped = Math.min(cur.activeSectionIndex, visibleSections.length - 1);
      if (cur.activeSectionIndex === clamped) return cur;
      return { activeSectionIndex: clamped, isPastCurrentSectionStart: false, isBeforeCurrentSectionEnd: true };
    });
  }, [visibleSections.length]);

  // Scroll position → nav state sync.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || visibleSections.length === 0) return;

    let frameId = 0;

    const sync = () => {
      frameId = 0;

      // Gradient visibility always updates — not affected by the nav lock.
      const atTop = container.scrollTop <= 1;
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
      setScrollEdges((cur) =>
        cur.atTop === atTop && cur.atBottom === atBottom ? cur : { atTop, atBottom },
      );

      // During a programmatic scroll, keep the optimistic nav state set by
      // handleNavigate() — don't let intermediate positions corrupt button labels.
      if (navLockedRef.current) return;

      const activeSectionIndex = resolveActiveSectionIndex(container, visibleSections, sectionRefs.current);
      const activeEl = sectionRefs.current[visibleSections[activeSectionIndex]?.key ?? ''] ?? null;
      const nextEl   = sectionRefs.current[visibleSections[activeSectionIndex + 1]?.key ?? ''] ?? null;

      const isPastCurrentSectionStart = activeEl ? checkIsPastStart(container, activeEl) : false;
      // For the last section there is no nextEl, so fall back to "not at bottom yet".
      const isBeforeCurrentSectionEnd = nextEl
        ? checkIsBeforeEnd(container, nextEl)
        : !atBottom;

      setNav((cur) =>
        cur.activeSectionIndex === activeSectionIndex &&
        cur.isPastCurrentSectionStart === isPastCurrentSectionStart &&
        cur.isBeforeCurrentSectionEnd === isBeforeCurrentSectionEnd
          ? cur
          : { activeSectionIndex, isPastCurrentSectionStart, isBeforeCurrentSectionEnd },
      );
    };

    const schedule = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(sync);
    };

    schedule();
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      container.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [visibleSections]);

  /**
   * Execute a section edge action.
   *
   * - `targetIndex >= 0`: scroll so that section lands at SECTION_ACTIVE_OFFSET_PX.
   * - `targetIndex === -1`: scroll to the absolute bottom (last section "К концу").
   *
   * In both cases an optimistic nav update is applied immediately and a lock
   * prevents mid-animation position sync from corrupting the button state.
   */
  const handleNavigate = useCallback(
    (action: SectionEdgeAction) => {
      const container = scrollRef.current;
      if (!container) return;

      let scrollTop: number;

      if (action.targetIndex === -1) {
        // Scroll to the very bottom of the list.
        scrollTop = container.scrollHeight - container.clientHeight;
        setNav((cur) => ({
          activeSectionIndex: cur.activeSectionIndex,
          isPastCurrentSectionStart: false,
          isBeforeCurrentSectionEnd: false,
        }));
      } else {
        const el = sectionRefs.current[visibleSections[action.targetIndex]?.key ?? ''] ?? null;
        if (!el) return;
        scrollTop = getScrollTarget(container, el);
        const hasNext = action.targetIndex + 1 < visibleSections.length;
        setNav({
          activeSectionIndex: action.targetIndex,
          isPastCurrentSectionStart: false,
          isBeforeCurrentSectionEnd: hasNext,
        });
      }

      // Lock sync so mid-animation frames don't corrupt the optimistic state.
      navLockedRef.current = true;
      if (navLockTimerRef.current !== null) clearTimeout(navLockTimerRef.current);
      navLockTimerRef.current = setTimeout(() => {
        navLockedRef.current = false;
        navLockTimerRef.current = null;
      }, NAV_LOCK_MS);

      container.scrollTo({ top: scrollTop, behavior: 'smooth' });
    },
    [visibleSections],
  );

  const topAction    = useMemo(() => resolveTopAction(visibleSections, nav),    [nav, visibleSections]);
  const bottomAction = useMemo(() => resolveBottomAction(visibleSections, nav), [nav, visibleSections]);

  const hasMultipleSections = visibleSections.length > 1;

  return (
    <div className="relative h-full overflow-hidden">

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-2 sm:px-4"
      >
        {hasContent ? (
          <>
            {visibleSections.map(({ key, verses }) => (
              <section key={key}>
                <div ref={(el) => { sectionRefs.current[key] = el; }} />
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

      {hasMultipleSections ? (
        <>
          {/* ── Top overlay ── */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
            <div className={cn(
              'absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background via-background/70 to-transparent',
              'transition-opacity duration-300',
              scrollEdges.atTop ? 'opacity-0' : 'opacity-100',
            )} />
            <div className="pointer-events-auto relative px-3 pt-1.5 sm:px-5">
              <SectionEdgeButton
                action={topAction}
                onClick={() => topAction && handleNavigate(topAction)}
              />
            </div>
          </div>

          {/* ── Bottom overlay ── */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <div className={cn(
              'absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/70 to-transparent',
              'transition-opacity duration-300',
              scrollEdges.atBottom ? 'opacity-0' : 'opacity-100',
            )} />
            <div className="pointer-events-auto relative px-3 pb-1.5 sm:px-5">
              <SectionEdgeButton
                action={bottomAction}
                onClick={() => bottomAction && handleNavigate(bottomAction)}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
