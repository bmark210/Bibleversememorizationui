"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  PanInfo,
  animate,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
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

type Feedback = { message: string; tone: "success" | "warning" | "danger" };
type SwipeAction = "learn" | "stop" | "delete" | null;

/** Настройки UX */
const STEP = 580;                 // расстояние между центрами карточек (меньше высоты => видны края соседних)
const AXIS_LOCK_PX = 12;          // сколько нужно сдвинуть, чтобы “зафиксировать” ось
const AXIS_LOCK_RATIO = 1.35;     // “строгий” вертикальный/горизонтальный жест
const H_ACTION_ARM_PX = 56;       // когда показывать action-фон
const H_COMMIT_PX = 140;          // когда коммитить действие
const INERTIA = 0.25;             // ↓ вклад скорости (было 0.32)
const MAX_JUMP = 3;               // ↓ макс. сколько карточек за раз (было 5)
const FOLLOW = 0.88;              // ↓ мягкость следования (было 0.92)
const WINDOW = 4;                 // сколько карточек вокруг центра рендерим

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const centerResistance = (y: number) => {
  const distToCenter = Math.abs((-y / STEP) - Math.round(-y / STEP));
  return 1 - Math.min(distToCenter * 0.25, 0.18);
};

const getRightAction = (status: VerseStatus) => {
  if (status === VerseStatus.NEW) return { next: VerseStatus.LEARNING, label: "В изучение", action: "learn" as const };
  if (status === VerseStatus.LEARNING) return { next: VerseStatus.STOPPED, label: "Остановить", action: "stop" as const };
  if (status === VerseStatus.STOPPED) return { next: VerseStatus.LEARNING, label: "Вернуть", action: "learn" as const };
  return null;
};

const getActionColor = (action: SwipeAction) => {
  switch (action) {
    case "learn": return "bg-[#059669]";
    case "stop": return "bg-orange-500";
    case "delete": return "bg-destructive";
    default: return "bg-transparent";
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

export function VerseGallery({
  verses,
  initialIndex,
  onClose,
  onStatusChange,
  onDelete,
  onStartTraining,
}: VerseGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [swipeAction, setSwipeAction] = useState<SwipeAction>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // axis lock
  const axisRef = useRef<"x" | "y" | null>(null);
  const startYRef = useRef(0);

  // Вертикальный scroll позиции стека (0 => индекс 0 по центру, -STEP => индекс 1 по центру, etc.)
  const scrollY = useMotionValue(-initialIndex * STEP);
  const springY = useSpring(scrollY, {
    stiffness: 140,   // ↓ спокойнее (было 170)
    damping: 30,      // ↑ больше вязкости (было 26)
    mass: 1.4,        // ↑ тяжелее (было 1.2)
  });

  // Горизонтальный свайп активной карточки
  const cardX = useMotionValue(0);
  const springX = useSpring(cardX, { stiffness: 420, damping: 44, mass: 0.7 });

  // фон для экшена
  const actionOpacity = useTransform(cardX, [-180, -80, 0, 80, 180], [0.95, 0.75, 0, 0.75, 0.95]);
  const actionScale = useTransform(cardX, [-180, 0, 180], [1.15, 0.85, 1.15]);

  const currentVerse = verses[activeIndex];
  const rightAction = currentVerse ? getRightAction(currentVerse.status) : null;

  // Для перфоманса: окно элементов вокруг центра
  const visibleIndexes = useMemo(() => {
    const from = clamp(activeIndex - WINDOW, 0, verses.length - 1);
    const to = clamp(activeIndex + WINDOW, 0, verses.length - 1);
    const arr: number[] = [];
    for (let i = from; i <= to; i++) arr.push(i);
    return arr;
  }, [activeIndex, verses.length]);

  useEffect(() => {
    setActiveIndex(initialIndex);
    scrollY.set(-initialIndex * STEP);
    cardX.set(0);
    setSwipeAction(null);
    axisRef.current = null;
  }, [initialIndex, scrollY, cardX]); // eslint-disable-line react-hooks/exhaustive-deps

  const showFeedback = (message: string, tone: Feedback["tone"]) => {
    setFeedback({ message, tone });
    window.setTimeout(() => setFeedback(null), 1400);
  };

  const setActiveFromScroll = (y: number) => {
    const idx = clamp(Math.round(-y / STEP), 0, verses.length - 1);
    // важно: не спамим setState на каждом px
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const snapToIndex = (idx: number, velocityY = 0) => {
    const target = -idx * STEP;
    animate(scrollY, target, {
      type: "spring",
      stiffness: 150,   // ↓ мягче (было 180)
      damping: 28,      // ↑ плавнее (было 24)
      mass: 1.4,        // ↑ больше веса (было 1.25)
      velocity: velocityY * 0.6, // ↓ меньше отдачи
    });
  };

  const onDragStart = () => {
    axisRef.current = null;
    startYRef.current = scrollY.get();
    setSwipeAction(null);
  };

  const onDrag = (_: any, info: PanInfo) => {
    const ox = info.offset.x;
    const oy = info.offset.y;

    // 1) axis lock
    if (!axisRef.current) {
      const ax = Math.abs(ox);
      const ay = Math.abs(oy);
      if (ax < AXIS_LOCK_PX && ay < AXIS_LOCK_PX) return;

      // строгая фиксация оси
      if (ay > ax * AXIS_LOCK_RATIO) axisRef.current = "y";
      else if (ax > ay * AXIS_LOCK_RATIO) axisRef.current = "x";
      else return; // диагональ — пока не определяем
    }

    // 2) применяем движение
    if (axisRef.current === "y") {
      // вертикальная "прокрутка" стека
      const resistance = centerResistance(scrollY.get());
      const next = startYRef.current + info.offset.y * FOLLOW * resistance;
      scrollY.set(next);
      setActiveFromScroll(next);

      // пока вертикаль — горизонтальные экшены скрываем
      cardX.set(0);
      setSwipeAction(null);
      return;
    }

    if (axisRef.current === "x") {
      // горизонтальный свайп ТОЛЬКО для центральной карточки
      cardX.set(ox);

      // показать action только когда "вооружили" жест
      if (ox > H_ACTION_ARM_PX && rightAction) setSwipeAction(rightAction.action);
      else if (ox < -H_ACTION_ARM_PX && currentVerse?.status === VerseStatus.STOPPED) setSwipeAction("delete");
      else setSwipeAction(null);

      return;
    }
  };

  const onDragEnd = async (_: any, info: PanInfo) => {
    const axis = axisRef.current;
    axisRef.current = null;

    if (axis === "y") {
      // инерция: учитываем скорость, но ограничиваем MAX_JUMP
      const v = info.velocity.y;
      const current = scrollY.get();

      const projected = current + v * INERTIA;
      const rawIndex = Math.round(-projected / STEP);
      const currentIndex = clamp(Math.round(-current / STEP), 0, verses.length - 1);

      const clampedRaw = clamp(rawIndex, 0, verses.length - 1);
      const jump = clamp(clampedRaw - currentIndex, -MAX_JUMP, MAX_JUMP);
      const finalIndex = clamp(currentIndex + jump, 0, verses.length - 1);

      setActiveIndex(finalIndex);
      snapToIndex(finalIndex, v);
      setSwipeAction(null);
      return;
    }

    if (axis === "x") {
      const x = info.offset.x;

      if (Math.abs(x) >= H_COMMIT_PX && currentVerse) {
        // commit
        if (x > 0 && rightAction) {
          try {
            await onStatusChange(currentVerse, rightAction.next);
            showFeedback(`Статус: ${rightAction.label}`, "success");
          } catch {
            showFeedback("Не удалось обновить статус", "danger");
          }
        } else if (x < 0 && currentVerse.status === VerseStatus.STOPPED) {
          setDeleteConfirmOpen(true);
        }
      }

      // вернуть карточку в центр
      animate(cardX, 0, { type: "spring", stiffness: 420, damping: 44, mass: 0.7 });
      setSwipeAction(null);
      return;
    }

    // если ось так и не определилась — просто нормализуем
    animate(cardX, 0, { type: "spring", stiffness: 420, damping: 44 });
    snapToIndex(activeIndex, 0);
    setSwipeAction(null);
  };

  if (!currentVerse) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col select-none touch-none overflow-hidden">
      {/* Horizontal action background (только когда есть swipeAction) */}
      <AnimatePresence initial={false}>
        {swipeAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-0 flex items-center ${
              cardX.get() > 0 ? "justify-start pl-20" : "justify-end pr-20"
            } ${getActionColor(swipeAction)}`}
            style={{ opacity: actionOpacity }}
          >
            <motion.div style={{ scale: actionScale }} className="flex flex-col items-center gap-3 text-white">
              {getActionIcon(swipeAction)}
              <span className="font-bold uppercase tracking-widest text-sm">
                {swipeAction === "learn" ? "Учить" : swipeAction === "stop" ? "Остановить" : "Удалить"}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pb-6 pt-28 md:pt-6 border-b border-border bg-card/80 backdrop-blur-xl z-30">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">
            {activeIndex + 1} / {verses.length}
          </span>
        </div>
          <MasteryBadge status={currentVerse.status} />
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Gesture + Stack */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Gesture capture layer */}
        <motion.div
          className="absolute inset-0 z-[60] cursor-grab active:cursor-grabbing"
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
        />

        {/* Stack */}
        <motion.div className="w-full h-full relative" style={{ y: springY }}>
          {visibleIndexes.map((i) => {
            const verse = verses[i];
            const isCenter = i === activeIndex;
            const rel = i - activeIndex;

            // лёгкая перспектива/глубина, чтобы соседние ощущались “дальше”
            const scale = isCenter ? 1 : 0.88;
            const opacity = isCenter ? 1 : 0.40;
            const blur = isCenter ? "blur(0px)" : "blur(1.2px)";

            return (
              <motion.div
                key={verse.id}
                className="absolute inset-0 flex items-center justify-center p-6"
                style={{
                  y: i * STEP,
                  zIndex: 50 - Math.abs(rel),
                  perspective: 1200,
                }}
              >
                <motion.div
                  style={{
                    x: isCenter ? springX : 0,
                    scale,
                    opacity,
                    filter: blur,
                    rotateX: rel * 7,
                  }}
                  className="max-w-xl w-full bg-card p-10 sm:p-14 rounded-[3.5rem] border border-border shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)]"
                >
                  <div className="text-center space-y-10 pointer-events-none">
                    <div>
                      <h2 className="text-3xl font-serif italic text-primary/90">{verse.reference}</h2>
                      {isCenter && (
                        <div className="mt-3 text-[9px] uppercase tracking-[0.5em] text-muted-foreground opacity-60">
                          Свайп ↑↓ листает, ←→ действия
                        </div>
                      )}
                    </div>

                    <p className="text-xl sm:text-2xl leading-relaxed font-light text-foreground/90 line-clamp-6">
                      «{verse.text}»
                    </p>

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
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="p-8 border-t border-border bg-card/80 backdrop-blur-xl z-30">
        <div className="max-w-xl mx-auto space-y-6">
          {onStartTraining && (
            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl text-[11px] uppercase tracking-[0.4em] font-bold border-primary/20 bg-background/50 shadow-sm"
              onClick={() => onStartTraining(currentVerse)}
            >
              Начать тренировку
            </Button>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[3rem] p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-serif italic">Удалить стих?</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-4">
              Это действие полностью удалит стих из вашего списка изучения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-10 gap-3">
            <AlertDialogCancel className="rounded-2xl h-14">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl h-14 bg-destructive"
              onClick={async () => {
                const verseToDelete = verses[activeIndex];
                await onDelete(verseToDelete);
                setDeleteConfirmOpen(false);

                // после удаления аккуратно центрируемся
                const nextIndex = clamp(activeIndex, 0, Math.max(0, verses.length - 2));
                setActiveIndex(nextIndex);
                snapToIndex(nextIndex, 0);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-36 left-1/2 -translate-x-1/2 z-[60] rounded-3xl px-10 py-5 text-sm font-bold shadow-2xl backdrop-blur-xl border border-white/10 ${
              feedback.tone === "success"
                ? "bg-emerald-500/90 text-white"
                : feedback.tone === "danger"
                ? "bg-red-500/90 text-white"
                : "bg-orange-500/90 text-white"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
