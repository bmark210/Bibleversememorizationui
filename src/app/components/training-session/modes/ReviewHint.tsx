'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { generateHintText, type HintLevel, HINT_LEVEL_MAX } from './hintUtils';

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
  const [showPopup, setShowPopup] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (hintLevel >= HINT_LEVEL_MAX) return;

    onRequestHint();
    onHintUsed();
    setShowPopup(true);
  }, [hintLevel, onRequestHint, onHintUsed]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (showPopup && hintLevel < 3) {
      timerRef.current = setTimeout(() => setShowPopup(false), 5000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showPopup, hintLevel]);

  if (!isReview) return null;

  const hintText = generateHintText(verseText, hintLevel);
  const isMaxLevel = hintLevel >= HINT_LEVEL_MAX;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={isMaxLevel}
        className={`
          flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
          transition-colors
          ${isMaxLevel
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : 'bg-amber-500/15 text-amber-400 active:bg-amber-500/25'
          }
        `}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        {hintLevel === 0 ? 'Подсказка' : `Подсказка ${hintLevel}/${HINT_LEVEL_MAX}`}
      </button>

      {showPopup && hintText && (
        <div
          role="tooltip"
          onClick={() => setShowPopup(false)}
          className={`
            absolute left-0 right-0 top-full z-10 mt-2 rounded-xl
            px-4 py-3 text-sm leading-relaxed
            animate-in fade-in slide-in-from-top-1 duration-200
            ${hintLevel >= 3
              ? 'bg-rose-500/15 text-rose-200 border border-rose-500/20'
              : 'bg-amber-500/15 text-amber-100 border border-amber-500/20'
            }
          `}
        >
          {hintLevel === 1 && (
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Первые буквы
            </p>
          )}
          {hintLevel === 2 && (
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Начало стиха
            </p>
          )}
          {hintLevel >= 3 && (
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Полный текст
            </p>
          )}
          <p className="font-medium">{hintText}</p>
          {hintLevel === 1 && !isMaxLevel && (
            <p className="mt-1.5 text-[10px] text-white/30">
              Подсказка снизит оценку
            </p>
          )}
        </div>
      )}
    </div>
  );
}
