"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";
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

type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onDelete: (verse: Verse) => Promise<void>;
  onStartTraining?: (verse: Verse) => void;
};

type Feedback = {
  message: string;
  tone: "success" | "warning" | "danger";
};

type SwipeAction = "learn" | "stop" | "delete" | null;

const SWIPE_THRESHOLD = 50;
const ACTION_THRESHOLD = 100;

const getRightAction = (status: VerseStatus) => {
  if (status === VerseStatus.NEW) {
    return { nextStatus: VerseStatus.LEARNING, label: "В изучение", action: "learn" as const };
  }
  if (status === VerseStatus.LEARNING) {
    return { nextStatus: VerseStatus.STOPPED, label: "Остановить", action: "stop" as const };
  }
  if (status === VerseStatus.STOPPED) {
    return { nextStatus: VerseStatus.LEARNING, label: "Вернуть в учебу", action: "learn" as const };
  }
  return null;
};

const getActionColor = (action: SwipeAction) => {
  switch (action) {
    case "learn": return "bg-[#059669]";
    case "stop": return "bg-orange-500";
    case "delete": return "bg-destructive";
    default: return "";
  }
};

const getActionIcon = (action: SwipeAction) => {
  switch (action) {
    case "learn": return <Play className="w-10 h-10 text-white" />;
    case "stop": return <Square className="w-10 h-10 text-white" />;
    case "delete": return <Trash2 className="w-10 h-10 text-white" />;
    default: return null;
  }
};

const variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
  }),
};

export function VerseGallery({
  verses,
  initialIndex,
  onClose,
  onStatusChange,
  onDelete,
  onStartTraining,
}: VerseGalleryProps) {
  const [[currentIndex, direction], setIndex] = useState([initialIndex, 0]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [swipeAction, setSwipeAction] = useState<SwipeAction>(null);
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setIndex([initialIndex, 0]);
  }, [initialIndex]);

  const currentVerse = verses[currentIndex];
  const hasNext = currentIndex < verses.length - 1;
  const hasPrev = currentIndex > 0;
  const availableAction = currentVerse ? getRightAction(currentVerse.status) : null;

  const paginate = (newDirection: number) => {
    if (newDirection > 0 && !hasNext) return;
    if (newDirection < 0 && !hasPrev) return;
    setIndex([currentIndex + newDirection, newDirection]);
  };

  const showFeedback = (message: string, tone: Feedback["tone"]) => {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 1500);
  };

  const handleDrag = (_: any, info: PanInfo) => {
    const { x, y } = info.offset;
    setSwipeOffset({ x, y });

    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX > absY && absX > SWIPE_THRESHOLD) {
      if (x > 0 && availableAction) {
        setSwipeAction(availableAction.action);
      } else if (x < 0 && currentVerse?.status === VerseStatus.STOPPED) {
        setSwipeAction("delete");
      } else {
        setSwipeAction(null);
      }
    } else {
      setSwipeAction(null);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { x, y } = info.offset;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absY > absX && absY > ACTION_THRESHOLD) {
      // Swipe up (y < 0) -> direction 1 (next), Swipe down (y > 0) -> direction -1 (prev)
      if (y < 0) paginate(1);
      else paginate(-1);
    } else if (absX > absY && absX > ACTION_THRESHOLD) {
      if (x > 0 && availableAction) {
        onStatusChange(currentVerse, availableAction.nextStatus);
        showFeedback(`Статус: ${availableAction.label}`, "success");
      } else if (x < 0 && currentVerse.status === VerseStatus.STOPPED) {
        setDeleteConfirmOpen(true);
      }
    }

    setSwipeAction(null);
    setSwipeOffset({ x: 0, y: 0 });
  };

  if (!currentVerse) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col select-none touch-none">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-card/50 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">
            Стих {currentIndex + 1} из {verses.length}
          </span>
          <MasteryBadge status={currentVerse.status} />
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <AnimatePresence initial={false}>
          {swipeAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: Math.min(Math.abs(swipeOffset.x) / 150, 0.9) }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 z-0 ${getActionColor(swipeAction)} flex items-center ${swipeOffset.x > 0 ? "justify-start pl-20" : "justify-end pr-20"}`}
            >
              <motion.div 
                animate={{ scale: Math.abs(swipeOffset.x) > ACTION_THRESHOLD ? 1.2 : 1 }}
                className="flex flex-col items-center gap-3 text-white"
              >
                {getActionIcon(swipeAction)}
                <span className="font-bold uppercase tracking-widest text-sm">
                  {swipeAction === 'learn' ? "В изучение" : swipeAction === 'stop' ? "Остановить" : "Удалить"}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={currentVerse.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.8}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            transition={{
              y: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0 flex items-center justify-center p-6 z-10"
          >
            <div className="max-w-xl w-full bg-card p-10 sm:p-14 rounded-[3rem] border border-border shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]">
              <div className="text-center space-y-8">
                <h2 className="text-3xl font-serif italic text-primary/90">{currentVerse.reference}</h2>
                <p className="text-xl sm:text-2xl leading-relaxed font-light text-foreground/90">
                  «{currentVerse.text}»
                </p>
                
                <div className="pt-8 space-y-3">
                  <div className="flex justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    <span>Освоение</span>
                    <span className="font-bold text-primary">{currentVerse.masteryLevel}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${currentVerse.masteryLevel}%` }}
                      transition={{ duration: 1, ease: "circOut" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="p-8 border-t border-border bg-card/50 backdrop-blur-md">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="flex items-center justify-around">
            <button 
              onClick={() => paginate(-1)} 
              disabled={!hasPrev}
              className="flex flex-col items-center gap-2 group disabled:opacity-20 transition-all"
            >
              <ChevronUp className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest">Назад</span>
            </button>
            <div className="h-10 w-px bg-border" />
            <button 
              onClick={() => paginate(1)} 
              disabled={!hasNext}
              className="flex flex-col items-center gap-2 group disabled:opacity-20 transition-all"
            >
              <ChevronDown className="h-5 w-5 group-hover:translate-y-1 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest">Далее</span>
            </button>
          </div>

          <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.4em] text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-3 w-3" />
              {currentVerse.status === VerseStatus.STOPPED ? "Удалить" : "Нет действия"}
            </div>
            <div className="flex items-center gap-2">
              {availableAction?.label ?? "Конец"}
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {onStartTraining && (
            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl text-[11px] uppercase tracking-[0.3em] hover:bg-primary hover:text-primary-foreground transition-all border-primary/20"
              onClick={() => onStartTraining(currentVerse)}
            >
              Начать обучение
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-serif">Удалить стих?</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              Это действие нельзя будет отменить. Стих исчезнет из вашего списка изучения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-2xl h-12">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl h-12 bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                await onDelete(currentVerse);
                setDeleteConfirmOpen(false);
                if (hasNext) paginate(1);
                else if (hasPrev) paginate(-1);
                else onClose();
              }}
            >
              Да, удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] rounded-2xl px-8 py-4 text-sm font-bold shadow-2xl backdrop-blur-lg ${
              feedback.tone === "success" ? "bg-emerald-500 text-white" : feedback.tone === "danger" ? "bg-red-500 text-white" : "bg-orange-500 text-white"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
