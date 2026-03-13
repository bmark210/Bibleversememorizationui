'use client';

import { useCallback } from 'react';
import { Lightbulb } from 'lucide-react';
import { generateHintText, type HintLevel, HINT_LEVEL_MAX } from './hintUtils';

interface HintButtonProps {
  isReview: boolean;
  hintLevel: HintLevel;
  onRequestHint: () => void;
  onHintUsed: () => void;
}

export function HintButton({
  isReview,
  hintLevel,
  onRequestHint,
  onHintUsed,
}: HintButtonProps) {
  const handleClick = useCallback(() => {
    if (hintLevel >= HINT_LEVEL_MAX) return;
    onRequestHint();
    onHintUsed();
  }, [hintLevel, onRequestHint, onHintUsed]);

  if (!isReview) return null;

  const isMaxLevel = hintLevel >= HINT_LEVEL_MAX;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isMaxLevel}
      className={`
        flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
        transition-colors
        ${isMaxLevel
          ? 'bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 active:bg-amber-500/25'
        }
      `}
    >
      <Lightbulb className="h-3.5 w-3.5" />
      {hintLevel === 0 ? 'Подсказка' : `Подсказка ${hintLevel}/${HINT_LEVEL_MAX}`}
    </button>
  );
}

interface HintContentProps {
  verseText: string;
  hintLevel: HintLevel;
}

export function HintContent({ verseText, hintLevel }: HintContentProps) {
  if (hintLevel === 0) return null;

  const hintText = generateHintText(verseText, hintLevel);
  if (!hintText) return null;

  const levelLabel =
    hintLevel === 1
      ? 'Первые буквы'
      : hintLevel === 2
        ? 'Начало стиха'
        : 'Полный текст';

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Подсказка {hintLevel}/{HINT_LEVEL_MAX} — {levelLabel}
      </p>
      <p className="font-medium text-amber-800 dark:text-amber-200">{hintText}</p>
      {hintLevel < HINT_LEVEL_MAX && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Подсказка снизит оценку
        </p>
      )}
    </div>
  );
}

interface ReviewHintProps {
  verseText: string;
  isReview: boolean;
  onHintUsed: () => void;
  hintLevel: HintLevel;
  onRequestHint: () => void;
}

export function ReviewHint({
  verseText,
  isReview,
  onHintUsed,
  hintLevel,
  onRequestHint,
}: ReviewHintProps) {
  const handleClick = useCallback(() => {
    if (hintLevel >= HINT_LEVEL_MAX) return;
    onRequestHint();
    onHintUsed();
  }, [hintLevel, onRequestHint, onHintUsed]);

  if (!isReview) return null;

  const isMaxLevel = hintLevel >= HINT_LEVEL_MAX;
  const hintText = generateHintText(verseText, hintLevel);

  const levelLabel =
    hintLevel === 1
      ? 'Первые буквы'
      : hintLevel === 2
        ? 'Начало стиха'
        : 'Полный текст';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isMaxLevel}
        className={`
          flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
          transition-colors
          ${isMaxLevel
            ? 'bg-muted text-muted-foreground/50 cursor-not-allowed opacity-50'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 active:bg-amber-500/25'
          }
        `}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        {hintLevel === 0 ? 'Подсказка' : `Подсказка ${hintLevel}/${HINT_LEVEL_MAX}`}
      </button>

      {hintLevel > 0 && hintText && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Подсказка {hintLevel}/{HINT_LEVEL_MAX} — {levelLabel}
          </p>
          <p className="font-medium text-amber-800 dark:text-amber-200">{hintText}</p>
          {hintLevel < HINT_LEVEL_MAX && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Подсказка снизит оценку
            </p>
          )}
        </div>
      )}
    </div>
  );
}
