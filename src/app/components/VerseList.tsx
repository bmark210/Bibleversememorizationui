'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import {
  motion,
  useReducedMotion,
} from 'motion/react';
import type { ListRange } from 'react-virtuoso';
import { Virtuoso } from 'react-virtuoso';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { UserVersesService } from '@/api/services/UserVersesService';
import { fetchUserVersesPage } from '@/api/services/userVersesPagination';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { VerseGallery } from './VerseGallery';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';

/* ===================== TYPES ===================== */

type VerseListStatusFilter = 'all' | 'learning' | 'review' | 'stopped' | 'new';
type VerseStageVisualKey = Exclude<VerseListStatusFilter, 'all'>;

type FilterVisualTheme = {
  dotClassName: string;
  activeTabClassName: string;
  currentBadgeClassName: string;
  statusBadgeClassName: string;
};

const FILTER_VISUAL_THEME: Record<VerseListStatusFilter, FilterVisualTheme> = {
  all: {
    dotClassName: 'bg-foreground/60',
    activeTabClassName: 'border-foreground/20 bg-foreground/8 text-foreground',
    currentBadgeClassName: 'border-foreground/15 bg-foreground/5 text-foreground/90',
    statusBadgeClassName: 'border-border/70 bg-background/80 text-foreground/90',
  },
  learning: {
    dotClassName: 'bg-emerald-400',
    activeTabClassName: 'border-emerald-500/30 bg-emerald-500/14 text-emerald-700 dark:text-emerald-300',
    currentBadgeClassName: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    statusBadgeClassName: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  review: {
    dotClassName: 'bg-violet-400',
    activeTabClassName: 'border-violet-500/30 bg-violet-500/14 text-violet-700 dark:text-violet-300',
    currentBadgeClassName: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    statusBadgeClassName: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  stopped: {
    dotClassName: 'bg-rose-400',
    activeTabClassName: 'border-rose-500/30 bg-rose-500/14 text-rose-700 dark:text-rose-300',
    currentBadgeClassName: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    statusBadgeClassName: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  new: {
    dotClassName: 'bg-sky-400',
    activeTabClassName: 'border-sky-500/30 bg-sky-500/14 text-sky-700 dark:text-sky-300',
    currentBadgeClassName: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    statusBadgeClassName: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
};

function getVerseStageVisual(status: VerseStatus, masteryLevel: number): {
  key: VerseStageVisualKey;
  label: string;
} {
  if (status === VerseStatus.NEW) {
    return { key: 'new', label: 'Новый' };
  }

  if (status === VerseStatus.STOPPED) {
    return { key: 'stopped', label: 'На паузе' };
  }

  if (status === VerseStatus.LEARNING && masteryLevel > TRAINING_STAGE_MASTERY_MAX) {
    return { key: 'review', label: 'Повторение' };
  }

  return { key: 'learning', label: 'Изучение' };
}

type SwipeCardProps = {
  verse: Verse;
  onOpen: () => void;
  onAddToLearning: (verse: Verse) => void;
  onPauseLearning: (verse: Verse) => void;
  onResumeLearning: (verse: Verse) => void;
  onRequestDelete: (verse: Verse) => void;
  isPending?: boolean;
};

const VERSE_LIST_PAGE_SIZE = 20;
const SCROLL_ACTIVATION_DELTA_PX = 24;
const AUTO_LOAD_BOTTOM_THRESHOLD_PX = 160;

/* ===================== HAPTIC ===================== */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

function haptic(style: HapticStyle) {
  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (!tg) return;
    if (style === 'success' || style === 'error' || style === 'warning')
      tg.notificationOccurred(style);
    else
      tg.impactOccurred(style);
  } catch {}
}

/* ===================== SWIPEABLE CARD ===================== */

const SwipeableVerseCard = ({
  verse,
  onOpen,
  onAddToLearning,
  onPauseLearning,
  onResumeLearning,
  onRequestDelete,
  isPending = false,
}: SwipeCardProps) => {
  const masteryLevel = Number(verse.masteryLevel ?? 0);
  const isReviewCard =
    verse.status === VerseStatus.LEARNING && masteryLevel > TRAINING_STAGE_MASTERY_MAX;
  const stageVisual = getVerseStageVisual(verse.status, masteryLevel);
  const stageVisualTheme = FILTER_VISUAL_THEME[stageVisual.key];
  const learningProgress = Math.min(
    Math.round((masteryLevel / TRAINING_STAGE_MASTERY_MAX) * 100),
    100
  );
  const repetitionsCount = Math.max(0, Number(verse.repetitions ?? 0));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.currentTarget !== e.target) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      haptic('light');
      onOpen();
    }
  };

  const stopCardOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const renderActions = () => {
    if (verse.status === VerseStatus.NEW) {
      return (
        <>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Добавить в изучение"
            aria-label="Добавить стих в изучение"
            disabled={isPending}
            onClick={(e) => {
              stopCardOpen(e);
              onAddToLearning(verse);
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Удалить стих"
            aria-label="Удалить стих"
            disabled={isPending}
            className="text-destructive hover:text-destructive backdrop-blur-xl"
            onClick={(e) => {
              stopCardOpen(e);
              onRequestDelete(verse);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      );
    }

    if (verse.status === VerseStatus.LEARNING) {
      return (
        <>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="Поставить на паузу"
            aria-label="Поставить стих на паузу"
            disabled={isPending}
            onClick={(e) => {
              stopCardOpen(e);
              onPauseLearning(verse);
            }}
          >
            <Pause className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Удалить стих"
            aria-label="Удалить стих"
            disabled={isPending}
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              stopCardOpen(e);
              onRequestDelete(verse);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          title="Возобновить изучение"
          aria-label="Возобновить изучение стиха"
          disabled={isPending}
          onClick={(e) => {
            stopCardOpen(e);
            onResumeLearning(verse);
          }}
        >
          <Play className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Удалить стих"
          aria-label="Удалить стих"
          disabled={isPending}
          className="text-destructive hover:text-destructive"
          onClick={(e) => {
            stopCardOpen(e);
            onRequestDelete(verse);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </>
    );
  };

  return (
    <motion.div layout className="relative isolate">
      <motion.div
        layout
        role="button"
        tabIndex={0}
        aria-label={`${verse.reference} — нажмите чтобы открыть`}
        onClick={() => {
          haptic('light');
          onOpen();
        }}
        onKeyDown={handleKeyDown}
        className={`
          relative z-10 rounded-2xl p-4 shadow-sm
          border ${
            isReviewCard
              ? 'border-violet-500/20 bg-gradient-to-br from-violet-500/8 via-card to-card'
              : verse.status === VerseStatus.LEARNING
                ? 'border-emerald-500/15 bg-gradient-to-br from-emerald-500/6 via-card to-card'
                : 'bg-card border-border/70'
          }
          active:shadow-md transition-shadow cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold">{verse.reference}</h3>
              <Badge variant="secondary" className="text-[11px]">SYNOD</Badge>
              <Badge
                variant="outline"
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${stageVisualTheme.statusBadgeClassName}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${stageVisualTheme.dotClassName}`} />
                {stageVisual.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{verse.text}</p>
            {isReviewCard ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-violet-700 dark:text-violet-300">
                  <Repeat className="h-3.5 w-3.5" />
                  <span className="font-medium">Повторение</span>
                </div>
                <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-muted-foreground">
                  {repetitionsCount} повт.
                </div>
              </div>
            ) : verse.status === VerseStatus.LEARNING ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{learningProgress}%</span>
                <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${learningProgress}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  />
                </div>
                <span>{repetitionsCount} повт.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{repetitionsCount} повт.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderActions()}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

function ConfirmDeleteModal({
  verse,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  verse: Verse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить стих?</AlertDialogTitle>
          <AlertDialogDescription>
            Стих будет удалён из вашего списка. Прогресс будет потерян.
            {verse ? ` (${verse.reference})` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            className="bg-destructive hover:bg-destructive/90 text-white"
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            {isSubmitting ? 'Удаление...' : 'Удалить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ===================== VERSE LIST ===================== */

interface VerseListProps {
  onAddVerse: () => void;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
}

export function VerseList({
  onAddVerse,
  reopenGalleryVerseId = null,
  reopenGalleryStatusFilter = null,
  onReopenGalleryHandled,
}: VerseListProps) {
  const debugInfiniteScroll = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'production') return;
    if (process.env.NEXT_PUBLIC_DEBUG_INFINITE_SCROLL !== '1') return;
    console.debug('[VerseList][infinite]', event, payload ?? {});
  }, []);

  const [searchQuery] = useState('');
  const [testamentFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [masteryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [statusFilter, setStatusFilter] = useState<VerseListStatusFilter>(reopenGalleryStatusFilter ?? 'all');

  const [telegramId, setTelegramId] = useState<string | undefined>();
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isFetchingVerses, setIsFetchingVerses] = useState(false);
  const [isFetchingMoreVerses, setIsFetchingMoreVerses] = useState(false);
  const [hasFetchedVersesOnce, setHasFetchedVersesOnce] = useState(false);
  const [hasMoreVerses, setHasMoreVerses] = useState(false);
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [pendingVerseKeys, setPendingVerseKeys] = useState<Set<string>>(() => new Set());
  const [deleteTargetVerse, setDeleteTargetVerse] = useState<Verse | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const requestVersionRef = useRef(0);
  const versesRef = useRef<Array<Verse>>([]);
  const fetchMoreLockRef = useRef(false);
  const inFlightCursorRef = useRef<string | null>(null);
  const lastFailedCursorRef = useRef<string | null>(null);
  const hasMoreVersesRef = useRef(false);
  const loadMoreErrorRef = useRef<string | null>(null);
  const suspendAutoLoadRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const userScrollArmedRef = useRef(false);
  const scrollBaselineRef = useRef(0);
  const scrollInteractionTickRef = useRef(0);
  const isVirtuosoAtBottomRef = useRef(false);
  const lastBottomAutoRequestKeyRef = useRef<string | null>(null);
  const lastBottomAutoScrollTickRef = useRef<number>(-1);
  const lastVisibleRangeRef = useRef<ListRange | null>(null);
  const currentRenderedListLengthRef = useRef(0);
  const listScrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const [customScrollParent, setCustomScrollParent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    versesRef.current = verses;
  }, [verses]);

  useEffect(() => {
    hasMoreVersesRef.current = hasMoreVerses;
  }, [hasMoreVerses]);

  useEffect(() => {
    loadMoreErrorRef.current = loadMoreError;
  }, [loadMoreError]);

  /* ── toasts ── */
  const pushToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      toast.success(message);
      return;
    }
    if (type === 'error') {
      toast.error(message);
      return;
    }
    toast.info(message);
  }, []);

  /* ── aria-live announcement ── */
  const [announcement, setAnnouncement] = useState('');

  const getVerseKey = useCallback((verse: Pick<Verse, 'id' | 'externalVerseId'>) => {
    return String(verse.externalVerseId ?? verse.id);
  }, []);

  const isSameVerse = useCallback(
    (a: Pick<Verse, 'id' | 'externalVerseId'>, b: Pick<Verse, 'id' | 'externalVerseId'>) =>
      getVerseKey(a) === getVerseKey(b),
    [getVerseKey]
  );

  const markVersePending = useCallback((verse: Pick<Verse, 'id' | 'externalVerseId'>, pending: boolean) => {
    const key = getVerseKey(verse);
    setPendingVerseKeys((prev) => {
      const next = new Set(prev);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  }, [getVerseKey]);

  const isReviewVerse = useCallback((verse: Pick<Verse, 'status' | 'masteryLevel'>) => {
    return verse.status === VerseStatus.LEARNING && Number(verse.masteryLevel ?? 0) > TRAINING_STAGE_MASTERY_MAX;
  }, []);

  const matchesListFilter = useCallback((verse: Pick<Verse, 'status' | 'masteryLevel'>, filter: VerseListStatusFilter) => {
    if (filter === 'all') return true;
    if (filter === 'learning') {
      return verse.status === VerseStatus.LEARNING && Number(verse.masteryLevel ?? 0) <= TRAINING_STAGE_MASTERY_MAX;
    }
    if (filter === 'review') return isReviewVerse(verse);
    if (filter === 'stopped') return verse.status === VerseStatus.STOPPED;
    return verse.status === VerseStatus.NEW;
  }, [isReviewVerse]);

  /* ── telegram id ── */
  const resolveTelegramId = (): string | undefined => {
    if (typeof window === 'undefined') return undefined;
    return (
      (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ??
      process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
      localStorage.getItem('telegramId') ??
      undefined
    );
  };

  const mergeUniqueVerses = useCallback((prev: Array<Verse>, incoming: Array<Verse>) => {
    if (incoming.length === 0) return prev;
    const seen = new Set(prev.map((v) => getVerseKey(v)));
    const appended: Array<Verse> = [];
    for (const verse of incoming) {
      const key = getVerseKey(verse);
      if (seen.has(key)) continue;
      seen.add(key);
      appended.push(verse);
    }
    return appended.length > 0 ? [...prev, ...appended] : prev;
  }, [getVerseKey]);

  const getScrollParent = useCallback((node: HTMLElement | null): HTMLElement | null => {
    if (!node || typeof window === 'undefined') return null;
    let current = node.parentElement;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      const canScrollContainer = overflowY === 'auto' || overflowY === 'scroll';
      if (canScrollContainer) return current;
      current = current.parentElement;
    }
    return null;
  }, []);

  const resolveScrollParent = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return getScrollParent(listScrollAnchorRef.current);
  }, [getScrollParent]);

  const getCurrentScrollTop = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    if (customScrollParent) return customScrollParent.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }, [customScrollParent]);

  const requestVersesPage = useCallback(async (
    id: string,
    filter: VerseListStatusFilter,
    cursorId?: number | null
  ) => {
    const page = await fetchUserVersesPage({
      telegramId: id,
      orderBy: 'createdAt',
      order: 'desc',
      filter,
      limit: VERSE_LIST_PAGE_SIZE,
      cursorId: cursorId ?? undefined,
    });

    return {
      ...page,
      items: page.items as Array<Verse>,
    };
  }, []);

  const resetAndFetchFirstPage = useCallback(async (id: string, filter: VerseListStatusFilter) => {
    const requestVersion = ++requestVersionRef.current;
    fetchMoreLockRef.current = false;
    inFlightCursorRef.current = null;
    lastFailedCursorRef.current = null;
    suspendAutoLoadRef.current = false;
    hasUserScrolledRef.current = false;
    userScrollArmedRef.current = false;
    scrollBaselineRef.current = 0;
    scrollInteractionTickRef.current = 0;
    isVirtuosoAtBottomRef.current = false;
    lastBottomAutoRequestKeyRef.current = null;
    lastBottomAutoScrollTickRef.current = -1;
    lastVisibleRangeRef.current = null;
    currentRenderedListLengthRef.current = 0;
    setIsFetchingVerses(true);
    setHasFetchedVersesOnce(false);
    setIsFetchingMoreVerses(false);
    setLoadMoreError(null);
    setHasMoreVerses(false);
    setNextCursorId(null);
    setTotalCount(0);
    setVerses([]);

    try {
      const page = await requestVersesPage(id, filter, null);
      if (requestVersionRef.current !== requestVersion) return;
      setVerses(page.items);
      setHasMoreVerses(page.hasMore);
      setNextCursorId(page.nextCursorId);
      setTotalCount(page.totalCount);
    } catch (err) {
      if (requestVersionRef.current !== requestVersion) return;
      console.error('Не удалось получить стихи:', err);
      setVerses([]);
      setHasMoreVerses(false);
      setNextCursorId(null);
      setTotalCount(0);
    } finally {
      if (requestVersionRef.current !== requestVersion) return;
      setIsFetchingVerses(false);
      setHasFetchedVersesOnce(true);
    }
  }, [requestVersesPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextParent = resolveScrollParent();
    setCustomScrollParent((prev) => (prev === nextParent ? prev : nextParent));
  }, [resolveScrollParent, hasFetchedVersesOnce, statusFilter, verses.length]);

  const fetchNextPage = useCallback(async (
    options?: { source?: 'auto' | 'manual' | 'reopen' | 'gallery' }
  ) => {
    const source = options?.source ?? 'auto';
    if (!telegramId) return false;
    if (source === 'auto' && suspendAutoLoadRef.current) return false;
    if (source === 'auto' && !hasUserScrolledRef.current) return false;
    if (source === 'auto' && loadMoreError) return false;
    if (isFetchingVerses || isFetchingMoreVerses || fetchMoreLockRef.current) return false;
    if (!hasMoreVerses) return false;

    const requestVersion = requestVersionRef.current;
    const cursor = nextCursorId;
    const requestKey = `${telegramId}:${statusFilter}:${cursor ?? 'first'}`;
    if (source === 'auto' && lastFailedCursorRef.current === requestKey) return false;
    if (inFlightCursorRef.current === requestKey) return false;
    fetchMoreLockRef.current = true;
    inFlightCursorRef.current = requestKey;
    setIsFetchingMoreVerses(true);
    if (source !== 'auto') {
      setLoadMoreError(null);
      lastFailedCursorRef.current = null;
    }

    try {
      const page = await requestVersesPage(telegramId, statusFilter, cursor);
      if (requestVersionRef.current !== requestVersion) return false;

      let didAppend = false;
      setVerses((prev) => {
        const merged = mergeUniqueVerses(prev, page.items);
        didAppend = merged.length > prev.length;
        return merged;
      });

      const repeatedCursor = cursor !== null && page.nextCursorId === cursor;
      const stalledPagination = page.hasMore && (page.items.length === 0 || repeatedCursor || !didAppend);

      if (stalledPagination) {
        console.warn('Остановлена пагинация: повтор страницы или курсора', {
          cursor,
          nextCursorId: page.nextCursorId,
          pageItems: page.items.length,
          didAppend,
        });
        setHasMoreVerses(false);
        setNextCursorId(null);
        lastFailedCursorRef.current = null;
      } else {
        setHasMoreVerses(page.hasMore);
        setNextCursorId(page.nextCursorId);
        lastFailedCursorRef.current = null;
      }
      setTotalCount(page.totalCount);
      return didAppend;
    } catch (err) {
      if (requestVersionRef.current !== requestVersion) return false;
      console.error('Не удалось подгрузить ещё стихи:', err);
      lastFailedCursorRef.current = requestKey;
      setLoadMoreError('Не удалось загрузить ещё стихи');
      return false;
    } finally {
      fetchMoreLockRef.current = false;
      if (inFlightCursorRef.current === requestKey) {
        inFlightCursorRef.current = null;
      }
      if (requestVersionRef.current !== requestVersion) return false;
      setIsFetchingMoreVerses(false);
    }
  }, [
    telegramId,
    loadMoreError,
    isFetchingVerses,
    isFetchingMoreVerses,
    hasMoreVerses,
    nextCursorId,
    requestVersesPage,
    statusFilter,
    mergeUniqueVerses,
  ]);

  const tryAutoLoadFromVirtuosoSignals = useCallback((reason: string) => {
    const cursorLabel = nextCursorId ?? 'first';
    const visibleRange = lastVisibleRangeRef.current;
    const listLength = currentRenderedListLengthRef.current;
    const rangeHitsListEnd = listLength > 0 && !!visibleRange && visibleRange.endIndex >= listLength - 1;
    const requestKey = telegramId ? `${telegramId}:${statusFilter}:${nextCursorId ?? 'first'}` : null;

    debugInfiniteScroll('auto-eval', {
      reason,
      cursor: cursorLabel,
      isVirtuosoAtBottom: isVirtuosoAtBottomRef.current,
      listLength,
      visibleRange,
      rangeHitsListEnd,
      hasUserScrolled: hasUserScrolledRef.current,
      tick: scrollInteractionTickRef.current,
      hasMoreVerses: hasMoreVersesRef.current,
      loadingLocked: fetchMoreLockRef.current,
      inFlight: inFlightCursorRef.current,
      requestKey,
    });

    if (!hasUserScrolledRef.current) {
      debugInfiniteScroll('auto-skip:no-user-scroll', { cursor: cursorLabel, reason });
      return;
    }
    if (!isVirtuosoAtBottomRef.current) {
      debugInfiniteScroll('auto-skip:not-at-bottom', { cursor: cursorLabel, reason });
      return;
    }
    if (!rangeHitsListEnd) {
      debugInfiniteScroll('auto-skip:range-not-end', { cursor: cursorLabel, reason, listLength, visibleRange });
      return;
    }
    if (suspendAutoLoadRef.current) {
      debugInfiniteScroll('auto-skip:suspended', { cursor: cursorLabel, reason });
      return;
    }
    if (!hasMoreVersesRef.current) {
      debugInfiniteScroll('auto-skip:no-more', { cursor: cursorLabel, reason });
      return;
    }
    if (loadMoreErrorRef.current) {
      debugInfiniteScroll('auto-skip:error', { cursor: cursorLabel, reason, error: loadMoreErrorRef.current });
      return;
    }
    if (!requestKey) {
      debugInfiniteScroll('auto-skip:no-request-key', { cursor: cursorLabel, reason });
      return;
    }
    if (fetchMoreLockRef.current) {
      debugInfiniteScroll('auto-skip:locked', { cursor: cursorLabel, reason, requestKey });
      return;
    }
    if (inFlightCursorRef.current === requestKey) {
      debugInfiniteScroll('auto-skip:in-flight-same-cursor', { reason, requestKey });
      return;
    }
    if (lastFailedCursorRef.current === requestKey) {
      debugInfiniteScroll('auto-skip:last-failed-cursor', { reason, requestKey });
      return;
    }

    const currentScrollTick = scrollInteractionTickRef.current;
    if (currentScrollTick <= 0) {
      debugInfiniteScroll('auto-skip:no-scroll-tick', { cursor: cursorLabel, reason, currentScrollTick });
      return;
    }
    if (lastBottomAutoScrollTickRef.current === currentScrollTick) {
      debugInfiniteScroll('auto-skip:same-scroll-tick', {
        reason,
        currentScrollTick,
        lastBottomAutoScrollTick: lastBottomAutoScrollTickRef.current,
        requestKey,
      });
      return;
    }
    if (lastBottomAutoRequestKeyRef.current === requestKey) {
      debugInfiniteScroll('auto-skip:same-request-key', {
        reason,
        requestKey,
        currentScrollTick,
      });
      return;
    }

    lastBottomAutoRequestKeyRef.current = requestKey;
    lastBottomAutoScrollTickRef.current = currentScrollTick;
    debugInfiniteScroll('auto-trigger', {
      reason,
      requestKey,
      currentScrollTick,
      listLength,
      visibleRangeEnd: visibleRange?.endIndex ?? null,
    });
    void fetchNextPage({ source: 'auto' }).then((didLoad) => {
      debugInfiniteScroll('auto-result', { requestKey, didLoad, reason });
    });
  }, [debugInfiniteScroll, fetchNextPage, nextCursorId, statusFilter, telegramId]);

  useEffect(() => {
    if (!hasFetchedVersesOnce) return;
    if (typeof window === 'undefined') return;

    const scrollTarget = (customScrollParent ?? window) as Window | HTMLElement;
    scrollBaselineRef.current = getCurrentScrollTop();
    userScrollArmedRef.current = true;

    const onScroll = () => {
      scrollInteractionTickRef.current += 1;
      const currentTop = getCurrentScrollTop();
      if (!userScrollArmedRef.current) {
        scrollBaselineRef.current = currentTop;
        userScrollArmedRef.current = true;
      }
      if (!hasUserScrolledRef.current && currentTop - scrollBaselineRef.current > SCROLL_ACTIVATION_DELTA_PX) {
        hasUserScrolledRef.current = true;
        debugInfiniteScroll('user-scroll-armed', {
          delta: currentTop - scrollBaselineRef.current,
          threshold: SCROLL_ACTIVATION_DELTA_PX,
          customScrollParent: Boolean(customScrollParent),
        });
      }
    };

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
    };
  }, [
    customScrollParent,
    getCurrentScrollTop,
    hasFetchedVersesOnce,
    debugInfiniteScroll,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onViewportChange = () => {
      const nextParent = resolveScrollParent();
      setCustomScrollParent((prev) => (prev === nextParent ? prev : nextParent));
    };

    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('orientationchange', onViewportChange);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }, [resolveScrollParent]);

  const ensureVerseLoadedForReopen = useCallback(async (targetVerseId: string) => {
    if (!targetVerseId) return false;
    if (!telegramId) return false;

    const hasTarget = () =>
      versesRef.current.some(
        (v) => String(v.id) === String(targetVerseId) || v.externalVerseId === targetVerseId
      );

    if (hasTarget()) return true;

    suspendAutoLoadRef.current = true;
    try {
      let safety = 0;
      while (safety < 100) {
        if (hasTarget()) return true;
        if (!hasMoreVersesRef.current) return false;
        if (loadMoreErrorRef.current) return false;
        const didLoad = await fetchNextPage({ source: 'reopen' });
        if (!didLoad && !hasMoreVersesRef.current) return false;
        if (!didLoad && loadMoreErrorRef.current) return false;
        if (!didLoad) return hasTarget();
        safety += 1;
      }
      return hasTarget();
    } finally {
      suspendAutoLoadRef.current = false;
    }
  }, [fetchNextPage, telegramId]);

  useEffect(() => {
    const id = resolveTelegramId();
    if (!id) {
      setVerses([]);
      setHasMoreVerses(false);
      setNextCursorId(null);
      setTotalCount(0);
      return;
    }
    setTelegramId(id);
    localStorage.setItem('telegramId', id);
  }, []);

  useEffect(() => {
    if (!telegramId) return;
    void resetAndFetchFirstPage(telegramId, statusFilter);
  }, [telegramId, statusFilter, resetAndFetchFirstPage]);

  useEffect(() => {
    if (!reopenGalleryStatusFilter) return;
    if (statusFilter === reopenGalleryStatusFilter) return;
    setStatusFilter(reopenGalleryStatusFilter);
  }, [reopenGalleryStatusFilter, statusFilter]);

  useEffect(() => {
    if (!reopenGalleryVerseId) return;
    if (reopenGalleryStatusFilter && statusFilter !== reopenGalleryStatusFilter) return;
    if (!hasFetchedVersesOnce) return;
    if (isFetchingVerses) return;

    const index = verses.findIndex(
      (v) => String(v.id) === String(reopenGalleryVerseId) || v.externalVerseId === reopenGalleryVerseId
    );

    if (index === -1) {
      if (hasMoreVerses && !isFetchingMoreVerses) {
        void ensureVerseLoadedForReopen(String(reopenGalleryVerseId));
        return;
      }
      // Verse may have moved out of the restored filter (e.g. NEW -> LEARNING).
      onReopenGalleryHandled?.();
      return;
    }

    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setGalleryIndex(index);
        onReopenGalleryHandled?.();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [
    reopenGalleryVerseId,
    reopenGalleryStatusFilter,
    statusFilter,
    verses,
    isFetchingVerses,
    isFetchingMoreVerses,
    hasMoreVerses,
    hasFetchedVersesOnce,
    ensureVerseLoadedForReopen,
    onReopenGalleryHandled,
  ]);

  const getStatusSuccessMessage = (prevStatus: VerseStatus, nextStatus: VerseStatus) => {
    if (prevStatus === VerseStatus.NEW && nextStatus === VerseStatus.LEARNING) return 'Добавлено в изучение';
    if (prevStatus === VerseStatus.STOPPED && nextStatus === VerseStatus.LEARNING) return 'Возобновлено';
    if (prevStatus === VerseStatus.LEARNING && nextStatus === VerseStatus.STOPPED) return 'Пауза включена';
    return 'Статус обновлён';
  };

  const patchVerseStatusOnServer = useCallback(async (verse: Verse, status: VerseStatus) => {
    if (!telegramId) throw new Error('No telegramId');
    await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, { status });
  }, [telegramId]);

  /* ── status change (gallery/low-level) ── */
  const handleStatusChange = async (verse: Verse, status: VerseStatus) => {
    await patchVerseStatusOnServer(verse, status);
    let removedFromCurrentFilter = false;
    setVerses((prev) =>
      prev
        .map((v) => {
          if (!isSameVerse(v, verse)) return v;
          return { ...v, status };
        })
        .filter((v) => {
          const keep = matchesListFilter(v, statusFilter);
          if (!keep && isSameVerse(v, verse)) removedFromCurrentFilter = true;
          return keep;
        })
    );
    if (removedFromCurrentFilter) {
      setTotalCount((prev) => Math.max(0, prev - 1));
    }
  };

  /* ── status change (list actions, optimistic + rollback) ── */
  const updateVerseStatus = useCallback(async (verse: Verse, nextStatus: VerseStatus) => {
    if (!telegramId) {
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
      return;
    }

    const prevStatus = verse.status;
    if (prevStatus === nextStatus) return;

    markVersePending(verse, true);
    let removedFromCurrentFilter = false;
    setVerses((prev) => {
      const next = prev
        .map((v) => (isSameVerse(v, verse) ? { ...v, status: nextStatus } : v))
        .filter((v) => {
          const keep = matchesListFilter(v, statusFilter);
          if (!keep && isSameVerse(v, verse)) removedFromCurrentFilter = true;
          return keep;
        });
      return next;
    });
    if (removedFromCurrentFilter) {
      setTotalCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await patchVerseStatusOnServer(verse, nextStatus);
      haptic('success');
      pushToast(getStatusSuccessMessage(prevStatus, nextStatus), 'success');
      setAnnouncement(`${verse.reference}: ${getStatusSuccessMessage(prevStatus, nextStatus)}`);
    } catch (err) {
      console.error('Не удалось изменить статус стиха:', err);
      if (telegramId) {
        void resetAndFetchFirstPage(telegramId, statusFilter);
      }
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
    } finally {
      markVersePending(verse, false);
    }
  }, [telegramId, pushToast, markVersePending, isSameVerse, patchVerseStatusOnServer, matchesListFilter, statusFilter, resetAndFetchFirstPage]);

  /* ── delete ── */
  const handleDeleteVerse = async (verse: Verse) => {
    if (!telegramId) return;
    await UserVersesService.deleteApiUsersVerses(telegramId, verse.externalVerseId);
    setVerses((prev) => {
      const hadVerse = prev.some((v) => isSameVerse(v, verse));
      const updated = prev.filter((v) => !isSameVerse(v, verse));
      if (hadVerse) {
        setTotalCount((count) => Math.max(0, count - 1));
      }
      setGalleryIndex((cur) => {
        if (updated.length === 0 || cur === null) return null;
        return cur >= updated.length ? updated.length - 1 : cur;
      });
      return updated;
    });
  };

  const confirmDeleteVerse = useCallback((verse: Verse) => {
    haptic('warning');
    setDeleteTargetVerse(verse);
  }, []);

  const handleConfirmDeleteVerse = useCallback(async () => {
    if (!deleteTargetVerse) return;
    if (!telegramId) {
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
      return;
    }

    setDeleteSubmitting(true);
    markVersePending(deleteTargetVerse, true);

    try {
      await handleDeleteVerse(deleteTargetVerse);
      haptic('success');
      pushToast('Удалено', 'success');
      setAnnouncement(`${deleteTargetVerse.reference}: Удалено`);
      setDeleteTargetVerse(null);
    } catch (err) {
      console.error('Не удалось удалить стих:', err);
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
    } finally {
      markVersePending(deleteTargetVerse, false);
      setDeleteSubmitting(false);
    }
  }, [deleteTargetVerse, telegramId, pushToast, markVersePending, handleDeleteVerse]);

  /* ── filters ── */
  const filteredVerses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return verses.filter((v) => {
      const matchStatus = matchesListFilter(v, statusFilter);
      const matchSearch = !q || v.reference.toLowerCase().includes(q) || v.text.toLowerCase().includes(q);
      const matchTestament = testamentFilter === 'all' || (v as any).testament === testamentFilter;
      const matchMastery =
        masteryFilter === 'all' ||
        (masteryFilter === 'low' && (v as any).masteryLevel < 40) ||
        (masteryFilter === 'medium' && (v as any).masteryLevel >= 40 && (v as any).masteryLevel < 75) ||
        (masteryFilter === 'high' && (v as any).masteryLevel >= 75);
      return matchStatus && matchSearch && matchTestament && matchMastery;
    });
  }, [verses, statusFilter, matchesListFilter, searchQuery, testamentFilter, masteryFilter]);

  const reviewVerses = filteredVerses.filter((v) => isReviewVerse(v));
  const learningVerses = filteredVerses.filter(
    (v) => v.status === VerseStatus.LEARNING && !isReviewVerse(v)
  );
  const stoppedVerses = filteredVerses.filter((v) => v.status === VerseStatus.STOPPED);
  const newVerses = filteredVerses.filter((v) => v.status === VerseStatus.NEW);

  const filterOptions: Array<{ key: VerseListStatusFilter; label: string }> = [
    { key: 'all', label: 'Все' },
    { key: 'learning', label: 'Изучаю' },
    { key: 'review', label: 'Повторяю' },
    { key: 'stopped', label: 'На паузе' },
    { key: 'new', label: 'Новые' },
  ];

  const shouldReduceMotion = useReducedMotion();
  const isListLoading = isFetchingVerses && !hasFetchedVersesOnce && verses.length === 0;
  const currentFilterLabel = filterOptions.find((option) => option.key === statusFilter)?.label ?? 'Все';
  const currentFilterTheme = FILTER_VISUAL_THEME[statusFilter];
  const totalVisible = filteredVerses.length;
  const dueNowCount = learningVerses.filter((verse) => {
    if (!verse.nextReviewAt) return true;
    const date = new Date(verse.nextReviewAt);
    return Number.isNaN(date.getTime()) || date.getTime() <= Date.now();
  }).length;

  const pageVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.07,
        delayChildren: shouldReduceMotion ? 0 : 0.03,
      },
    },
  };

  const sectionVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 14,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.26,
        ease: 'easeOut' as const,
      },
    },
  };

  const openVerseInGallery = useCallback((verse: Verse) => {
    const index = verses.findIndex((v) => isSameVerse(v, verse));
    if (index === -1) return;
    haptic('light');
    setGalleryIndex(index);
  }, [verses, isSameVerse]);

  const renderVerseRow = useCallback((verse: Verse) => {
    return (
      <SwipeableVerseCard
        verse={verse}
        onOpen={() => openVerseInGallery(verse)}
        onAddToLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
        onPauseLearning={(v) => void updateVerseStatus(v, VerseStatus.STOPPED)}
        onResumeLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
        onRequestDelete={confirmDeleteVerse}
        isPending={pendingVerseKeys.has(getVerseKey(verse))}
      />
    );
  }, [confirmDeleteVerse, getVerseKey, openVerseInGallery, pendingVerseKeys, updateVerseStatus]);

  const handleVirtuosoRangeChanged = useCallback((range: ListRange, listLength: number) => {
    lastVisibleRangeRef.current = range;
    currentRenderedListLengthRef.current = listLength;
    debugInfiniteScroll('virtuoso-rangeChanged', {
      range,
      listLength,
      rangeHitsListEnd: listLength > 0 && range.endIndex >= listLength - 1,
    });
    tryAutoLoadFromVirtuosoSignals('virtuoso-range');
  }, [debugInfiniteScroll, tryAutoLoadFromVirtuosoSignals]);

  const handleBottomStateChange = useCallback((isBottom: boolean) => {
    const prevIsBottom = isVirtuosoAtBottomRef.current;
    isVirtuosoAtBottomRef.current = isBottom;

    debugInfiniteScroll('virtuoso-atBottomStateChange', {
      isBottom,
      prevIsBottom,
      hasUserScrolled: hasUserScrolledRef.current,
      threshold: AUTO_LOAD_BOTTOM_THRESHOLD_PX,
      hasMoreVerses,
      isFetchingMoreVerses,
      nextCursorId,
    });

    if (!isBottom) {
      lastBottomAutoRequestKeyRef.current = null;
      return;
    }

    tryAutoLoadFromVirtuosoSignals('virtuoso-bottom');
  }, [
    debugInfiniteScroll,
    hasMoreVerses,
    isFetchingMoreVerses,
    nextCursorId,
    tryAutoLoadFromVirtuosoSignals,
  ]);

  const renderVirtualizedVerseList = useCallback((
    items: Array<Verse>,
    options?: { padded?: boolean }
  ) => {
    if (items.length === 0) return null;

    currentRenderedListLengthRef.current = items.length;
    const padded = options?.padded ?? false;
    const scrollModeKey = customScrollParent ? 'container' : 'window';

    return (
      <Virtuoso<Verse>
        key={`virtuoso-${scrollModeKey}-${statusFilter}`}
        data={items}
        customScrollParent={customScrollParent ?? undefined}
        useWindowScroll={!customScrollParent}
        increaseViewportBy={240}
        overscan={180}
        atBottomThreshold={AUTO_LOAD_BOTTOM_THRESHOLD_PX}
        computeItemKey={(_, verse) => getVerseKey(verse)}
        rangeChanged={(range) => handleVirtuosoRangeChanged(range, items.length)}
        atBottomStateChange={handleBottomStateChange}
        itemContent={(index, verse) => (
          <div className={`${padded ? '' : ''} ${index < items.length - 1 ? 'pb-3' : ''}`}>
            {renderVerseRow(verse)}
          </div>
        )}
      />
    );
  }, [customScrollParent, getVerseKey, handleBottomStateChange, handleVirtuosoRangeChanged, renderVerseRow, statusFilter]);

  const renderVirtualizedVerseSection = (
    items: Array<Verse>,
    config: {
      headingId: string;
      title: string;
      subtitle: string;
      dotClassName: string;
      borderClassName: string;
      tintClassName: string;
    }
  ) => {
    if (items.length === 0) return null;

    return (
      <motion.section
        key={config.headingId}
        className="space-y-3"
        aria-labelledby={config.headingId}
        initial="hidden"
        animate="show"
        variants={sectionVariants}
      >
        <Card className={`gap-0 overflow-hidden border-border/70 rounded-3xl ${config.borderClassName}`}>
          <div className={`border-b border-border/70 p-4 sm:p-5 ${config.tintClassName}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`h-2.5 w-2.5 rounded-full ${config.dotClassName}`} />
                  <span id={config.headingId} className="font-medium">{config.title}</span>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                    {items.length} шт.
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{config.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {renderVirtualizedVerseList(items, { padded: true })}
          </div>
        </Card>
      </motion.section>
    );
  };

  const activeFilteredSection = useMemo(() => {
    if (statusFilter === 'all') return null;
    if (statusFilter === 'learning') {
      return {
        items: learningVerses,
        config: {
          headingId: 'learning-verses-heading',
          title: 'Изучение',
          subtitle: dueNowCount > 0 ? `${dueNowCount} стих(а) ждут повторения` : 'Активные стихи в изучении',
          dotClassName: 'bg-emerald-500',
          borderClassName: 'bg-gradient-to-b from-emerald-500/5 to-background',
          tintClassName: 'bg-emerald-500/5',
        },
      };
    }
    if (statusFilter === 'review') {
      return {
        items: reviewVerses,
        config: {
          headingId: 'review-verses-heading',
          title: 'Повторение',
          subtitle: `Стихи в статусе LEARNING с уровнем mastery > ${TRAINING_STAGE_MASTERY_MAX}`,
          dotClassName: 'bg-violet-500',
          borderClassName: 'bg-gradient-to-b from-violet-500/5 to-background',
          tintClassName: 'bg-violet-500/5',
        },
      };
    }
    if (statusFilter === 'stopped') {
      return {
        items: stoppedVerses,
        config: {
          headingId: 'stopped-verses-heading',
          title: 'На паузе',
          subtitle: 'Можно возобновить в один тап с карточки',
          dotClassName: 'bg-rose-500',
          borderClassName: 'bg-gradient-to-b from-rose-500/5 to-background',
          tintClassName: 'bg-rose-500/5',
        },
      };
    }
    return {
      items: newVerses,
      config: {
        headingId: 'new-verses-heading',
        title: 'Новые',
        subtitle: 'Добавленные стихи, которые ещё не переведены в изучение',
        dotClassName: 'bg-sky-500',
        borderClassName: 'bg-gradient-to-b from-sky-500/5 to-background',
        tintClassName: 'bg-sky-500/5',
      },
    };
  }, [statusFilter, learningVerses, dueNowCount, reviewVerses, stoppedVerses, newVerses]);

  return (
    <motion.div
      className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto"
      initial="hidden"
      animate="show"
      variants={pageVariants}
    >
      {/* aria-live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <motion.div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" variants={sectionVariants}>
        <div>
          <h1 className="mb-1">Мои стихи</h1>
          <p className="text-sm text-muted-foreground">
            Кликните на карточку, чтобы перейти в галерею и начать изучение.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* {isFetchingVerses && (
            <Badge variant="outline" className="rounded-full px-3 py-1 animate-pulse">
              Обновляю...
            </Badge>
          )} */}
          <Button
            onClick={() => { haptic('medium'); onAddVerse(); }}
            className="shrink-0 w-full sm:w-auto rounded-3xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить стих
          </Button>
        </div>
      </motion.div>

      <motion.div className="mb-6" variants={sectionVariants}>
        <Card className="border-border/70 rounded-3xl p-4 sm:p-5 gap-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-medium">Фильтр по статусу</div>
              <p className="text-xs text-muted-foreground mt-1">
                Загружено {totalVisible} из {totalCount} {totalCount === 1 ? 'стиха' : totalCount < 5 ? 'стихов' : 'стихов'}.
              </p>
            </div>
            <Badge
              variant="outline"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${currentFilterTheme.currentBadgeClassName}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentFilterTheme.dotClassName}`} />
              Текущий: {currentFilterLabel}
            </Badge>
          </div>

          <div
            role="tablist"
            aria-label="Фильтр по статусу стихов"
            className="flex flex-wrap gap-2"
          >
            {filterOptions.map((option) => (
              (() => {
                const isActive = statusFilter === option.key;
                const optionTheme = FILTER_VISUAL_THEME[option.key];

                return (
                  <Button
                    key={option.key}
                    role="tab"
                    aria-selected={isActive}
                    size="sm"
                    variant="ghost"
                    className={`
                      rounded-full border px-3.5 backdrop-blur-sm transition-colors
                      inline-flex items-center gap-2
                      ${isActive
                        ? optionTheme.activeTabClassName
                        : 'border-border/60 bg-background/45 text-foreground/85 hover:bg-muted/50 hover:text-foreground'}
                    `}
                    onClick={() => {
                      if (isActive) return;
                      haptic('light');
                      setStatusFilter(option.key);
                      setAnnouncement(`Фильтр: ${option.label}`);
                    }}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? optionTheme.dotClassName : 'bg-muted-foreground/35'
                      }`}
                    />
                    {option.label}
                  </Button>
                );
              })()
            ))}
          </div>
        </Card>
      </motion.div>

      <div ref={listScrollAnchorRef} className="h-px w-full" aria-hidden="true" />

      {isListLoading ? (
        <motion.div className="space-y-4" initial="hidden" animate="show" variants={sectionVariants}>
          {[0, 1, 2].map((idx) => (
            <Card key={`skeleton-${idx}`} className="p-4 sm:p-5 border-border/70 rounded-3xl animate-pulse gap-3">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted/80" />
              <div className="h-3 w-3/4 rounded bg-muted/70" />
            </Card>
          ))}
        </motion.div>
      ) : filteredVerses.length === 0 ? (
        <motion.div initial="hidden" animate="show" variants={sectionVariants}>
          <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-background to-primary/5 p-8 text-center gap-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/80">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold">Список пока пуст</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Добавьте первый стих, и он появится здесь. Дальше сможете открыть его в галерее и начать тренировку.
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => { haptic('medium'); onAddVerse(); }}
                className="rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить первый стих
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : statusFilter === 'all' ? (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={sectionVariants}
        >
          {renderVirtualizedVerseList(filteredVerses)}
        </motion.div>
      ) : (
        activeFilteredSection
          ? renderVirtualizedVerseSection(activeFilteredSection.items, activeFilteredSection.config)
          : null
      )}

      {!isListLoading && (verses.length > 0 || hasMoreVerses || isFetchingMoreVerses || loadMoreError) && (
        <motion.div className="mt-6 space-y-3" initial="hidden" animate="show" variants={sectionVariants}>
          <div className="flex justify-center">
            {isFetchingMoreVerses ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Загружаю ещё стихи...
              </Badge>
            ) : loadMoreError ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  void fetchNextPage({ source: 'manual' });
                }}
              >
                Повторить загрузку
              </Button>
            ) : !hasMoreVerses && verses.length > 0 ? (
              <Badge variant="outline" className="rounded-full px-3 py-1 text-muted-foreground">
                Все стихи загружены
              </Badge>
            ) : null}
          </div>
        </motion.div>
      )}

      <ConfirmDeleteModal
        verse={deleteTargetVerse}
        open={deleteTargetVerse !== null}
        onOpenChange={(open) => {
          if (!open && !deleteSubmitting) setDeleteTargetVerse(null);
        }}
        onConfirm={handleConfirmDeleteVerse}
        isSubmitting={deleteSubmitting}
      />

      {/* Gallery overlay */}
      {galleryIndex !== null && verses[galleryIndex] && typeof document !== 'undefined' && createPortal(
        <VerseGallery
          verses={verses}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteVerse}
          previewTotalCount={totalCount}
          previewHasMore={hasMoreVerses}
          previewIsLoadingMore={isFetchingMoreVerses}
          onRequestMorePreviewVerses={() => fetchNextPage({ source: 'gallery' })}
        />,
        document.body
      )}
    </motion.div>
  );
}
