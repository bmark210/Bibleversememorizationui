'use client';

import { useCallback } from 'react';
import { Lightbulb, Flag } from 'lucide-react';
import { generateHintFirstWords } from './hintUtils';

// ── HintButton ──────────────────────────────────────────────────────────────

interface HintButtonProps {
  hinted: boolean;
  surrendered: boolean;
  onRequestHint: () => void;
  onSurrender: () => void;
}

export function HintButton({
  hinted,
  surrendered,
  onRequestHint,
  onSurrender,
}: HintButtonProps) {
  const handleClick = useCallback(() => {
    if (surrendered) return;
    if (!hinted) {
      onRequestHint();
    } else {
      onSurrender();
    }
  }, [hinted, surrendered, onRequestHint, onSurrender]);

  if (surrendered) return null;

  if (!hinted) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors bg-amber-500/15 text-amber-600 dark:text-amber-400 active:bg-amber-500/25"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Подсказка
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors bg-rose-500/15 text-rose-600 dark:text-rose-400 active:bg-rose-500/25"
    >
      <Flag className="h-3.5 w-3.5" />
      Сдаюсь
    </button>
  );
}

// ── HintContent ─────────────────────────────────────────────────────────────

interface HintContentProps {
  verseText: string;
  hinted: boolean;
  surrendered: boolean;
}

export function HintContent({ verseText, hinted, surrendered }: HintContentProps) {
  if (!hinted && !surrendered) return null;

  if (surrendered) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-relaxed">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Полный текст
        </p>
        <p className="font-medium text-rose-800 dark:text-rose-200">{verseText}</p>
      </div>
    );
  }

  const hintText = generateHintFirstWords(verseText);
  if (!hintText) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Подсказка — Начало стиха
      </p>
      <p className="font-medium text-amber-800 dark:text-amber-200">{hintText}</p>
    </div>
  );
}
