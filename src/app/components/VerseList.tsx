'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MoveLeft,
  MoveRight,
  Pause,
  Play,
  Plus,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { UserVersesService } from '@/api/services/UserVersesService';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { MasteryBadge } from './MasteryBadge';
import { VerseGallery } from './VerseGallery';

/* ===================== CONSTANTS ===================== */

const SWIPE_TRIGGER = 80;

/* ===================== TYPES ===================== */

type ColumnType = 'backlog' | 'learning';

type ToastEntry = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

type SwipeCardProps = {
  verse: Verse;
  onOpen: () => void;
  onSwipeLeft?: () => Promise<void> | void;
  onSwipeRight?: () => Promise<void> | void;
  leftLabel?: string;
  rightLabel?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accent?: 'green' | 'amber';
  onToast: (message: string, type: ToastEntry['type']) => void;
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

/* ===================== TOAST COMPONENT ===================== */

function ToastLayer({ toasts }: { toasts: ToastEntry[] }) {
  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 28, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 } as const}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold text-white backdrop-blur-sm ${
              t.type === 'success'
                ? 'bg-emerald-500/95'
                : t.type === 'error'
                ? 'bg-destructive/95'
                : 'bg-primary/95'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {t.type === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ===================== SWIPEABLE CARD ===================== */

const SwipeableVerseCard = ({
  verse,
  onOpen,
  onSwipeLeft,
  onSwipeRight,
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  accent = 'green',
  onToast,
}: SwipeCardProps) => {
  const reducedMotion = useReducedMotion();

  const dragX = useMotionValue(0);
  const springX = useSpring(dragX, {
    stiffness: reducedMotion ? 1000 : 500,
    damping: reducedMotion ? 60 : 45,
  });

  /* ── background tint ── */
  const bgColor = useTransform(
    dragX,
    [-SWIPE_TRIGGER * 1.4, 0, SWIPE_TRIGGER * 1.4],
    [
      'rgba(239,68,68,0.10)',
      'transparent',
      accent === 'green' ? 'rgba(16,185,129,0.10)' : 'rgba(251,191,36,0.14)',
    ]
  );

  /* ── hint overlays opacity ── */
  const leftHintOpacity = useTransform(dragX, [-SWIPE_TRIGGER, -24, 0], [1, 0.5, 0]);
  const rightHintOpacity = useTransform(dragX, [0, 24, SWIPE_TRIGGER], [0, 0.5, 1]);

  /* ── drag strength bar (width 0→100%) ── */
  const leftStrength = useTransform(dragX, [-SWIPE_TRIGGER, 0], ['100%', '0%']);
  const rightStrength = useTransform(dragX, [0, SWIPE_TRIGGER], ['0%', '100%']);

  /* ── haptic tick at threshold ── */
  const didTickRef = useRef(false);
  useEffect(() => {
    const unsub = dragX.on('change', (v) => {
      if (Math.abs(v) >= SWIPE_TRIGGER && !didTickRef.current) {
        haptic('light');
        didTickRef.current = true;
      }
      if (Math.abs(v) < SWIPE_TRIGGER) didTickRef.current = false;
    });
    return unsub;
  }, [dragX]);

  /* ── useDrag — replaces motion drag props for reliable mobile touch ── */
  const bind = useDrag(
    ({ movement: [mx], last, tap }) => {
      // When filterTaps:true is set in options, `tap` is true for quick taps
      if (tap) {
        haptic('light');
        onOpen();
        return;
      }

      if (!last) {
        // Live drag — update spring source
        dragX.set(reducedMotion ? 0 : mx);
      } else {
        // Gesture ended
        if (mx > SWIPE_TRIGGER && onSwipeRight) {
          (async () => {
            try {
              await onSwipeRight();
              haptic('success');
              onToast(`✓ ${rightLabel ?? 'Готово'}`, 'success');
            } catch {
              haptic('error');
              onToast('Ошибка — попробуйте ещё раз', 'error');
            }
          })();
        } else if (mx < -SWIPE_TRIGGER && onSwipeLeft) {
          (async () => {
            try {
              await onSwipeLeft();
              haptic('medium');
              onToast(`↩ ${leftLabel ?? 'Перемещено'}`, 'success');
            } catch {
              haptic('error');
              onToast('Ошибка — попробуйте ещё раз', 'error');
            }
          })();
        }
        dragX.set(0);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 8,
      from: () => [dragX.get(), 0],
      pointer: { touch: true },
    }
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      haptic('light');
      onOpen();
    }
  };

  const accentLeft = 'text-destructive';
  const accentRight = accent === 'green' ? 'text-emerald-600' : 'text-amber-500';

  return (
    <motion.div layout className="relative isolate">
      {/* ── left hint (drag left) ── */}
      {onSwipeLeft && (
        <motion.div
          style={{ opacity: reducedMotion ? undefined : leftHintOpacity }}
          className="absolute inset-0 rounded-2xl flex items-center px-4 pointer-events-none"
        >
          <div className={`flex flex-col items-center gap-1 ${accentLeft}`}>
            <div className={`flex items-center gap-1.5`}>
              {leftIcon}
              <span className="text-xs font-semibold">{leftLabel}</span>
            </div>
            <div className="h-0.5 w-16 rounded-full bg-destructive/30 overflow-hidden">
              <motion.div
                style={{ width: reducedMotion ? undefined : leftStrength }}
                className="h-full bg-destructive rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── right hint (drag right) ── */}
      {onSwipeRight && (
        <motion.div
          style={{ opacity: reducedMotion ? undefined : rightHintOpacity }}
          className="absolute inset-0 rounded-2xl flex items-center justify-end px-4 pointer-events-none"
        >
          <div className={`flex flex-col items-center gap-1 ${accentRight}`}>
            <div className={`flex items-center gap-1.5`}>
              <span className="text-xs font-semibold">{rightLabel}</span>
              {rightIcon}
            </div>
            <div className={`h-0.5 w-16 rounded-full overflow-hidden ${accent === 'green' ? 'bg-emerald-500/30' : 'bg-amber-400/30'}`}>
              <motion.div
                style={{ width: reducedMotion ? undefined : rightStrength }}
                className={`h-full rounded-full ${accent === 'green' ? 'bg-emerald-500' : 'bg-amber-400'}`}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── background tint layer ── */}
      <motion.div
        style={{ backgroundColor: bgColor }}
        className="absolute inset-0 rounded-2xl pointer-events-none"
      />

      {/* ── card ── */}
      <motion.div
        {...(bind() as Record<string, unknown>)}
        layout
        role="button"
        tabIndex={0}
        aria-label={`${verse.reference} — нажмите чтобы открыть`}
        style={{ x: springX, touchAction: 'pan-y' }}
        whileTap={reducedMotion ? undefined : { scale: 0.99 }}
        onKeyDown={handleKeyDown}
        className={`
          relative z-10 bg-card border border-border/70 rounded-2xl p-4 shadow-sm
          active:shadow-md transition-shadow cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
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
                  className={`h-full ${accent === 'green' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${verse.masteryLevel}%` }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: 0.6, ease: 'easeOut' }
                  }
                />
              </div>
              <span>{verse.repetitions} повт.</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ===================== VERSE LIST ===================== */

interface VerseListProps {
  onAddVerse: () => void;
  onStartTraining: (verseId: string) => void;
}

export function VerseList({ onAddVerse, onStartTraining }: VerseListProps) {
  const [searchQuery] = useState('');
  const [testamentFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [masteryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [activeColumn, setActiveColumn] = useState<ColumnType>('backlog');

  const [telegramId, setTelegramId] = useState<string | undefined>();
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  /* ── toasts ── */
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((message: string, type: ToastEntry['type']) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2200);
  }, []);

  /* ── aria-live announcement ── */
  const [announcement, setAnnouncement] = useState('');

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

  const fetchVerses = async (id: string) => {
    try {
      const data = await UserVersesService.getApiUsersVerses(id);
      setVerses(data as Array<Verse>);
    } catch (err) {
      console.error('Не удалось получить стихи:', err);
      setVerses([]);
    }
  };

  useEffect(() => {
    const id = resolveTelegramId();
    if (!id) { setVerses([]); return; }
    setTelegramId(id);
    localStorage.setItem('telegramId', id);
    fetchVerses(id);
  }, []);

  /* ── status change ── */
  const handleStatusChange = async (verse: Verse, status: VerseStatus) => {
    if (!telegramId) return;
    await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, { status });
    setVerses((prev) => prev.map((v) => v.id === verse.id ? { ...v, status } : v));
  };

  /* ── delete ── */
  const handleDeleteVerse = async (verse: Verse) => {
    if (!telegramId) return;
    await UserVersesService.deleteApiUsersVerses(telegramId, verse.externalVerseId);
    setVerses((prev) => {
      const updated = prev.filter((v) => v.id !== verse.id);
      setGalleryIndex((cur) => {
        if (updated.length === 0 || cur === null) return null;
        return cur >= updated.length ? updated.length - 1 : cur;
      });
      return updated;
    });
  };

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

  const backlogVerses = filteredVerses.filter(
    (v) => v.status === VerseStatus.NEW || v.status === VerseStatus.STOPPED
  );
  const learningVerses = filteredVerses.filter((v) => v.status === VerseStatus.LEARNING);

  /* ── column switch with a11y announce ── */
  const switchColumn = useCallback(
    (col: ColumnType) => {
      setActiveColumn(col);
      haptic('light');
      const count = col === 'backlog' ? backlogVerses.length : learningVerses.length;
      const label = col === 'backlog' ? 'Ожидание' : 'Изучаю';
      setAnnouncement(`${label}: ${count} стихов`);
    },
    [backlogVerses.length, learningVerses.length]
  );

  /* ── tab strip keyboard navigation ── */
  const handleTabStripKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); switchColumn('backlog'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); switchColumn('learning'); }
  };

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
            Свайпайте карточки: вправо — начать учить, влево — изменить статус.
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

      {/* Column Tab Strip */}
      <div className="mb-6">
        <div
          role="tablist"
          aria-label="Колонки стихов"
          onKeyDown={handleTabStripKeyDown}
          className="flex-1 sm:flex-none bg-muted/60 rounded-full p-1 flex items-center gap-1 w-full sm:w-auto"
        >
          <Button
            role="tab"
            aria-selected={activeColumn === 'backlog'}
            size="sm"
            variant={activeColumn === 'backlog' ? 'default' : 'ghost'}
            className="flex-1 rounded-full"
            onClick={() => switchColumn('backlog')}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Ожидание
              <span className="text-[11px] opacity-60 font-normal">({backlogVerses.length})</span>
            </span>
          </Button>
          <Button
            role="tab"
            aria-selected={activeColumn === 'learning'}
            size="sm"
            variant={activeColumn === 'learning' ? 'default' : 'ghost'}
            className="flex-1 rounded-full"
            onClick={() => switchColumn('learning')}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Изучаю
              <span className="text-[11px] opacity-60 font-normal">({learningVerses.length})</span>
            </span>
          </Button>
        </div>
      </div>

      {/* Verse List */}
      {filteredVerses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Стихов пока нет. Добавьте первый!</p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Backlog column */}
          <div
            className={`${activeColumn === 'backlog' ? 'block' : 'hidden'} lg:block space-y-3`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Новые / Пауза</span>
              </div>
              <span className="text-xs text-muted-foreground">{backlogVerses.length} шт.</span>
            </div>
            <AnimatePresence initial={false}>
              {backlogVerses.map((verse) => (
                <SwipeableVerseCard
                  key={verse.id}
                  verse={verse}
                  accent="amber"
                  leftLabel="Оставить здесь"
                  rightLabel="В изучение"
                  leftIcon={<Pause className="w-4 h-4" />}
                  rightIcon={<MoveRight className="w-4 h-4" />}
                  onOpen={() => {
                    const index = verses.findIndex((v) => v.id === verse.id);
                    if (index !== -1) { haptic('light'); setGalleryIndex(index); }
                  }}
                  onSwipeRight={() => handleStatusChange(verse, VerseStatus.LEARNING)}
                  onToast={pushToast}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Learning column */}
          <div
            className={`${activeColumn === 'learning' ? 'block' : 'hidden'} lg:block space-y-3`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Изучаю</span>
              </div>
              <span className="text-xs text-muted-foreground">{learningVerses.length} шт.</span>
            </div>
            <AnimatePresence initial={false}>
              {learningVerses.map((verse) => (
                <SwipeableVerseCard
                  key={verse.id}
                  verse={verse}
                  accent="green"
                  leftLabel="Поставить на паузу"
                  rightLabel="Оставить здесь"
                  leftIcon={<MoveLeft className="w-4 h-4" />}
                  rightIcon={<Play className="w-4 h-4" />}
                  onOpen={() => {
                    const index = verses.findIndex((v) => v.id === verse.id);
                    if (index !== -1) { haptic('light'); setGalleryIndex(index); }
                  }}
                  onSwipeLeft={() => handleStatusChange(verse, VerseStatus.STOPPED)}
                  onToast={pushToast}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Toast layer */}
      <ToastLayer toasts={toasts} />

      {/* Gallery overlay */}
      {galleryIndex !== null && verses[galleryIndex] && (
        <VerseGallery
          verses={verses}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteVerse}
          onStartTraining={(verse) => onStartTraining(verse.id)}
        />
      )}
    </div>
  );
}
