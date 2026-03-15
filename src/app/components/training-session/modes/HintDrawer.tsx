'use client'

import { BookOpen, Lightbulb, ChevronRight, Flag } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { cn } from '@/app/components/ui/utils';
import type { HintType } from './hintUtils';
import { isHintFree } from './hintUtils';
import type { HintState } from './useHintState';

interface HintDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hintState: HintState;
  onRequestHint: (type: HintType) => void;
  hasContext: boolean;
  canShowNextWord: boolean;
  availableHints: HintType[];
}

type HintOptionSpec = {
  type: HintType;
  icon: typeof BookOpen;
  label: string;
  description: string;
};

const ALL_HINT_OPTIONS: HintOptionSpec[] = [
  {
    type: 'context',
    icon: BookOpen,
    label: 'Контекст',
    description: 'Соседний стих для контекста',
  },
  {
    type: 'firstWords',
    icon: Lightbulb,
    label: 'Начало стиха',
    description: 'Первые слова стиха',
  },
  {
    type: 'nextWord',
    icon: ChevronRight,
    label: 'Следующее слово',
    description: 'Одно слово по прогрессу',
  },
  {
    type: 'surrender',
    icon: Flag,
    label: 'Сдаюсь',
    description: 'Полный текст стиха',
  },
];

function getCostLabel(
  type: HintType,
  remainingBudget: number,
  disabled: boolean,
  hasContext: boolean,
  canShowNextWord: boolean
): { text: string; color: string } {
  if (type === 'context') {
    if (!hasContext) return { text: 'Нет контекста', color: 'text-muted-foreground' };
    return { text: 'Бесплатно', color: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (type === 'surrender') {
    return { text: 'Макс. оценка: Забыл', color: 'text-rose-600 dark:text-rose-400' };
  }
  if (type === 'nextWord' && !canShowNextWord) {
    return { text: 'Начните ввод', color: 'text-muted-foreground' };
  }
  // Paid hints (firstWords, nextWord)
  if (remainingBudget <= 0) {
    return { text: 'Нет подсказок', color: 'text-muted-foreground' };
  }
  return { text: '1 подсказка', color: 'text-amber-600 dark:text-amber-400' };
}

export function HintDrawer({
  open,
  onOpenChange,
  hintState,
  onRequestHint,
  hasContext,
  canShowNextWord,
  availableHints,
}: HintDrawerProps) {
  const { activeHintContent, surrendered, remainingBudget, totalBudget, attemptStatus } = hintState;

  const visibleOptions = ALL_HINT_OPTIONS.filter((opt) => availableHints.includes(opt.type));

  const isOptionDisabled = (type: HintType): boolean => {
    if (attemptStatus !== 'active') return true;
    if (surrendered) return true;
    if (type === 'context' && !hasContext) return true;
    if (type === 'nextWord' && !canShowNextWord) return true;
    // Paid hints disabled when budget exhausted
    if (!isHintFree(type) && remainingBudget <= 0) return true;
    return false;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {activeHintContent ? 'Подсказка' : 'Выберите подсказку'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6">
          {activeHintContent ? (
            /* ── Show hint content ── */
            <div className="space-y-3">
              <div
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm whitespace-pre-line',
                  activeHintContent.type === 'context'
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-foreground'
                    : activeHintContent.type === 'surrender'
                      ? 'border-rose-500/35 bg-rose-500/10 text-foreground'
                      : 'border-amber-500/35 bg-amber-500/10 text-foreground'
                )}
              >
                {activeHintContent.text}
              </div>

              {!surrendered && (
                <button
                  type="button"
                  className="w-full rounded-xl border border-border/60 bg-muted/35 px-4 py-2.5 text-sm text-muted-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  Закрыть
                </button>
              )}
              {surrendered && (
                <button
                  type="button"
                  className="w-full rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300"
                  onClick={() => onOpenChange(false)}
                >
                  Закрыть — ввод отключён
                </button>
              )}
            </div>
          ) : (
            /* ── Hint option cards ── */
            <div className="space-y-2">
              {/* Budget counter */}
              <div className="mb-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <span>Подсказок на сегодня:</span>
                <span className={cn(
                  'font-semibold tabular-nums',
                  remainingBudget > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                )}>
                  {remainingBudget}/{totalBudget}
                </span>
              </div>

              {visibleOptions.map((opt) => {
                const Icon = opt.icon;
                const disabled = isOptionDisabled(opt.type);
                const used = hintState.usedHints.has(opt.type);
                const cost = getCostLabel(opt.type, remainingBudget, disabled, hasContext, canShowNextWord);

                return (
                  <button
                    key={opt.type}
                    type="button"
                    disabled={disabled}
                    onClick={() => onRequestHint(opt.type)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      disabled
                        ? 'opacity-40 cursor-not-allowed border-border/30 bg-muted/20'
                        : opt.type === 'surrender'
                          ? 'border-rose-500/25 bg-rose-500/5 active:bg-rose-500/15'
                          : 'border-border/50 bg-background active:bg-muted/50'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        disabled
                          ? 'text-muted-foreground/40'
                          : opt.type === 'surrender'
                            ? 'text-rose-500'
                            : opt.type === 'context'
                              ? 'text-emerald-500'
                              : 'text-amber-500'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {opt.label}
                        </span>
                        {used && (
                          <span className="text-[10px] rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                            использовано
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                    <span className={cn('text-[11px] shrink-0 whitespace-nowrap', cost.color)}>
                      {cost.text}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
