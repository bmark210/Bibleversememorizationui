"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo, useMotionValue, useSpring, useTransform } from "motion/react";
import { Play, Square, Trash2, X } from "lucide-react";

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

const getRightAction = (status: VerseStatus) => {
  if (status === VerseStatus.NEW) return { next: VerseStatus.LEARNING, label: "В изучение", action: "learn" as const };
  if (status === VerseStatus.LEARNING) return { next: VerseStatus.STOPPED, label: "Остановить", action: "stop" as const };
  if (status === VerseStatus.STOPPED) return { next: VerseStatus.LEARNING, label: "Вернуть", action: "learn" as const };
  return null;
};

export function VerseGallery({
  verses,
  initialIndex,
  onClose,
  onStatusChange,
  onDelete,
  onStartTraining,
}: VerseGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  // Скролл к начальному элементу
  useEffect(() => {
    if (scrollContainerRef.current) {
      const target = scrollContainerRef.current.children[initialIndex] as HTMLElement;
      if (target) {
        scrollContainerRef.current.scrollTop = target.offsetTop;
      }
    }
  }, [initialIndex]);

  // Слежение за активным элементом через IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setActiveIndex(index);
          }
        });
      },
      { root: scrollContainerRef.current, threshold: 0.6 }
    );

    const elements = scrollContainerRef.current?.querySelectorAll("[data-index]");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [verses.length]);

  const showFeedback = (message: string, tone: "success" | "danger") => {
    setFeedback({ message, tone });
    setTimeout(() => setFeedback(null), 1500);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 pt-12 md:pt-6 flex items-center justify-between bg-background/80 backdrop-blur-xl border-b border-border z-40">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-bold">
            {activeIndex + 1} / {verses.length}
          </span>
          <MasteryBadge status={verses[activeIndex]?.status} />
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Scrollable Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-hide pt-[120px] pb-[140px]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {verses.map((verse, index) => (
          <VerseItem
            key={verse.id}
            verse={verse}
            index={index}
            isActive={index === activeIndex}
            onStatusChange={onStatusChange}
            onDelete={() => setDeleteConfirmOpen(true)}
            showFeedback={showFeedback}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-background/80 backdrop-blur-xl border-t border-border z-40">
        <div className="max-w-xl mx-auto">
          {onStartTraining && (
            <Button
              className="w-full h-14 rounded-2xl text-[11px] uppercase tracking-[0.4em] font-bold"
              onClick={() => onStartTraining(verses[activeIndex])}
            >
              Начать тренировку
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-serif italic">Удалить стих?</AlertDialogTitle>
            <AlertDialogDescription>Стих будет полностью удален из вашего списка.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive"
              onClick={async () => {
                await onDelete(verses[activeIndex]);
                setDeleteConfirmOpen(false);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl text-white font-bold text-sm shadow-xl ${
              feedback.tone === "success" ? "bg-emerald-500" : "bg-destructive"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerseItem({ verse, index, isActive, onStatusChange, onDelete, showFeedback }: any) {
  const dragX = useMotionValue(0);
  const springX = useSpring(dragX, { stiffness: 400, damping: 40 });
  const action = getRightAction(verse.status);

  // Трансформации для фона и иконок
  const bgOpacity = useTransform(dragX, [-150, -80, 0, 80, 150], [1, 0.5, 0, 0.5, 1]);
  const actionScale = useTransform(dragX, [-150, 0, 150], [1.2, 0.8, 1.2]);

  const onDragEnd = async (_: any, info: PanInfo) => {
    const x = info.offset.x;
    if (x > 140 && action) {
      try {
        await onStatusChange(verse, action.next);
        showFeedback(`Статус: ${action.label}`, "success");
      } catch (e) {
        showFeedback("Ошибка обновления", "danger");
      }
    } else if (x < -140 && verse.status === VerseStatus.STOPPED) {
      onDelete();
    }
    dragX.set(0);
  };

  return (
    <div
      data-index={index}
      className="h-[calc(100vh-260px)] w-full flex items-center justify-center snap-center px-6 relative"
    >
      {/* Action Background */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className={`absolute inset-0 z-0 flex items-center px-16 ${
          dragX.get() > 0 ? "justify-start bg-emerald-500" : "justify-end bg-destructive"
        } rounded-[3.5rem] m-6`}
      >
        <motion.div style={{ scale: actionScale }} className="flex flex-col items-center text-white gap-2">
          {dragX.get() > 0 ? (
            <>
              {verse.status === VerseStatus.LEARNING ? <Square /> : <Play />}
              <span className="text-[10px] font-bold uppercase">{action?.label}</span>
            </>
          ) : (
            <>
              <Trash2 />
              <span className="text-[10px] font-bold uppercase">Удалить</span>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Card Content */}
      <motion.div
        drag={isActive ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={onDragEnd}
        style={{ x: springX }}
        className="relative z-10 w-full max-w-xl bg-card p-10 sm:p-14 rounded-[3.5rem] border border-border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)]"
      >
        <div className="text-center space-y-10">
          <h2 className="text-3xl font-serif italic text-primary/90">{verse.reference}</h2>
          <p className="text-xl sm:text-2xl leading-relaxed font-light text-foreground/90">«{verse.text}»</p>
          <div className="pt-6 space-y-4">
            <div className="flex justify-between text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-bold">
              <span>Освоение</span>
              <span className="text-primary">{verse.masteryLevel}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${verse.masteryLevel}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
