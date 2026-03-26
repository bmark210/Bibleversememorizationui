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
  const touchStateRef = useRef<{
    y: number;
    index: number;
    isDragging: boolean;
  } | null>(null);
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

  // ── Desktop drag & drop (HTML5) ──
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

  // ── Mobile touch drag — initiated ONLY from grip handle ──
  const handleGripTouchStart = (e: React.TouchEvent, index: number) => {
    if (controlsLocked || isAnswered) return;
    const touch = e.touches[0];
    if (!touch) return;
    // Don't set isDragging yet — wait for movement to distinguish tap from drag
    touchStateRef.current = { y: touch.clientY, index, isDragging: false };
  };

  const handleGripTouchMove = (e: React.TouchEvent) => {
    if (!touchStateRef.current || !listRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = Math.abs(touch.clientY - touchStateRef.current.y);

    // Activate drag after 8px of vertical movement
    if (!touchStateRef.current.isDragging) {
      if (deltaY < 8) return;
      touchStateRef.current.isDragging = true;
      setDraggedIndex(touchStateRef.current.index);
    }

    // Prevent scroll while dragging
    e.preventDefault();

    // Find which row the finger is over
    const children = Array.from(listRef.current.children);
    let targetIndex = touchStateRef.current.index;

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

  const handleGripTouchEnd = () => {
    if (
      touchStateRef.current?.isDragging &&
      draggedIndex !== null &&
      overIndex !== null &&
      draggedIndex !== overIndex
    ) {
      moveItem(draggedIndex, overIndex);
    }
    touchStateRef.current = null;
    setDraggedIndex(null);
    setOverIndex(null);
  };

  // ── Button-based reorder (always available as fallback) ──
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
      <div ref={listRef} className="flex flex-col gap-2">
        {items.map((item, index) => {
          const isDragging = draggedIndex === index;
          const isOver = overIndex === index && draggedIndex !== index;
          const isCorrectPosition =
            isAnswered && item.id === question.correctOrder[index];

          return (
            <div
              key={item.id}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-3 rounded-xl border min-h-[3rem] px-3 py-2.5 font-medium transition-all duration-150 select-none",
                isDragging && "opacity-40 scale-[0.97] shadow-lg",
                isOver && "border-brand-primary/30 bg-brand-primary/10 shadow-[var(--shadow-soft)]",
                isAnswered && isCorrectPosition &&
                  "border-status-learning/25 bg-status-learning-soft",
                isAnswered && !isCorrectPosition &&
                  "border-status-paused/25 bg-status-paused-soft",
                !isAnswered &&
                  !isDragging &&
                  !isOver &&
                  "border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]",
              )}
            >
              {/* Grab handle + position */}
              {!isAnswered ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Grip dots — drag handle for both desktop & mobile */}
                  <span
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onTouchStart={(e) => handleGripTouchStart(e, index)}
                    onTouchMove={(e) => handleGripTouchMove(e)}
                    onTouchEnd={handleGripTouchEnd}
                    className="flex -m-1 cursor-grab flex-col gap-[3px] p-1 text-text-muted active:cursor-grabbing"
                    style={{ touchAction: "none" }}
                    aria-label="Перетащите для перемещения"
                  >
                    <span className="flex gap-[3px]">
                      <span className="h-[3px] w-[3px] rounded-full bg-current" />
                      <span className="h-[3px] w-[3px] rounded-full bg-current" />
                    </span>
                    <span className="flex gap-[3px]">
                      <span className="h-[3px] w-[3px] rounded-full bg-current" />
                      <span className="h-[3px] w-[3px] rounded-full bg-current" />
                    </span>
                    <span className="flex gap-[3px]">
                      <span className="h-[3px] w-[3px] rounded-full bg-current" />
                      <span className="h-[3px] w-[3px] rounded-full bg-current" />
                    </span>
                  </span>
                  {/* Up/down buttons */}
                  <span className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || controlsLocked}
                      className="flex h-5 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-secondary disabled:opacity-20"
                      aria-label="Переместить вверх"
                    >
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8L6 4L10 8" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1 || controlsLocked}
                      className="flex h-5 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-secondary disabled:opacity-20"
                      aria-label="Переместить вниз"
                    >
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4L6 8L10 4" /></svg>
                    </button>
                  </span>
                </div>
              ) : (
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums",
                    isCorrectPosition
                      ? "bg-status-learning-soft text-status-learning"
                      : "bg-status-paused-soft text-status-paused",
                  )}
                >
                  {index + 1}
                </span>
              )}

              <span
                className="min-w-0 leading-snug text-text-primary"
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
          className={cn(
            "h-11 w-full rounded-xl border border-brand-primary bg-brand-primary text-sm font-medium text-brand-primary-foreground shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-brand-primary-hover hover:bg-brand-primary-hover active:scale-[0.99] disabled:border-border-subtle disabled:bg-bg-subtle disabled:text-text-muted",
          )}
        >
          Проверить порядок
        </button>
      )}

      {isAnswered && !isCorrectOrder && (
        <p className="text-center text-xs text-text-muted">
          Правильный порядок показан выше
        </p>
      )}
    </div>
  );
}
