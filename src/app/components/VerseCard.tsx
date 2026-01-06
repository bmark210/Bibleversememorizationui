"use client";

import { motion, PanInfo, useMotionValue, useSpring, useTransform } from "motion/react";
import { Play, Square, Trash2 } from "lucide-react";
import { Verse } from "@/app/App";
import { VerseStatus } from "@/generated/prisma";

/* ===================== CONSTANTS ===================== */

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

/* ===================== TYPES ===================== */

export interface VerseCardProps {
  verse: Verse;
  index: number;
  isActive: boolean;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onRequestDelete: () => void;
  showFeedback: (message: string, type: "success" | "error") => void;
  topInset: number;
}

/* ===================== COMPONENT ===================== */

export function VerseCard({
  verse,
  index,
  isActive,
  onStatusChange,
  onRequestDelete,
  showFeedback,
  topInset,
}: VerseCardProps) {
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
