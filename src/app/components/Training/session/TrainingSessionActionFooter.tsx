"use client";

import React from "react";
import { ArrowDown, ArrowUp, Lightbulb } from "lucide-react";
import { Button } from "@/app/components/ui/button";

type Props = {
  bottomInset: number;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  isNavigationBlocked: boolean;
  isActionPending: boolean;
  showAssistButton: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onOpenAssistDrawer: () => void;
  onRequestCloseSession: () => void;
};

export function TrainingSessionActionFooter({
  bottomInset,
  canNavigatePrev,
  canNavigateNext,
  isNavigationBlocked,
  isActionPending,
  showAssistButton,
  onNavigatePrev,
  onNavigateNext,
  onOpenAssistDrawer,
  onRequestCloseSession,
}: Props) {
  return (
    <div
      style={{ paddingBottom: `${Math.max(12, bottomInset)}px` }}
      className="relative shrink-0 border-t border-border/30 bg-card/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 py-2 sm:px-6">
        <div className="flex flex-1 items-center justify-start gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl text-foreground/75"
            disabled={!canNavigatePrev || isNavigationBlocked}
            onClick={onNavigatePrev}
            aria-label="Предыдущий стих"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2">
          {showAssistButton ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-state-warning/25 bg-state-warning/12 px-3 text-sm text-state-warning backdrop-blur-xl hover:border-state-warning/35 hover:bg-state-warning/16"
                onClick={onOpenAssistDrawer}
                disabled={isActionPending}
              aria-label="Открыть подсказки"
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              Подсказки
            </Button>
          ) : null}

          <Button
            variant="outline"
            className="h-11 rounded-xl border-border/60 bg-background/80 px-3 text-sm text-foreground/80 backdrop-blur-xl"
            onClick={onRequestCloseSession}
            disabled={isActionPending}
          >
            Завершить
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl text-foreground/75"
            disabled={!canNavigateNext || isNavigationBlocked}
            onClick={onNavigateNext}
            aria-label="Следующий стих"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
