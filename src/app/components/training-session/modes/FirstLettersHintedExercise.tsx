'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';

interface FirstLettersHintedExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface WordSlot {
  id: string;
  text: string;
  normalized: string;
  firstLetter: string;
  order: number;
  revealed: boolean;
}

interface LetterChoice {
  id: string;
  letter: string;
  slotOrder: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function tokenizeWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function normalizeWord(word: string) {
  const normalized = word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return normalized || word.toLowerCase();
}

function getFirstLetter(word: string) {
  const cleaned = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return (cleaned.charAt(0) || word.charAt(0) || '').toLowerCase();
}

function pickRevealedIndices(totalWords: number): Set<number> {
  if (totalWords <= 1) return new Set<number>();

  let revealCount = clamp(Math.round(totalWords * 0.4), 1, totalWords - 1);
  if (totalWords >= 6) {
    revealCount = clamp(Math.round(totalWords * 0.45), 2, totalWords - 2);
  }

  const revealed = new Set<number>();

  if (totalWords >= 3 && revealed.size < revealCount) revealed.add(0);
  if (totalWords >= 5 && revealed.size < revealCount) revealed.add(totalWords - 1);

  const candidates = Array.from({ length: totalWords }, (_, i) => i).filter(
    (i) => !revealed.has(i)
  );

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (const index of candidates) {
    if (revealed.size >= revealCount) break;
    revealed.add(index);
  }

  if (revealed.size >= totalWords) {
    revealed.delete(totalWords - 1);
  }

  return revealed;
}

function shuffleChoices(choices: LetterChoice[]) {
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const sameOrder = shuffled.every((choice, index) => choice.slotOrder === choices[index]?.slotOrder);
  if (sameOrder && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

function buildExercise(text: string) {
  const words = tokenizeWords(text);
  const revealed = pickRevealedIndices(words.length);

  const slots: WordSlot[] = words.map((word, index) => ({
    id: `${index}-${Math.random().toString(36).slice(2, 6)}`,
    text: word,
    normalized: normalizeWord(word),
    firstLetter: getFirstLetter(word),
    order: index,
    revealed: revealed.has(index),
  }));

  const hiddenChoices: LetterChoice[] = slots
    .filter((slot) => !slot.revealed)
    .map((slot) => ({
      id: `${slot.order}-${slot.firstLetter}-${Math.random().toString(36).slice(2, 6)}`,
      letter: slot.firstLetter,
      slotOrder: slot.order,
    }));

  return {
    slots,
    choices: shuffleChoices(hiddenChoices),
  };
}

export function ModeFirstLettersHintedExercise({
  verse,
  onRate,
}: FirstLettersHintedExerciseProps) {
  const MAX_MISTAKES_BEFORE_RESET = 5;
  const ratingStage = resolveTrainingRatingStage(verse.status);
  const [slots, setSlots] = useState<WordSlot[]>([]);
  const [choices, setChoices] = useState<LetterChoice[]>([]);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [mistakesSinceReset, setMistakesSinceReset] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashChoiceId, setErrorFlashChoiceId] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const exercise = buildExercise(verse.text);
    setSlots(exercise.slots);
    setChoices(exercise.choices);
    setSelectedChoiceIds([]);
    setShowHint(false);
    setMistakes(0);
    setMistakesSinceReset(0);
    setIsCompleted(false);
    setErrorFlashChoiceId(null);

    return () => {
      if (clearFlashTimeoutRef.current) {
        window.clearTimeout(clearFlashTimeoutRef.current);
        clearFlashTimeoutRef.current = null;
      }
    };
  }, [verse]);

  const hiddenSlots = useMemo(
    () => slots.filter((slot) => !slot.revealed),
    [slots]
  );

  const choiceMap = useMemo(
    () => new Map(choices.map((choice) => [choice.id, choice])),
    [choices]
  );
  const selectedChoiceIdSet = useMemo(
    () => new Set(selectedChoiceIds),
    [selectedChoiceIds]
  );

  const selectedChoices = useMemo(
    () =>
      selectedChoiceIds
        .map((id) => choiceMap.get(id))
        .filter((choice): choice is LetterChoice => Boolean(choice)),
    [selectedChoiceIds, choiceMap]
  );
  const remainingChoices = useMemo(
    () => choices.filter((choice) => !selectedChoiceIdSet.has(choice.id)),
    [choices, selectedChoiceIdSet]
  );
  const hiddenIndexByOrder = useMemo(() => {
    const map = new Map<number, number>();
    hiddenSlots.forEach((slot, index) => map.set(slot.order, index));
    return map;
  }, [hiddenSlots]);

  const selectedCount = selectedChoices.length;
  const totalHidden = hiddenSlots.length;
  const revealedCount = slots.length - hiddenSlots.length;
  const progress = totalHidden > 0 ? Math.round((selectedCount / totalHidden) * 100) : 0;
  const mistakesLeftBeforeReset = Math.max(
    0,
    MAX_MISTAKES_BEFORE_RESET - mistakesSinceReset
  );
  const isMistakeRiskHigh = mistakesLeftBeforeReset <= 2;
  const isMistakeRiskCritical = mistakesLeftBeforeReset <= 1;
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;

  const handleLetterClick = (choice: LetterChoice) => {
    if (isCompleted) return;
    if (selectedChoiceIdSet.has(choice.id)) return;
    if (!nextHiddenSlot) return;

    // Duplicate letters should count as correct if the letter matches the expected one.
    if (choice.letter === nextHiddenSlot.firstLetter) {
      const next = [...selectedChoiceIds, choice.id];
      setSelectedChoiceIds(next);

      if (next.length === totalHidden) {
        setIsCompleted(true);
        // toast.success('Отлично! Вы восстановили скрытые слова по первым буквам в правильной последовательности.');
      }
      return;
    }

    const nextMistakesSinceReset = mistakesSinceReset + 1;
    const shouldResetSequence = nextMistakesSinceReset >= MAX_MISTAKES_BEFORE_RESET;

    setMistakes((prev) => prev + 1);
    setMistakesSinceReset(shouldResetSequence ? 0 : nextMistakesSinceReset);

    if (shouldResetSequence) {
      setSelectedChoiceIds([]);
      toast.error(
        `Допущено ${MAX_MISTAKES_BEFORE_RESET} ошибок. Последовательность сброшена, попробуйте снова.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    } else {
      toast.error(
        `Неверная буква. Осталось ошибок до сброса: ${
          MAX_MISTAKES_BEFORE_RESET - nextMistakesSinceReset
        }.`,
        {
          toasterId: GALLERY_TOASTER_ID,
          size: 'compact',
        }
      );
    }

    setErrorFlashChoiceId(choice.id);

    if (clearFlashTimeoutRef.current) {
      window.clearTimeout(clearFlashTimeoutRef.current);
    }
    clearFlashTimeoutRef.current = window.setTimeout(() => {
      setErrorFlashChoiceId(null);
      clearFlashTimeoutRef.current = null;
    }, 280);
  };

  const handleUndo = () => {
    if (isCompleted || selectedChoiceIds.length === 0) return;
    setSelectedChoiceIds((prev) => prev.slice(0, -1));
  };

  const handleReset = () => {
    if (isCompleted || selectedChoiceIds.length === 0) return;
    setSelectedChoiceIds([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium mx-auto text-foreground/90">
                Восстановите скрытые слова по первым буквам
              </label>
            </div>

            {!isCompleted && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHint((prev) => !prev)}
                  aria-pressed={showHint}
                  className="gap-2 rounded-full"
                >
                  <Lightbulb className="h-4 w-4" />
                  {showHint ? 'Скрыть подсказку' : 'Подсказка'}
                </Button>
              </div>
            )}
          </div>

          {!isCompleted && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background via-muted/10 to-muted/20 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>Прогресс скрытых слов</span>
                <span className="tabular-nums">{selectedCount}/{totalHidden}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                <motion.div
                  className="h-full rounded-full bg-primary/80"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  Готово: {progress}%
                </div>
                <div className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Открыто: {revealedCount}
                </div>
                <div
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
                    isMistakeRiskCritical
                      ? 'border-destructive/45 bg-destructive/10 text-destructive'
                      : isMistakeRiskHigh
                        ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border/60 bg-background/80 text-muted-foreground'
                  }`}
                >
                  До сброса: {mistakesLeftBeforeReset}/{MAX_MISTAKES_BEFORE_RESET}
                </div>
                {mistakes > 0 && (
                  <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                    Ошибок всего: {mistakes}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/5 to-transparent"
            />
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Стих с подсказками
              </div>
              {!isCompleted && totalHidden > 0 && (
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {selectedCount}/{totalHidden}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 leading-relaxed">
              {slots.map((slot) => {
                const hiddenIndex = hiddenIndexByOrder.get(slot.order) ?? -1;
                const isHidden = hiddenIndex >= 0;
                const isFilled = isHidden && hiddenIndex < selectedCount;
                const isNext = isHidden && hiddenIndex === selectedCount && !isCompleted;

                if (slot.revealed) {
                  return (
                    <span
                      key={slot.id}
                      className="inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-sm text-emerald-700"
                    >
                      {slot.text}
                    </span>
                  );
                }

                if (isFilled) {
                  return (
                    <motion.span
                      key={slot.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-sm"
                    >
                      {slot.text}
                    </motion.span>
                  );
                }

                const minWidthPx = clamp(slot.text.length * 8, 32, 140);
                return (
                  <span
                    key={slot.id}
                    className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm ${
                      isNext
                        ? 'border-primary/40 bg-primary/5 text-primary'
                        : 'border-border/60 bg-muted/20 text-muted-foreground'
                    }`}
                    style={{ minWidth: `${minWidthPx}px` }}
                    aria-label="Скрытое слово"
                  >
                    {'•'.repeat(clamp(slot.text.length, 3, 12))}
                  </span>
                );
              })}
            </div>
          </div>

          {!isCompleted && remainingChoices.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Буквы для выбора
                </div>
                {/* <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={isCompleted || selectedChoiceIds.length === 0}
                    className="rounded-full"
                  >
                    Назад
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={isCompleted || selectedChoiceIds.length === 0}
                    className="rounded-full"
                  >
                    Сброс
                  </Button>
                </div> */}
              </div>

              <div className="flex flex-wrap gap-2">
                {remainingChoices.map((choice) => {
                  const isError = errorFlashChoiceId === choice.id;

                  return (
                    <motion.div
                      key={choice.id}
                      animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-auto min-w-10 rounded-xl px-3 py-2 font-mono uppercase transition-colors ${
                          isError
                            ? 'border-destructive text-destructive'
                            : 'border-border/70 bg-background/60 hover:border-primary/35 hover:bg-primary/5'
                        }`}
                        onClick={() => handleLetterClick(choice)}
                        disabled={isCompleted}
                        aria-pressed={false}
                      >
                        {choice.letter}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence initial={false}>
          {showHint && !isCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-background p-4"
            >
              <div className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                <p className="text-muted-foreground">
                  {verse.text.split(' ').slice(0, 2).join(' ')}...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 shadow-sm">
                <div className="mb-2 text-sm font-medium text-foreground">Полный стих</div>
                <p className="leading-relaxed text-sm sm:text-base">{verse.text}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isCompleted && (
          <TrainingRatingFooter>
            <TrainingRatingButtons
              stage={ratingStage}
              mode="first-letters"
              onRate={onRate}
            />
          </TrainingRatingFooter>
        )}
      </div>
    </motion.div>
  );
}

