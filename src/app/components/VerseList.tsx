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
  Pause,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
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

/* ===================== TYPES ===================== */

type VerseListStatusFilter = 'all' | 'learning' | 'stopped' | 'new';

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
              <MasteryBadge status={verse.status} />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{verse.text}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{verse.masteryLevel}%</span>
              <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    verse.status === VerseStatus.LEARNING ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${verse.masteryLevel}%` }}
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
  onStartTraining: (
    verseId: string,
    options?: { returnToGallery?: boolean; returnToGalleryFilter?: VerseListStatusFilter }
  ) => void | Promise<void>;
  reopenGalleryVerseId?: string | null;
  reopenGalleryStatusFilter?: VerseListStatusFilter | null;
  onReopenGalleryHandled?: () => void;
}

export function VerseList({
  onAddVerse,
  onStartTraining,
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

  const matchesStatusFilter = useCallback((status: VerseStatus, filter: VerseListStatusFilter) => {
    if (filter === 'all') return true;
    if (filter === 'learning') return status === VerseStatus.LEARNING;
    if (filter === 'stopped') return status === VerseStatus.STOPPED;
    return status === VerseStatus.NEW;
  }, []);

  const mapFilterToApiStatus = useCallback((filter: VerseListStatusFilter): VerseStatus | undefined => {
    if (filter === 'learning') return VerseStatus.LEARNING;
    if (filter === 'stopped') return VerseStatus.STOPPED;
    if (filter === 'new') return VerseStatus.NEW;
    return undefined;
  }, []);

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
      const requestedStatus = mapFilterToApiStatus(filter);
      const data = await UserVersesService.getApiUsersVerses(id, {
        status: requestedStatus,
        orderBy: 'createdAt',
        order: 'desc',
      });

      // Fallbacks in case backend ignores query params in current deployment.
      const casted = data as Array<Verse>;
      const statusFiltered = requestedStatus
        ? casted.filter((v) => v.status === requestedStatus)
        : casted;
      setVerses(sortByLoadedAtDesc(statusFiltered));
    } catch (err) {
      console.error('Не удалось получить стихи:', err);
      setVerses([]);
    } finally {
      setIsFetchingVerses(false);
      setHasFetchedVersesOnce(true);
    }
  }, [mapFilterToApiStatus, sortByLoadedAtDesc]);

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
        .filter((v) => matchesStatusFilter(v.status, statusFilter))
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
        .filter((v) => matchesStatusFilter(v.status, statusFilter));
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
  }, [telegramId, pushToast, markVersePending, isSameVerse, patchVerseStatusOnServer, matchesStatusFilter, statusFilter, fetchVerses]);

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
    { key: 'stopped', label: 'На паузе' },
    { key: 'new', label: 'Новые' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* aria-live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Мои стихи</h1>
          <p className="text-muted-foreground text-sm">
            Откройте карточку или используйте кнопки действий: добавить, пауза, возобновить, удалить.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => { haptic('medium'); onAddVerse(); }}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
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
      </div>

      {/* Verse List */}
      {filteredVerses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Стихов пока нет. Добавьте первый!</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {learningVerses.length > 0 && (
            <section className="space-y-3" aria-labelledby="learning-verses-heading">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span id="learning-verses-heading">Изучаю</span>
                </div>
                <span className="text-xs text-muted-foreground">{learningVerses.length} шт.</span>
              </div>
              <AnimatePresence initial={false}>
                {learningVerses.map((verse) => (
                  <SwipeableVerseCard
                    key={getVerseKey(verse)}
                    verse={verse}
                    onOpen={() => {
                      const index = verses.findIndex((v) => isSameVerse(v, verse));
                      if (index !== -1) { haptic('light'); setGalleryIndex(index); }
                    }}
                    onAddToLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onPauseLearning={(v) => void updateVerseStatus(v, VerseStatus.STOPPED)}
                    onResumeLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onRequestDelete={confirmDeleteVerse}
                    isPending={pendingVerseKeys.has(getVerseKey(verse))}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}

          {stoppedVerses.length > 0 && (
            <section className="space-y-3" aria-labelledby="stopped-verses-heading">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span id="stopped-verses-heading">На паузе</span>
                </div>
                <span className="text-xs text-muted-foreground">{stoppedVerses.length} шт.</span>
              </div>
              <AnimatePresence initial={false}>
                {stoppedVerses.map((verse) => (
                  <SwipeableVerseCard
                    key={getVerseKey(verse)}
                    verse={verse}
                    onOpen={() => {
                      const index = verses.findIndex((v) => isSameVerse(v, verse));
                      if (index !== -1) { haptic('light'); setGalleryIndex(index); }
                    }}
                    onAddToLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onPauseLearning={(v) => void updateVerseStatus(v, VerseStatus.STOPPED)}
                    onResumeLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onRequestDelete={confirmDeleteVerse}
                    isPending={pendingVerseKeys.has(getVerseKey(verse))}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}

          {newVerses.length > 0 && (
            <section className="space-y-3" aria-labelledby="new-verses-heading">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span id="new-verses-heading">Новые</span>
                </div>
                <span className="text-xs text-muted-foreground">{newVerses.length} шт.</span>
              </div>
              <AnimatePresence initial={false}>
                {newVerses.map((verse) => (
                  <SwipeableVerseCard
                    key={getVerseKey(verse)}
                    verse={verse}
                    onOpen={() => {
                      const index = verses.findIndex((v) => isSameVerse(v, verse));
                      if (index !== -1) { haptic('light'); setGalleryIndex(index); }
                    }}
                    onAddToLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onPauseLearning={(v) => void updateVerseStatus(v, VerseStatus.STOPPED)}
                    onResumeLearning={(v) => void updateVerseStatus(v, VerseStatus.LEARNING)}
                    onRequestDelete={confirmDeleteVerse}
                    isPending={pendingVerseKeys.has(getVerseKey(verse))}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}
        </div>
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
          onStartTraining={(verse) =>
            onStartTraining(String(verse.externalVerseId ?? verse.id), {
              returnToGallery: true,
              returnToGalleryFilter: statusFilter,
            })
          }
        />,
        document.body
      )}
    </div>
  );
}
