'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, RotateCcw, Undo2 } from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import type { Verse } from '../../../data/mockData';

interface FirstLettersKeyboardExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expectedLetters, setExpectedLetters] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const clearShakeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const letters = tokenizeFirstLetters(verse.text);
    setExpectedLetters(letters);
    setInputValue('');
    setMistakes(0);
    setIsCompleted(false);
    setFeedback(null);
    setShakeInput(false);

    requestAnimationFrame(() => inputRef.current?.focus());

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

  const handleInputChange = (nextRaw: string) => {
    if (isCompleted) return;

    const sanitized = trimToMaxLetters(sanitizeInput(nextRaw), expectedCompact.length);
    const compact = compactLetters(sanitized);
    const expectedPrefix = expectedCompact.slice(0, compact.length);

    if (compact === expectedPrefix) {
      setInputValue(sanitized);
      setFeedback(null);

      if (compact.length === expectedCompact.length && expectedCompact.length > 0) {
        setIsCompleted(true);
        setFeedback('Отлично! Вы ввели первые буквы слов в правильной последовательности.');
      }
      return;
    }

    setMistakes((prev) => prev + 1);
    setInputValue('');
    setFeedback('Неверная буква. Ввод сброшен, попробуйте ещё раз.');
    triggerInputShake();

    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleUndo = () => {
    if (isCompleted || typedCount === 0) return;
    setInputValue((prev) => removeLastMeaningfulChar(prev));
    setFeedback(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleReset = () => {
    if (isCompleted || typedCount === 0) return;
    setInputValue('');
    setFeedback(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 sm:p-8 shadow-sm border border-border"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-primary mb-2">{verse.reference}</h2>
            <div className="text-sm text-muted-foreground">{verse.translation}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Введите первые буквы слов по порядку с клавиатуры
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>

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
                Начните вводить первые буквы слов. Пробелы можно использовать для удобства.
              </p>
            )}
          </div>

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border p-3 text-sm ${
                isCompleted
                  ? 'bg-[#059669]/10 border-[#059669]/30 text-[#047857]'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                {isCompleted ? (
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{feedback}</span>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Ввод с клавиатуры
              </div>
              <div className="text-xs text-muted-foreground">
                Пробелы игнорируются
              </div>
            </div>

            <motion.div
              animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Textarea
                ref={inputRef}
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
            </motion.div>
          </div>

          {!isCompleted ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleUndo}
                disabled={typedCount === 0}
                className="gap-2"
              >
                <Undo2 className="w-4 h-4" />
                Удалить последнюю
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={typedCount === 0}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Сбросить ввод
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted/40 p-4 text-sm">
                <div className="text-muted-foreground mb-1">Подсказка по стиху</div>
                <p className="leading-relaxed">
                  {verse.text
                    .split(/\s+/)
                    .map((word) => {
                      const clean = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
                      const first = clean.charAt(0) || '';
                      return first ? `${first.toUpperCase()}…` : word;
                    })
                    .join(' ')}
                </p>
              </div>
              <RatingButtons onRate={onRate} />
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
