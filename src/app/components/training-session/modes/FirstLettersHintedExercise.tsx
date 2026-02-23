'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import type { Verse } from '../../../data/mockData';

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

function RatingButtons({ onRate }: { onRate: (rating: 0 | 1 | 2 | 3) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <p className="text-sm text-muted-foreground text-center">Оцените своё запоминание:</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button
          onClick={() => onRate(0)}
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          size="lg"
        >
          Забыл
        </Button>
        <Button
          onClick={() => onRate(1)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
          size="lg"
        >
          Сложно
        </Button>
        <Button
          onClick={() => onRate(2)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
          size="lg"
        >
          Норм
        </Button>
        <Button
          onClick={() => onRate(3)}
          className="bg-[#059669] hover:bg-[#047857] text-white"
          size="lg"
        >
          Отлично
        </Button>
      </div>
    </motion.div>
  );
}

export function ModeFirstLettersHintedExercise({
  verse,
  onRate,
}: FirstLettersHintedExerciseProps) {
  const [slots, setSlots] = useState<WordSlot[]>([]);
  const [choices, setChoices] = useState<LetterChoice[]>([]);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorFlashChoiceId, setErrorFlashChoiceId] = useState<string | null>(null);
  const clearFlashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const exercise = buildExercise(verse.text);
    setSlots(exercise.slots);
    setChoices(exercise.choices);
    setSelectedChoiceIds([]);
    setMistakes(0);
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

  const selectedChoices = useMemo(
    () =>
      selectedChoiceIds
        .map((id) => choiceMap.get(id))
        .filter((choice): choice is LetterChoice => Boolean(choice)),
    [selectedChoiceIds, choiceMap]
  );

  const selectedCount = selectedChoices.length;
  const totalHidden = hiddenSlots.length;
  const revealedCount = slots.length - hiddenSlots.length;
  const progress = totalHidden > 0 ? Math.round((selectedCount / totalHidden) * 100) : 0;
  const nextHiddenSlot = hiddenSlots[selectedCount] ?? null;

  const handleLetterClick = (choice: LetterChoice) => {
    if (isCompleted) return;
    if (selectedChoiceIds.includes(choice.id)) return;
    if (!nextHiddenSlot) return;

    // Duplicate letters should count as correct if the letter matches the expected one.
    if (choice.letter === nextHiddenSlot.firstLetter) {
      const next = [...selectedChoiceIds, choice.id];
      setSelectedChoiceIds(next);

      if (next.length === totalHidden) {
        setIsCompleted(true);
        toast.success('Отлично! Вы восстановили скрытые слова по первым буквам в правильной последовательности.');
      }
      return;
    }

    setMistakes((prev) => prev + 1);
    setSelectedChoiceIds([]);
    toast.error('Неверная буква. Последовательность скрытых слов сброшена, попробуйте снова.');
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
        <div className="space-y-6">
          {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Скрытых слов</div>
              <div className="text-sm font-semibold">{selectedCount} / {totalHidden}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Открыто</div>
              <div className="text-sm font-semibold">{revealedCount} слов</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Ошибки</div>
              <div className="text-sm font-semibold">{mistakes}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Готовность</div>
              <div className="text-sm font-semibold">{progress}%</div>
            </div>
          </div> */}

          {/* <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div> */}

          <div className="rounded-lg border border-border/60 bg-background p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Стих с подсказками
            </div>
            <div className="flex flex-wrap gap-1.5 leading-relaxed">
              {slots.map((slot) => {
                const hiddenIndex = hiddenSlots.findIndex((hidden) => hidden.order === slot.order);
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
                      className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-sm"
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

          <div className="rounded-lg border border-border/60 bg-background p-4 min-h-[78px]">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Собранные буквы
            </div>
            {selectedChoices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedChoices.map((choice) => (
                  <motion.span
                    key={choice.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 min-w-9 font-mono text-sm uppercase"
                  >
                    {choice.letter}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Нажмите первую букву первого скрытого слова.
              </p>
            )}
          </div>

          {!choices.every((choice) => selectedChoiceIds.includes(choice.id)) && (<div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Буквы для выбора
              </div>
              {/* {!isCompleted && nextHiddenSlot && (
                <div className="text-xs text-muted-foreground">
                  Следующая буква #{selectedCount + 1}
                </div>
              )} */}
            </div>
           <div className="flex flex-wrap gap-2">
              {choices.map((choice) => {
                const isSelected = selectedChoiceIds.includes(choice.id);
                const isError = errorFlashChoiceId === choice.id;

                if (isSelected) {
                  return null;
                }

                return (
                  <motion.div
                    key={choice.id}
                    animate={isError ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      type="button"
                      variant={isSelected ? 'secondary' : 'outline'}
                      className={`min-w-10 h-auto py-2 px-3 font-mono uppercase ${
                        isSelected ? 'opacity-70 cursor-default' : ''
                      } ${isError ? 'border-destructive text-destructive' : ''}`}
                      onClick={() => handleLetterClick(choice)}
                      disabled={isSelected || isCompleted}
                      aria-pressed={isSelected}
                    >
                      {choice.letter}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>)}

          {isCompleted && (
            <>
              {/* <div className="rounded-lg bg-muted/40 p-4 text-sm">
                <div className="text-muted-foreground mb-1">Полный стих</div>
                <p className="leading-relaxed">{verse.text}</p>
              </div> */}
              <TrainingRatingFooter><RatingButtons onRate={onRate} /></TrainingRatingFooter>
            </>
          )}
        </div>
    </motion.div>
  );
}

