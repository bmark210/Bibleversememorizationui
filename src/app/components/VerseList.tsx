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
  Trash2,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'motion/react';
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
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { MasteryBadge } from './MasteryBadge';
import { VerseGallery } from './VerseGallery';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';

/* ===================== TYPES ===================== */

type VerseListStatusFilter = 'all' | 'learning' | 'review' | 'stopped' | 'new';

type SwipeCardProps = {
  verse: Verse;
  onOpen: () => void;
  onAddToLearning: (verse: Verse) => void;
  onPauseLearning: (verse: Verse) => void;
  onResumeLearning: (verse: Verse) => void;
  onRequestDelete: (verse: Verse) => void;
  isPending?: boolean;
};

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
          relative z-10 bg-card border border-border/70 rounded-2xl p-4 shadow-sm
          active:shadow-md transition-shadow cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold">{verse.reference}</h3>
              <Badge variant="secondary" className="text-[11px]">SYNOD</Badge>
              <MasteryBadge status={verse.status} masteryLevel={verse.masteryLevel ?? 0} />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{verse.text}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{Math.min(Math.round(verse.masteryLevel / TRAINING_STAGE_MASTERY_MAX * 100), 100)}%</span>
              <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    verse.status === VerseStatus.LEARNING ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(Math.round(verse.masteryLevel / TRAINING_STAGE_MASTERY_MAX * 100), 100)}%`
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
              <span>{verse.repetitions} повт.</span>
            </div>
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
  const [searchQuery] = useState('');
  const [testamentFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [masteryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [statusFilter, setStatusFilter] = useState<VerseListStatusFilter>(reopenGalleryStatusFilter ?? 'all');

  const [telegramId, setTelegramId] = useState<string | undefined>();
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isFetchingVerses, setIsFetchingVerses] = useState(false);
  const [hasFetchedVersesOnce, setHasFetchedVersesOnce] = useState(false);
  const [pendingVerseKeys, setPendingVerseKeys] = useState<Set<string>>(() => new Set());
  const [deleteTargetVerse, setDeleteTargetVerse] = useState<Verse | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  const sortByLoadedAtDesc = useCallback((list: Array<Verse>) => {
    return [...list].sort((a, b) => {
      const aTime = new Date((a as any).createdAt ?? 0).getTime();
      const bTime = new Date((b as any).createdAt ?? 0).getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return bTime - aTime; // newest first
    });
  }, []);

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

  const fetchVerses = useCallback(async (id: string, filter: VerseListStatusFilter) => {
    setIsFetchingVerses(true);
    setHasFetchedVersesOnce(false);
    try {
      const data = (await UserVersesService.getApiUsersVerses(
        id,
        undefined,
        'createdAt',
        'desc',
        filter
      )) as Array<Verse>;

      setVerses(sortByLoadedAtDesc(data));
    } catch (err) {
      console.error('Не удалось получить стихи:', err);
      setVerses([]);
    } finally {
      setIsFetchingVerses(false);
      setHasFetchedVersesOnce(true);
    }
  }, [sortByLoadedAtDesc]);

  useEffect(() => {
    const id = resolveTelegramId();
    if (!id) { setVerses([]); return; }
    setTelegramId(id);
    localStorage.setItem('telegramId', id);
  }, []);

  useEffect(() => {
    if (!telegramId) return;
    void fetchVerses(telegramId, statusFilter);
  }, [telegramId, statusFilter, fetchVerses]);

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
    hasFetchedVersesOnce,
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
    setVerses((prev) =>
      prev
        .map((v) => (isSameVerse(v, verse) ? { ...v, status } : v))
        .filter((v) => matchesListFilter(v, statusFilter))
    );
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
    setVerses((prev) => {
      const next = prev
        .map((v) => (isSameVerse(v, verse) ? { ...v, status: nextStatus } : v))
        .filter((v) => matchesListFilter(v, statusFilter));
      return next;
    });

    try {
      await patchVerseStatusOnServer(verse, nextStatus);
      haptic('success');
      pushToast(getStatusSuccessMessage(prevStatus, nextStatus), 'success');
      setAnnouncement(`${verse.reference}: ${getStatusSuccessMessage(prevStatus, nextStatus)}`);
    } catch (err) {
      console.error('Не удалось изменить статус стиха:', err);
      if (telegramId) {
        void fetchVerses(telegramId, statusFilter);
      }
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
    } finally {
      markVersePending(verse, false);
    }
  }, [telegramId, pushToast, markVersePending, isSameVerse, patchVerseStatusOnServer, matchesListFilter, statusFilter, fetchVerses]);

  /* ── delete ── */
  const handleDeleteVerse = async (verse: Verse) => {
    if (!telegramId) return;
    await UserVersesService.deleteApiUsersVerses(telegramId, verse.externalVerseId);
    setVerses((prev) => {
      const updated = prev.filter((v) => !isSameVerse(v, verse));
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
      const matchSearch = !q || v.reference.toLowerCase().includes(q) || v.text.toLowerCase().includes(q);
      const matchTestament = testamentFilter === 'all' || (v as any).testament === testamentFilter;
      const matchMastery =
        masteryFilter === 'all' ||
        (masteryFilter === 'low' && (v as any).masteryLevel < 40) ||
        (masteryFilter === 'medium' && (v as any).masteryLevel >= 40 && (v as any).masteryLevel < 75) ||
        (masteryFilter === 'high' && (v as any).masteryLevel >= 75);
      return matchSearch && matchTestament && matchMastery;
    });
  }, [verses, searchQuery, testamentFilter, masteryFilter]);

  const learningVerses = filteredVerses.filter((v) => v.status === VerseStatus.LEARNING);
  const stoppedVerses = filteredVerses.filter((v) => v.status === VerseStatus.STOPPED);
  const newVerses = filteredVerses.filter((v) => v.status === VerseStatus.NEW);

  const filterOptions: Array<{ key: VerseListStatusFilter; label: string }> = [
    { key: 'all', label: 'Все' },
    { key: 'learning', label: 'Изучаю' },
    { key: 'review', label: 'На повторение' },
    { key: 'stopped', label: 'На паузе' },
    { key: 'new', label: 'Новые' },
  ];

  const shouldReduceMotion = useReducedMotion();
  const isListLoading = isFetchingVerses && !hasFetchedVersesOnce && verses.length === 0;
  const currentFilterLabel = filterOptions.find((option) => option.key === statusFilter)?.label ?? 'Все';
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

  const gridVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: shouldReduceMotion ? 1 : 0,
      y: shouldReduceMotion ? 0 : 10,
      scale: shouldReduceMotion ? 1 : 0.99,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.22,
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

  const renderVerseSection = (
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

          <motion.div className="p-3 sm:p-4 space-y-3" variants={gridVariants}>
            <AnimatePresence initial={false}>
              {items.map((verse) => (
                <motion.div
                  key={getVerseKey(verse)}
                  layout
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
                >
                  <SwipeableVerseCard
                    verse={verse}
                    onOpen={() => openVerseInGallery(verse)}
                    onAddToLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onPauseLearning={(v) => void updateVerseStatus(v, VerseStatus.STOPPED)}
                    onResumeLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onRequestDelete={confirmDeleteVerse}
                    isPending={pendingVerseKeys.has(getVerseKey(verse))}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </Card>
      </motion.section>
    );
  };

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
                Сейчас показано {totalVisible} {totalVisible === 1 ? 'стих' : totalVisible < 5 ? 'стиха' : 'стихов'}.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Текущий: {currentFilterLabel}
            </Badge>
          </div>

          <div
            role="tablist"
            aria-label="Фильтр по статусу стихов"
            className="flex flex-wrap gap-2"
          >
            {filterOptions.map((option) => (
              <Button
                key={option.key}
                role="tab"
                aria-selected={statusFilter === option.key}
                size="sm"
                variant={statusFilter === option.key ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => {
                  if (statusFilter === option.key) return;
                  haptic('light');
                  setStatusFilter(option.key);
                  setAnnouncement(`Фильтр: ${option.label}`);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </Card>
      </motion.div>

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
      ) : (
        <motion.div className="space-y-6" initial="hidden" animate="show" variants={gridVariants}>
          {renderVerseSection(learningVerses, {
            headingId: 'learning-verses-heading',
            title: statusFilter === 'review' ? 'На повторение' : 'Изучаю',
            subtitle:
              statusFilter === 'review'
                ? `Стихи в статусе LEARNING с уровнем mastery > ${TRAINING_STAGE_MASTERY_MAX}`
                : (dueNowCount > 0 ? `${dueNowCount} стих(а) ждут повторения` : 'Активные стихи в изучении'),
            dotClassName: statusFilter === 'review' ? 'bg-violet-500' : 'bg-emerald-500',
            borderClassName: statusFilter === 'review'
              ? 'bg-gradient-to-b from-violet-500/5 to-background'
              : 'bg-gradient-to-b from-emerald-500/5 to-background',
            tintClassName: statusFilter === 'review' ? 'bg-violet-500/5' : 'bg-emerald-500/5',
          })}

          {renderVerseSection(stoppedVerses, {
            headingId: 'stopped-verses-heading',
            title: 'На паузе',
            subtitle: 'Можно возобновить в один тап с карточки',
            dotClassName: 'bg-amber-500',
            borderClassName: 'bg-gradient-to-b from-amber-500/5 to-background',
            tintClassName: 'bg-amber-500/5',
          })}

          {renderVerseSection(newVerses, {
            headingId: 'new-verses-heading',
            title: 'Новые',
            subtitle: 'Добавленные стихи, которые ещё не переведены в изучение',
            dotClassName: 'bg-sky-500',
            borderClassName: 'bg-gradient-to-b from-sky-500/5 to-background',
            tintClassName: 'bg-sky-500/5',
          })}
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
        />,
        document.body
      )}
    </motion.div>
  );
}
