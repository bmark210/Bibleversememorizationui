"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/app/components/ui/utils";
import type { DragQuestion } from "../../types";

type DragReorderModeProps = {
  question: DragQuestion;
  isAnswered: boolean;
  controlsLocked: boolean;
  onOrderSubmit: (orderedIds: string[]) => void;
};

export function DragReorderMode({
  question,
  isAnswered,
  controlsLocked,
  onOrderSubmit,
}: DragReorderModeProps) {
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

    const listRect = listRef.current.getBoundingClientRect();
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
      <div ref={listRef} className="flex flex-col gap-2">
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
                "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium shadow-sm transition-all select-none",
                isDragging && "opacity-50 scale-95",
                isOver && "border-primary/50 bg-primary/5",
                isAnswered && isCorrectPosition &&
                  "border-green-500/40 bg-green-500/10",
                isAnswered && !isCorrectPosition &&
                  "border-red-500/40 bg-red-500/10",
                !isAnswered &&
                  !isDragging &&
                  !isOver &&
                  "border-border/55 bg-card/40 cursor-grab active:cursor-grabbing",
              )}
              style={{ touchAction: "none" }}
            >
              <span className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || controlsLocked || isAnswered}
                  className="h-6 w-6 rounded-md text-xs text-foreground/50 hover:bg-muted/40 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={
                    index === items.length - 1 || controlsLocked || isAnswered
                  }
                  className="h-6 w-6 rounded-md text-xs text-foreground/50 hover:bg-muted/40 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </span>
              <span className="text-foreground/85 leading-snug">{item.text}</span>
            </div>
          );
        })}
      </div>

      {!isAnswered && (
        <button
          type="button"
          onClick={() => onOrderSubmit(items.map((i) => i.id))}
          disabled={controlsLocked}
          className="w-full rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          Проверить порядок
        </button>
      )}

      {isAnswered && !isCorrectOrder && (
        <p className="text-xs text-muted-foreground text-center">
          Правильный порядок показан ниже
        </p>
      )}
    </div>
  );
}
