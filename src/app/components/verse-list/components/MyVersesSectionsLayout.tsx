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
// SECTION_ACTIVE_OFFSET_PX is set to this value so that scrollToSection()
// always lands the section header just below the button — never behind it.
const NAV_BUTTON_OVERLAY_HEIGHT_PX = 56;
const SECTION_ACTIVE_OFFSET_PX = NAV_BUTTON_OVERLAY_HEIGHT_PX;

// How far past the section start before "К началу" appears instead of
// "previous section". Measured from SECTION_ACTIVE_OFFSET_PX downward.
const SECTION_RETURN_THRESHOLD_PX = 120;

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
  isBeforeCurrentSectionEnd: boolean;
};

type SectionEdgeAction = {
  kind: 'current-start' | 'current-end' | 'adjacent';
  direction: 'up' | 'down';
  targetIndex: number;
  section: MyVersesSectionData;
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

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
  for (let i = 0; i < sections.length; i += 1) {
    const el = refs[sections[i].key];
    if (!el) continue;
    if (getSectionOffsetFromContainer(container, el) <= SECTION_ACTIVE_OFFSET_PX) {
      activeIndex = i;
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

// Symmetric to isPastSectionStart — true when the next section is still
// below the visible area by at least SECTION_RETURN_THRESHOLD_PX.
function isBeforeSectionEnd(
  container: HTMLDivElement,
  nextSectionElement: HTMLDivElement,
) {
  return (
    getSectionOffsetFromContainer(container, nextSectionElement) >
    container.clientHeight - SECTION_RETURN_THRESHOLD_PX
  );
}

// Scrolls so the section marker lands exactly at SECTION_ACTIVE_OFFSET_PX
// from the container top — i.e. just below the navigation button overlay.
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
  nav: SectionNavigationState,
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

  const prev = sections[nav.activeSectionIndex - 1];
  return {
    kind: 'adjacent',
    direction: 'up',
    targetIndex: nav.activeSectionIndex - 1,
    section: prev,
  };
}

function resolveBottomAction(
  sections: MyVersesSectionData[],
  nav: SectionNavigationState,
): SectionEdgeAction | null {
  const nextIndex = nav.activeSectionIndex + 1;
  const next = sections[nextIndex];
  if (!next) return null;

  if (nav.isBeforeCurrentSectionEnd) {
    return {
      kind: 'current-end',
      direction: 'down',
      targetIndex: nextIndex,
      section: sections[nav.activeSectionIndex],
    };
  }

  return { kind: 'adjacent', direction: 'down', targetIndex: nextIndex, section: next };
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

/**
 * Collapses to zero when action is null (no space taken, no phantom padding).
 * Padding animates via transition-[max-height,opacity,padding].
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
  const isReturnToStart = kind === 'current-start';
  const isScrollToEnd = kind === 'current-end';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        isReturnToStart
          ? `Вернуться к началу раздела ${meta.title}`
          : isScrollToEnd
            ? `Перейти к концу раздела ${meta.title}`
            : `Перейти к разделу ${meta.title}`
      }
      className={cn(
        'flex h-11 w-full items-center gap-3 rounded-[22px] border px-4',
        'bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-sm',
        'transition-[background-color,transform] duration-150',
        'hover:bg-bg-elevated active:scale-[0.97] active:bg-bg-elevated/80',
        theme.borderClass,
      )}
    >
      {direction === 'up' ? (
        <DirectionIcon className="h-4 w-4 shrink-0 text-text-muted" />
      ) : null}

      <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-xl', theme.softBgClass)}>
        <Icon className={cn('h-3.5 w-3.5', theme.accentClass)} />
      </div>

      <div className="min-w-0 flex-1">
        {isReturnToStart ? (
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            К началу
          </div>
        ) : isScrollToEnd ? (
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            К концу
          </div>
        ) : null}
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
  const sectionRefs = useRef<Partial<Record<MyVersesSectionKey, HTMLDivElement | null>>>({});

  const visibleSections = useMemo(() => getVisibleMyVersesSections(sections), [sections]);

  const hasContent = useMemo(
    () =>
      visibleSections.some((s) => s.verses.length > 0) ||
      visibleSections.some((s) => s.alwaysShow),
    [visibleSections],
  );

  const [nav, setNav] = useState<SectionNavigationState>({
    activeSectionIndex: 0,
    isPastCurrentSectionStart: false,
    isBeforeCurrentSectionEnd: true,
  });

  const [scrollEdges, setScrollEdges] = useState({ atTop: true, atBottom: false });

  useEffect(() => {
    setNav((cur) => {
      const next = visibleSections.length === 0
        ? 0
        : Math.min(cur.activeSectionIndex, visibleSections.length - 1);
      if (
        cur.activeSectionIndex === next &&
        !cur.isPastCurrentSectionStart &&
        cur.isBeforeCurrentSectionEnd
      ) return cur;
      return { activeSectionIndex: next, isPastCurrentSectionStart: false, isBeforeCurrentSectionEnd: true };
    });
  }, [visibleSections.length]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || visibleSections.length === 0) return;

    let frameId = 0;

    const sync = () => {
      frameId = 0;
      const activeSectionIndex = resolveActiveSectionIndex(container, visibleSections, sectionRefs.current);
      const activeEl = sectionRefs.current[visibleSections[activeSectionIndex]?.key ?? ''] ?? null;
      const isPastCurrentSectionStart = activeEl
        ? isPastSectionStart(container, activeEl)
        : false;
      const nextEl = sectionRefs.current[visibleSections[activeSectionIndex + 1]?.key ?? ''] ?? null;
      const isBeforeCurrentSectionEnd = nextEl
        ? isBeforeSectionEnd(container, nextEl)
        : false;

      setNav((cur) =>
        cur.activeSectionIndex === activeSectionIndex &&
        cur.isPastCurrentSectionStart === isPastCurrentSectionStart &&
        cur.isBeforeCurrentSectionEnd === isBeforeCurrentSectionEnd
          ? cur
          : { activeSectionIndex, isPastCurrentSectionStart, isBeforeCurrentSectionEnd },
      );

      const atTop = container.scrollTop <= 1;
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
      setScrollEdges((cur) =>
        cur.atTop === atTop && cur.atBottom === atBottom ? cur : { atTop, atBottom },
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

  const scrollToSection = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      const el = sectionRefs.current[visibleSections[index]?.key ?? ''] ?? null;
      if (!container || !el) return;
      container.scrollTo({ top: getScrollTarget(container, el), behavior: 'smooth' });
    },
    [visibleSections],
  );

  const topAction = useMemo(() => resolveTopAction(visibleSections, nav), [nav, visibleSections]);
  const bottomAction = useMemo(() => resolveBottomAction(visibleSections, nav), [nav, visibleSections]);

  const hasMultipleSections = visibleSections.length > 1;

  return (
    // `relative` so absolute overlays are clipped to this container.
    <div className="relative h-full overflow-hidden">

      {/* ── Scrollable content — full height, no artificial top/bottom padding ── */}
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
          {/* ── Top overlay: gradient + к началу / prev section ─────────────────
               Floats over the scroll area. bg-transparent on the button lets
               the gradient and content show through — truly transparent.
               SECTION_ACTIVE_OFFSET_PX = button height so scrollToSection()
               always positions section headers just below this overlay.
          ── */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
            <div className={cn(
              'absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background via-background/70 to-transparent',
              'transition-opacity duration-300',
              scrollEdges.atTop ? 'opacity-0' : 'opacity-100',
            )} />
            <div className="pointer-events-auto relative px-3 pt-1.5 sm:px-5">
              <SectionEdgeButton
                action={topAction}
                onClick={() => topAction && scrollToSection(topAction.targetIndex)}
              />
            </div>
          </div>

          {/* ── Bottom overlay: next section + gradient ───────────────────────── */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
          >
            <div className={cn(
              'absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/70 to-transparent',
              'transition-opacity duration-300',
              scrollEdges.atBottom ? 'opacity-0' : 'opacity-100',
            )} />
            <div className="pointer-events-auto relative px-3 pb-1.5 sm:px-5">
              <SectionEdgeButton
                action={bottomAction}
                onClick={() => bottomAction && scrollToSection(bottomAction.targetIndex)}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
