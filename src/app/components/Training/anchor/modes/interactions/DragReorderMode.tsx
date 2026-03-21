"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/app/components/ui/utils";
import type { TrainingFontSizes } from "@/app/components/training-session/modes/useTrainingFontSize";
import type { DragQuestion } from "../../types";

type DragReorderModeProps = {
  fontSizes: TrainingFontSizes;
  question: DragQuestion;
  isAnswered: boolean;
  controlsLocked: boolean;
  onOrderSubmit: (orderedIds: string[]) => void;
};

export function DragReorderMode({
  fontSizes,
  question,
  isAnswered,
  controlsLocked,
  onOrderSubmit,
}: DragReorderModeProps) {
  const fragmentPx = Math.max(12, Math.round(fontSizes.sm * 0.93));
  const [items, setItems] = useState(() =>
    question.fragments.map((f) => ({ ...f })),
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const touchStartRef = useRef<{ y: number; index: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isCorrectOrder = items.every(
    (item, i) => item.id === question.correctOrder[i],
  );

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved!);
        return next;
      });
    },
    [],
  );

  const handleDragStart = (index: number) => {
    if (controlsLocked || isAnswered) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      moveItem(draggedIndex, index);
    }
    setDraggedIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setOverIndex(null);
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (controlsLocked || isAnswered) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { y: touch.clientY, index };
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !listRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const children = Array.from(listRef.current.children);
    let targetIndex = touchStartRef.current.index;

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const rect = child.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (touch.clientY < midY) {
        targetIndex = i;
        break;
      }
      if (i === children.length - 1 && touch.clientY >= midY) {
        targetIndex = children.length - 1;
      }
    }

    setOverIndex(targetIndex);
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && overIndex !== null && draggedIndex !== overIndex) {
      moveItem(draggedIndex, overIndex);
    }
    touchStartRef.current = null;
    setDraggedIndex(null);
    setOverIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0 || controlsLocked || isAnswered) return;
    moveItem(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1 || controlsLocked || isAnswered) return;
    moveItem(index, index + 1);
  };

  return (
    <div className="space-y-3">
      <div ref={listRef} className="flex flex-col gap-1.5">
        {items.map((item, index) => {
          const isDragging = draggedIndex === index;
          const isOver = overIndex === index && draggedIndex !== index;
          const isCorrectPosition =
            isAnswered && item.id === question.correctOrder[index];

          return (
            <div
              key={item.id}
              draggable={!controlsLocked && !isAnswered}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 font-medium transition-all duration-150 select-none",
                isDragging && "opacity-40 scale-[0.97]",
                isOver && "border-primary/40 bg-primary/[0.04]",
                isAnswered && isCorrectPosition &&
                  "border-emerald-500/30 bg-emerald-500/[0.06]",
                isAnswered && !isCorrectPosition &&
                  "border-rose-500/30 bg-rose-500/[0.06]",
                !isAnswered &&
                  !isDragging &&
                  !isOver &&
                  "border-border/40 bg-card/50 cursor-grab active:cursor-grabbing",
              )}
              style={{ touchAction: "none" }}
            >
              {/* Position number */}
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                  isAnswered && isCorrectPosition
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : isAnswered && !isCorrectPosition
                      ? "bg-rose-500/15 text-rose-500 dark:text-rose-400"
                      : "bg-foreground/[0.06] text-foreground/40",
                )}
              >
                {index + 1}
              </span>

              {/* Move buttons */}
              {!isAnswered && (
                <span className="flex flex-col gap-0.5 shrink-0 -my-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || controlsLocked || isAnswered}
                    className="h-4 w-5 rounded text-[10px] text-foreground/35 hover:text-foreground/60 hover:bg-muted/40 disabled:opacity-20 transition-colors"
                    aria-label="Move up"
                  >
                    &#8593;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={
                      index === items.length - 1 || controlsLocked || isAnswered
                    }
                    className="h-4 w-5 rounded text-[10px] text-foreground/35 hover:text-foreground/60 hover:bg-muted/40 disabled:opacity-20 transition-colors"
                    aria-label="Move down"
                  >
                    &#8595;
                  </button>
                </span>
              )}

              <span
                className="text-foreground/80 leading-snug"
                style={{ fontSize: `${fragmentPx}px` }}
              >
                {item.text}
              </span>
            </div>
          );
        })}
      </div>

      {!isAnswered && (
        <button
          type="button"
          onClick={() => onOrderSubmit(items.map((i) => i.id))}
          disabled={controlsLocked}
          className="w-full rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-2.5 text-sm font-semibold text-primary transition-all duration-150 hover:bg-primary/[0.12] active:scale-[0.99] disabled:opacity-40"
        >
          Проверить порядок
        </button>
      )}

      {isAnswered && !isCorrectOrder && (
        <p className="text-[11px] text-muted-foreground/60 text-center">
          Правильный порядок показан выше
        </p>
      )}
    </div>
  );
}
