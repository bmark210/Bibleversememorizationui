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
                'whitespace-pre-line rounded-[1.35rem] border px-4 py-3 text-sm shadow-[var(--shadow-soft)]',
                activeHintContent.kind === 'full_reveal'
                  ? 'border-status-mastered/25 bg-status-mastered-soft text-status-mastered'
                  : 'border-status-learning/25 bg-status-learning-soft text-status-learning',
              )}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {activeHintContent.title}
              </p>
              <p className="text-text-primary">{activeHintContent.text}</p>
            </div>
          )}

          {/* Daily hint budget badge */}
          {isActive && !surrendered && (
            <p className={cn(
              'text-center text-xs font-medium',
              budgetExhausted
                ? 'text-status-paused'
                : 'text-text-muted',
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
                  'flex w-full items-center justify-center gap-2 rounded-[1.35rem] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-soft)] transition-[background-color,border-color,color,box-shadow]',
                  budgetExhausted
                    ? 'cursor-not-allowed border-border-subtle bg-bg-subtle text-text-muted'
                    : 'border-status-learning/25 bg-status-learning-soft text-status-learning hover:border-status-learning/35 hover:bg-status-learning-soft active:bg-status-learning-soft',
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
                  'flex w-full items-center justify-center gap-2 rounded-[1.35rem] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-soft)] transition-[background-color,border-color,color,box-shadow]',
                  budgetExhausted || !canShowVerse
                    ? 'cursor-not-allowed border-border-subtle bg-bg-subtle text-text-muted'
                    : 'border-status-mastered/25 bg-status-mastered-soft text-status-mastered hover:border-status-mastered/35 hover:bg-status-mastered-soft active:bg-status-mastered-soft',
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
