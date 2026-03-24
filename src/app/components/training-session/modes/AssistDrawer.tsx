'use client'

import { Lightbulb, Flag } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { cn } from '@/app/components/ui/utils';
import type { HintState } from './useHintState';

interface AssistDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hintState: HintState;
  onRequestAssist: () => void;
  onRequestShowVerse: () => void;
}

export function AssistDrawer({
  open,
  onOpenChange,
  hintState,
  onRequestAssist,
  onRequestShowVerse,
}: AssistDrawerProps) {
  const {
    activeHintContent,
    nextAssistPreview,
    flowState,
    surrendered,
    showVerseUsed,
    canShowVerse,
    showVerseDurationSeconds,
    hintBudgetRemaining,
    hintBudgetTotal,
  } = hintState;

  const isActive = flowState === 'active';
  const budgetExhausted = hintBudgetRemaining <= 0;
  const showInlineHint =
    activeHintContent && activeHintContent.variant !== 'full_text_preview';

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base">Помощь</DrawerTitle>
        </DrawerHeader>

        <div className="space-y-3 px-4 pb-0">
          {/* Active hint content */}
          {showInlineHint && activeHintContent && (
            <div
              className={cn(
                'rounded-2xl border px-4 py-3 text-sm whitespace-pre-line',
                activeHintContent.kind === 'full_reveal'
                  ? 'border-amber-500/30 bg-amber-500/8'
                  : 'border-emerald-500/30 bg-emerald-500/8',
              )}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/50">
                {activeHintContent.title}
              </p>
              <p className="text-foreground/90">{activeHintContent.text}</p>
            </div>
          )}

          {/* Daily hint budget badge */}
          {isActive && !surrendered && (
            <p className={cn(
              'text-center text-xs font-medium',
              budgetExhausted
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-foreground/50',
            )}>
              {budgetExhausted
                ? 'Все подсказки на сегодня использованы.'
                : `Подсказок: ${hintBudgetRemaining}/${hintBudgetTotal}`}
            </p>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {/* Progressive assist button */}
            {isActive && !surrendered && nextAssistPreview && (
              <button
                type="button"
                onClick={onRequestAssist}
                disabled={budgetExhausted}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors',
                  budgetExhausted
                    ? 'cursor-not-allowed border-emerald-500/20 bg-emerald-500/5 text-emerald-400/50'
                    : 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 active:bg-emerald-500/18 dark:text-emerald-300',
                )}
              >
                <Lightbulb className="h-4 w-4" />
                {nextAssistPreview.label}
                <span className="text-[11px] font-normal opacity-60">
                  ({nextAssistPreview.nextWordUsed}/{nextAssistPreview.nextWordMax})
                </span>
              </button>
            )}

            {/* One-time full verse preview */}
            {isActive && !surrendered && (
              <button
                type="button"
                onClick={onRequestShowVerse}
                disabled={budgetExhausted || !canShowVerse}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors',
                  budgetExhausted || !canShowVerse
                    ? 'cursor-not-allowed border-amber-500/20 bg-amber-500/5 text-amber-400/50'
                    : 'border-amber-500/30 bg-amber-500/8 text-amber-700 active:bg-amber-500/18 dark:text-amber-300',
                )}
              >
                <Flag className="h-4 w-4" />
                {showVerseUsed ? 'Стих уже показан' : 'Показать стих'}
                <span className="text-[11px] font-normal opacity-60">
                  (на {showVerseDurationSeconds} сек.)
                </span>
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
