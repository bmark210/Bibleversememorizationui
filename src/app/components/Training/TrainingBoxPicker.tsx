"use client";

import { BookOpen, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/app/components/ui/utils";
import {
  buildTextBoxSummary,
  formatRussianCount,
  TextSurfaceCard,
} from "@/app/components/texts/TextCards";
import type { TextBoxSummary, TrainingBoxScope } from "@/app/types/textBox";

type TrainingBoxPickerProps = {
  boxes: TextBoxSummary[];
  isLoading: boolean;
  error?: string | null;
  selectedScope?: TrainingBoxScope | null;
  onSelect: (scope: TrainingBoxScope) => void;
};

export function TrainingBoxPicker({
  boxes,
  isLoading,
  error,
  selectedScope = null,
  onSelect,
}: TrainingBoxPickerProps) {
  return (
    <div className="mx-auto min-h-0 flex-1 overflow-y-auto py-4 flex h-full w-full max-w-3xl flex-col px-4 sm:px-6">
      <div className="mb-5 shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
          {formatRussianCount(boxes.length, ["коробка", "коробки", "коробок"])}
        </p>
        <h1 className="mt-2 [font-family:var(--font-heading)] text-[2rem] font-semibold tracking-tight text-text-primary sm:text-[2.25rem]">
          Выберите коробку
        </h1>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <TextSurfaceCard className="p-4 text-sm text-text-secondary">
          {error}
        </TextSurfaceCard>
      ) : boxes.length === 0 ? (
        <TextSurfaceCard className="p-5 text-sm text-text-secondary">
          Создайте коробку в разделе «Тексты».
        </TextSurfaceCard>
      ) : (
        <div>
          <div className="space-y-3">
            {boxes.map((box) => {
              const isActive = selectedScope?.boxId === box.id;
              return (
                <button
                  key={box.id}
                  type="button"
                  onClick={() =>
                    onSelect({ boxId: box.id, boxTitle: box.title })
                  }
                  className="block w-full text-left"
                >
                  <TextSurfaceCard
                    className={cn(
                      "p-4 transition-transform duration-150 hover:-translate-y-[1px]",
                      isActive && "border-brand-primary/25",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                          <h2 className="truncate [font-family:var(--font-heading)] text-[1.35rem] font-semibold tracking-tight text-text-primary">
                            {box.title}
                          </h2>
                        </div>
                        <p className="mt-3 text-[0.98rem] leading-7 text-text-secondary">
                          {buildTextBoxSummary(box)}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-surface/80 text-text-muted shadow-[var(--shadow-soft)]">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </TextSurfaceCard>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
