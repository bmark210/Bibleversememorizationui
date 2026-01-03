"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion, PanInfo, useMotionValue, useSpring, useTransform } from "motion/react";
import { Play, Square, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { MasteryBadge } from "./MasteryBadge";
import { Verse } from "@/app/App";
import { VerseStatus } from "@/generated/prisma";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";

/* ===================== TYPES & CONSTANTS ===================== */

type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onDelete: (verse: Verse) => Promise<void>;
  onStartTraining?: (verse: Verse) => void;
};

const SWIPE_THRESHOLD = 120; // px для срабатывания действия
const HINT_THRESHOLD = 50; // px когда появляется подсказка

/* ===================== HELPERS ===================== */

const getSwipeActions = (status: VerseStatus) => {
  const canDelete = status === VerseStatus.STOPPED;
  
  let rightAction = null;
  if (status === VerseStatus.NEW) {
    rightAction = { next: VerseStatus.LEARNING, label: "Начать изучение", icon: Play };
  } else if (status === VerseStatus.LEARNING) {
    rightAction = { next: VerseStatus.STOPPED, label: "Приостановить", icon: Square };
  } else if (status === VerseStatus.STOPPED) {
    rightAction = { next: VerseStatus.LEARNING, label: "Возобновить", icon: Play };
  }

  return { rightAction, canDelete };
};

/* ===================== MAIN COMPONENT ===================== */

export function VerseGallery({
  verses,
  initialIndex,
  onClose,
  onStatusChange,
  onDelete,
  onStartTraining,
}: VerseGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Используем хук для получения safe area
  const { safeAreaInset, isInTelegram } = useTelegramSafeArea();
  const topInset = safeAreaInset.top;
  const bottomInset = safeAreaInset.bottom;

  // Отладка
  useEffect(() => {
    console.log('🎨 VerseGallery: Safe area insets:', { topInset, bottomInset, isInTelegram });
  }, [topInset, bottomInset, isInTelegram]);

  // Центрирование активной карточки при открытии
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetCard = container.children[initialIndex] as HTMLElement;
    if (targetCard) {
      const containerHeight = container.clientHeight;
      const cardHeight = targetCard.clientHeight;
      const scrollTop = targetCard.offsetTop - (containerHeight - cardHeight) / 2;
      
      container.scrollTo({ top: scrollTop, behavior: "instant" });
    }
  }, [initialIndex]);

  // Определение активной карточки при скролле
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number(entry.target.getAttribute("data-index"));
            setActiveIndex(index);
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.6, 0.7, 0.8],
      }
    );

    const cards = scrollContainerRef.current?.querySelectorAll("[data-index]");
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [verses.length]);

  // Показать уведомление
  const showFeedback = useCallback((message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  // Навигация кнопками
  const navigateTo = useCallback((direction: "prev" | "next") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const newIndex = direction === "prev" 
      ? Math.max(0, activeIndex - 1) 
      : Math.min(verses.length - 1, activeIndex + 1);
    
    if (newIndex === activeIndex) return;

    const targetCard = container.children[newIndex] as HTMLElement;
    if (targetCard) {
      const containerHeight = container.clientHeight;
      const cardHeight = targetCard.clientHeight;
      const scrollTop = targetCard.offsetTop - (containerHeight - cardHeight) / 2;
      
      container.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
  }, [activeIndex, verses.length]);

  const activeVerse = verses[activeIndex];
  if (!activeVerse) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-lg">
      {/* ============ HEADER ============ */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50"
        style={{ paddingTop: `${topInset}px` }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Стих {activeIndex + 1} из {verses.length}
              </span>
            </div>
          </div>
              <MasteryBadge status={activeVerse.status} />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ============ SCROLL CONTAINER ============ */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth pb-32"
        style={{ 
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingTop: `${topInset + 96}px` // topInset + 24 (pt-24 = 96px)
        }}
      >
        {verses.map((verse, index) => (
          <VerseCard
            key={verse.id}
            verse={verse}
            index={index}
            isActive={index === activeIndex}
            onStatusChange={onStatusChange}
            onRequestDelete={() => setDeleteDialogOpen(true)}
            showFeedback={showFeedback}
            topInset={topInset}
          />
        ))}
      </div>

      {/* ============ NAVIGATION CONTROLS ============ */}
      <div className="fixed left-1/2 bottom-32 -translate-x-1/2 flex items-center gap-3 z-40">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigateTo("prev")}
          disabled={activeIndex === 0}
          className="rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="px-4 py-2 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg">
          <span className="text-sm font-medium">
            {activeIndex + 1} / {verses.length}
          </span>
        </div>
        
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigateTo("next")}
          disabled={activeIndex === verses.length - 1}
          className="rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* ============ FOOTER ACTION ============ */}
      {onStartTraining && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-t border-border/50"
          style={{ paddingBottom: `${bottomInset}px` }}
        >
          <div className="p-6 max-w-2xl mx-auto">
            <Button
              onClick={() => onStartTraining(activeVerse)}
              className="w-full h-14 text-base font-bold tracking-wide rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02]"
            >
              Начать тренировку
            </Button>
          </div>
        </div>
      )}

      {/* ============ DELETE DIALOG ============ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-2 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold">
              Удалить стих?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              Стих <span className="font-semibold">{activeVerse.reference}</span> будет удален из вашего списка.
              Весь прогресс изучения будет потерян.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3">
            <AlertDialogCancel className="rounded-xl">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await onDelete(activeVerse);
                  setDeleteDialogOpen(false);
                  showFeedback("Стих удален", "success");
                } catch {
                  showFeedback("Ошибка при удалении", "error");
                }
              }}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Да, удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ FEEDBACK TOAST ============ */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`fixed bottom-44 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl backdrop-blur-md font-semibold text-sm ${
              feedback.type === "success"
                ? "bg-emerald-500/95 text-white"
                : "bg-destructive/95 text-white"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===================== VERSE CARD COMPONENT ===================== */

function VerseCard({
  verse,
  index,
  isActive,
  onStatusChange,
  onRequestDelete,
  showFeedback,
  topInset,
}: {
  verse: Verse;
  index: number;
  isActive: boolean;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onRequestDelete: () => void;
  showFeedback: (message: string, type: "success" | "error") => void;
  topInset: number;
}) {
  const dragX = useMotionValue(0);
  const springX = useSpring(dragX, { stiffness: 500, damping: 50 });
  
  const { rightAction, canDelete } = getSwipeActions(verse.status);

  // Динамический цвет фона при свайпе
  const backgroundColor = useTransform(
    dragX,
    [-SWIPE_THRESHOLD, -HINT_THRESHOLD, 0, HINT_THRESHOLD, SWIPE_THRESHOLD],
    [
      canDelete ? "#dc2626" : "rgba(0,0,0,0)",
      canDelete ? "rgba(220, 38, 38, 0.1)" : "rgba(0,0,0,0)",
      "rgba(0,0,0,0)",
      rightAction ? "rgba(16, 185, 129, 0.1)" : "rgba(0,0,0,0)",
      rightAction ? "#10b981" : "rgba(0,0,0,0)",
    ]
  );

  const hintOpacity = useTransform(
    dragX,
    [-SWIPE_THRESHOLD, -HINT_THRESHOLD, 0, HINT_THRESHOLD, SWIPE_THRESHOLD],
    [1, 0.6, 0, 0.6, 1]
  );

  // Все scale трансформации создаем заранее, чтобы избежать условных хуков
  const leftIconScale = useTransform(dragX, [0, -HINT_THRESHOLD], [0.8, 1]);
  const rightIconScale = useTransform(dragX, [HINT_THRESHOLD, 0], [1, 0.8]);

  // Обработка завершения свайпа
  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offsetX = info.offset.x;

    try {
      if (offsetX > SWIPE_THRESHOLD && rightAction) {
        // Свайп вправо - изменение статуса
        await onStatusChange(verse, rightAction.next);
        showFeedback(`${rightAction.label}`, "success");
      } else if (offsetX < -SWIPE_THRESHOLD && canDelete) {
        // Свайп влево - удаление
        onRequestDelete();
      }
    } catch (error) {
      showFeedback("Произошла ошибка", "error");
    } finally {
      dragX.set(0);
    }
  };

  return (
    <div
      data-index={index}
      className="relative min-h-[500px] max-h-[700px] flex items-center justify-center snap-center px-4 sm:px-6"
      style={{
        height: `calc(100vh - ${240 + topInset}px)`
      }}
    >
      {/* ======== SWIPE ACTION BACKGROUND ======== */}
      <motion.div
        style={{ backgroundColor, opacity: hintOpacity }}
        className="absolute inset-x-4 sm:inset-x-6 top-1/2 -translate-y-1/2 h-[520px] max-h-[90%] rounded-[3rem] flex items-center justify-between px-8 sm:px-16 pointer-events-none"
      >
        {/* Левое действие - удаление */}
        {canDelete && (
          <motion.div
            style={{ scale: leftIconScale }}
            className="flex flex-col items-center gap-2 text-white"
          >
            <Trash2 className="w-8 h-8" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-wider">Удалить</span>
          </motion.div>
        )}

        <div className="flex-1" />

        {/* Правое действие - изменение статуса */}
        {rightAction && (
          <motion.div
            style={{ scale: rightIconScale }}
            className="flex flex-col items-center gap-2 text-white"
          >
            <rightAction.icon className="w-8 h-8" strokeWidth={2.5} />
            <span className="text-xs font-bold uppercase tracking-wider text-center max-w-[100px]">
              {rightAction.label}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ======== VERSE CARD ======== */}
      <motion.div
        drag={isActive ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: canDelete ? 0.2 : 0, right: rightAction ? 0.2 : 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x: springX }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative z-10 w-full max-w-2xl h-[520px] max-h-[90%]
          bg-gradient-to-br from-card to-card/80
          backdrop-blur-sm
          rounded-[3rem] 
          border-2 border-border/50
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
          p-8 sm:p-12
          flex flex-col
          transition-all duration-300
          ${isActive ? "opacity-100 scale-100" : "opacity-70 scale-95"}
        `}
      >
        {/* Подсказка для активной карточки */}
        {isActive && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs text-muted-foreground flex items-center gap-2 bg-muted/80 px-4 py-2 rounded-full backdrop-blur-sm">
            <span>← Свайпните для действий →</span>
          </div>
        )}

        {/* Заголовок */}
        <div className="flex-shrink-0 text-center space-y-4 mb-6">
          <h2 className="text-3xl sm:text-4xl font-serif italic text-primary/90 font-bold">
            {verse.reference}
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent mx-auto rounded-full" />
        </div>

        {/* Текст стиха */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
          <p className="text-xl sm:text-2xl leading-relaxed text-foreground/90 italic text-center line-clamp-[9] font-light">
            «{verse.text}»
          </p>
        </div>

        {/* Прогресс */}
        <div className="flex-shrink-0 mt-6 space-y-4">
          <div className="flex items-end justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Прогресс освоения
            </span>
            <span className="text-2xl font-bold text-primary">
              {verse.masteryLevel}%
            </span>
          </div>
          
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${verse.masteryLevel}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
