'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Button } from '../../ui/button';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import { Textarea } from '../../ui/textarea';
import { useIsMobile } from '../../ui/use-mobile';
import type { Verse } from '../../../data/mockData';

interface FirstLettersKeyboardExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

const MOBILE_RU_KEYBOARD_ROWS: string[][] = [
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
];

function tokenizeFirstLetters(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => {
      const cleaned = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      return (cleaned.charAt(0) || word.charAt(0) || '').toLowerCase();
    })
    .filter(Boolean);
}

function sanitizeInput(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .replace(/[ \t]+/g, ' ');
}

function compactLetters(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function trimToMaxLetters(rawValue: string, maxLetters: number) {
  let lettersSeen = 0;
  let out = '';
  for (const ch of rawValue) {
    const isLetterLike = /[\p{L}\p{N}]/u.test(ch);
    if (isLetterLike) {
      if (lettersSeen >= maxLetters) break;
      lettersSeen += 1;
      out += ch;
      continue;
    }
    if (/\s/u.test(ch)) {
      out += ch;
    }
  }
  return out;
}

function removeLastMeaningfulChar(rawValue: string) {
  if (!rawValue) return '';
  let chars = Array.from(rawValue);
  while (chars.length > 0 && /\s/u.test(chars[chars.length - 1] ?? '')) {
    chars.pop();
  }
  if (chars.length > 0) {
    chars.pop();
  }
  return chars.join('');
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

export function ModeFirstLettersKeyboardExercise({
  verse,
  onRate,
}: FirstLettersKeyboardExerciseProps) {
  const isMobile = useIsMobile();
  const [expectedLetters, setExpectedLetters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const clearShakeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setExpectedLetters(letters);
    setInputValue('');
    setMistakes(0);
    setIsCompleted(false);
    setShakeInput(false);

    return () => {
      if (clearShakeTimeoutRef.current) {
        window.clearTimeout(clearShakeTimeoutRef.current);
        clearShakeTimeoutRef.current = null;
      }
    };
  }, [verse]);

  const expectedCompact = useMemo(
    () => expectedLetters.join(''),
    [expectedLetters]
  );

  const typedCompact = useMemo(
    () => compactLetters(inputValue),
    [inputValue]
  );

  const typedLettersList = useMemo(
    () => Array.from(typedCompact),
    [typedCompact]
  );

  const total = expectedLetters.length;
  const typedCount = typedLettersList.length;
  const progress = total > 0 ? Math.round((typedCount / total) * 100) : 0;
  const nextIndex = Math.min(typedCount + 1, total);

  const triggerInputShake = () => {
    setShakeInput(true);
    if (clearShakeTimeoutRef.current) {
      window.clearTimeout(clearShakeTimeoutRef.current);
    }
    clearShakeTimeoutRef.current = window.setTimeout(() => {
      setShakeInput(false);
      clearShakeTimeoutRef.current = null;
    }, 280);
  };

  const applyNextInputValue = (nextRaw: string) => {
    if (isCompleted) return;

    const sanitized = trimToMaxLetters(sanitizeInput(nextRaw), expectedCompact.length);
    const compact = compactLetters(sanitized);
    const expectedPrefix = expectedCompact.slice(0, compact.length);

    if (compact === expectedPrefix) {
      setInputValue(sanitized);

      if (compact.length === expectedCompact.length && expectedCompact.length > 0) {
        setIsCompleted(true);
        toast.success('Отлично! Вы ввели первые буквы слов в правильной последовательности.');
      }
      return;
    }

    setMistakes((prev) => prev + 1);
    setInputValue('');
    toast.error('Неверная буква. Ввод сброшен, попробуйте ещё раз.');
    triggerInputShake();
  };

  const handleInputChange = (nextRaw: string) => {
    applyNextInputValue(nextRaw);
  };

  const handleUndo = () => {
    if (isCompleted || typedCount === 0) return;
    setInputValue((prev) => removeLastMeaningfulChar(prev));
  };

  const handleReset = () => {
    if (isCompleted || typedCount === 0) return;
    setInputValue('');
  };

  const handleMobileKeyPress = (letter: string) => {
    if (isCompleted) return;
    applyNextInputValue(`${inputValue}${letter}`);
  };

  const handleMobileBackspace = () => {
    handleUndo();
  };

  const handleMobileReset = () => {
    handleReset();
  };

  const handleMobileSpace = () => {
    if (isCompleted) return;
    applyNextInputValue(`${inputValue} `);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
        <div className="space-y-4">
          {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Прогресс</div>
              <div className="text-sm font-semibold">{typedCount} / {total}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Следующее</div>
              <div className="text-sm font-semibold">Буква #{nextIndex}</div>
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

          <div className="rounded-lg border border-border/60 bg-background p-4 min-h-[84px]">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Введённые буквы
            </div>
            {typedLettersList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {typedLettersList.map((letter, index) => (
                  <motion.span
                    key={`${letter}-${index}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 min-w-9 font-mono text-sm uppercase"
                  >
                    {letter}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Начните вводить первые буквы слов.
              </p>
            )}
          </div>

          {!isCompleted && <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Ввод с клавиатуры
              </div>
            </div>

            <motion.div
              animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {!isMobile ? (
                <Textarea
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Введите первые буквы слов..."
                  disabled={isCompleted}
                  className={`min-h-24 font-mono text-base tracking-[0.16em] uppercase ${
                    shakeInput ? 'border-destructive text-destructive' : ''
                  }`}
                  aria-label="Поле ввода первых букв"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              ) : (
                <div
                  className={`rounded-lg border border-border/60 bg-background p-4 text-left ${
                    shakeInput ? 'border-destructive/60 bg-destructive/5 text-destructive' : ''
                  }`}
                  aria-label="Ввод через экранную клавиатуру"
                >
                  <div className="text-sm font-medium">
                    Используйте экранную клавиатуру ниже
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Нажимайте первые буквы слов по порядку
                  </div>
                </div>
              )}
            </motion.div>
          </div>}

          {isMobile && !isCompleted && (
            <div
              aria-hidden="true"
              className="md:hidden"
              style={{ height: 'calc(17rem + env(safe-area-inset-bottom, 0px))' }}
            />
          )}

          {isCompleted && (
            <>
              <div className="rounded-lg bg-muted/40 p-4 text-sm">
                <div className="text-muted-foreground mb-1">Полный стих</div>
                <p className="leading-relaxed">
                  {verse.text}
                </p>
              </div>
              <TrainingRatingFooter><RatingButtons onRate={onRate} /></TrainingRatingFooter>
            </>
          )}
        </div>

      {isMobile && !isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-[70] border-t border-border backdrop-blur-xl bg-card/90"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="w-full p-2 pt-2.5 space-y-2">
            <div className="space-y-1.5">
              {MOBILE_RU_KEYBOARD_ROWS.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className={
                    rowIndex === 0
                      ? 'grid gap-1 px-0.5'
                      : rowIndex === 1
                        ? 'grid gap-1 px-3'
                        : 'grid gap-1 px-7'
                  }
                  style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
                >
                  {row.map((letter) => (
                    <Button
                      key={letter}
                      type="button"
                      variant="outline"
                      className="h-10 min-w-0 px-0 font-mono text-[13px] uppercase rounded-md"
                      onClick={() => handleMobileKeyPress(letter)}
                      disabled={isCompleted}
                      aria-label={`Ввести букву ${letter.toUpperCase()}`}
                    >
                      {letter.toUpperCase()}
                    </Button>
                  ))}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1fr_2fr_1fr] gap-2 px-1">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg"
                onClick={handleMobileBackspace}
                disabled={typedCount === 0}
                aria-label="Удалить последний символ"
              >
                ⌫
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-lg"
                onClick={handleMobileSpace}
                disabled={isCompleted}
                aria-label="Пробел"
              >
                Пробел
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-lg"
                onClick={handleMobileReset}
                disabled={typedCount === 0}
                aria-label="Сбросить ввод"
              >
                Сброс
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

