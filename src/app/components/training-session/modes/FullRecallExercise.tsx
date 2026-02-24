'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { AnimatePresence, motion } from 'motion/react';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import { useIsMobile } from '../../ui/use-mobile';
import {
  MobileRuKeyboardOverlay,
  MOBILE_RU_KEYBOARD_OVERLAY_SPACER_HEIGHT,
} from './MobileRuKeyboardOverlay';
import { Verse } from '../../../data/mockData';
import { TRAINING_STAGE_MASTERY_MAX } from '@/shared/training/constants';
import {
  applyMobileFullRecallKey,
  normalizeComparableText,
  tokenizeComparableWords,
} from '@/shared/training/fullRecallTypingAssist';

interface TypingModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

function RatingButtons({ verse, onRate }: { verse: Verse, onRate: (rating: 0 | 1 | 2 | 3) => void }) {
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
          Повторить
        </Button>
        {/* <Button
          onClick={() => onRate(2)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
          size="lg"
        >
          Норм
        </Button> */}
        <Button
          onClick={() => onRate(verse.masteryLevel >= TRAINING_STAGE_MASTERY_MAX ? 3 : 2)}
          className="bg-[#059669] hover:bg-[#047857] text-white"
          size="lg"
        >
          Завершить стих
        </Button>
      </div>
    </motion.div>
  );
}

export function ModeFullRecallExercise({ verse, onRate }: TypingModeProps) {
  const MOBILE_HARD_ERROR_RESET_THRESHOLD = 7;
  const isMobile = useIsMobile();
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const [mobileTypingFeedback, setMobileTypingFeedback] = useState<string | null>(null);
  const [mobileHardErrorCount, setMobileHardErrorCount] = useState(0);
  const clearShakeTimeoutRef = useRef<number | null>(null);
  const clearFeedbackTimeoutRef = useRef<number | null>(null);

  const targetComparableWords = useMemo(
    () => tokenizeComparableWords(verse.text),
    [verse.text]
  );
  const targetComparableText = useMemo(
    () => normalizeComparableText(verse.text),
    [verse.text]
  );

  useEffect(() => {
    setUserInput('');
    setShowHint(false);
    setIsChecked(false);
    setShakeInput(false);
    setMobileTypingFeedback(null);
    setMobileHardErrorCount(0);

    return () => {
      if (clearShakeTimeoutRef.current) {
        window.clearTimeout(clearShakeTimeoutRef.current);
        clearShakeTimeoutRef.current = null;
      }
      if (clearFeedbackTimeoutRef.current) {
        window.clearTimeout(clearFeedbackTimeoutRef.current);
        clearFeedbackTimeoutRef.current = null;
      }
    };
  }, [verse.id, verse.text]);

  const triggerMobileInputShake = () => {
    setShakeInput(true);
    if (clearShakeTimeoutRef.current) {
      window.clearTimeout(clearShakeTimeoutRef.current);
    }
    clearShakeTimeoutRef.current = window.setTimeout(() => {
      setShakeInput(false);
      clearShakeTimeoutRef.current = null;
    }, 220);
  };

  const setTransientMobileFeedback = (message: string | null) => {
    setMobileTypingFeedback(message);
    if (clearFeedbackTimeoutRef.current) {
      window.clearTimeout(clearFeedbackTimeoutRef.current);
      clearFeedbackTimeoutRef.current = null;
    }

    if (!message) return;
    clearFeedbackTimeoutRef.current = window.setTimeout(() => {
      setMobileTypingFeedback(null);
      clearFeedbackTimeoutRef.current = null;
    }, 1200);
  };

  const triggerTypingHaptic = (kind: 'light' | 'warning' = 'light') => {
    if (typeof window === 'undefined') return;

    try {
      const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
      if (kind === 'warning' && tg?.notificationOccurred) {
        tg.notificationOccurred('warning');
        return;
      }
      if (tg?.impactOccurred) {
        tg.impactOccurred(kind === 'warning' ? 'medium' : 'light');
        return;
      }
    } catch {
      // continue to browser fallback
    }

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(kind === 'warning' ? 18 : 10);
      }
    } catch {
      // ignore unsupported vibration
    }
  };

  const registerHardMismatch = (feedback: string) => {
    const nextErrorCount = mobileHardErrorCount + 1;
    const shouldResetInput = nextErrorCount >= MOBILE_HARD_ERROR_RESET_THRESHOLD;

    setMobileHardErrorCount(shouldResetInput ? 0 : nextErrorCount);
    setTransientMobileFeedback(
      shouldResetInput ? 'Слишком много ошибок — ввод сброшен' : feedback
    );

    if (shouldResetInput) {
      setUserInput('');
    }

    triggerMobileInputShake();
    triggerTypingHaptic('warning');
  };

  const handleMobileKeyPress = (letter: string) => {
    if (isChecked) return;
    const result = applyMobileFullRecallKey({
      userInput,
      key: letter,
      targetWords: targetComparableWords,
      minAutocompletePrefixLength: 3,
    });

    if (result.kind === 'accepted' || result.kind === 'accepted_autocomplete') {
      setUserInput(result.nextInput);
      setTransientMobileFeedback(null);
      return;
    }

    if (result.kind !== 'hard_mismatch') return;

    registerHardMismatch('Промах — попробуйте ещё');
  };

  const isInputComplete = useMemo(() => {
    if (!targetComparableText) return false;
    return normalizeComparableText(userInput) === targetComparableText;
  }, [userInput, targetComparableText]);

  useEffect(() => {
    if (!isChecked && isInputComplete) {
      setIsChecked(true);
    }
  }, [isChecked, isInputComplete]);

  const isMobileKeyboardVisible = Boolean(isMobile && !isChecked);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
        <div className="space-y-4">
          <div className="space-y-3 mb-2">
            <div className="flex flex-col gap-3">
              <div className="space-y-1 text-center">
                <label className="text-sm font-medium text-foreground">
                  Напечатайте стих по памяти
                </label>
              </div>

              {!isChecked && (
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

            {!isMobile ? (
              <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-2 shadow-sm">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Начните печатать..."
                  rows={6}
                  className="min-h-[184px] resize-none border-0 bg-transparent p-4 text-base leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isChecked}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <motion.div
                  animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-4 min-h-[128px] shadow-sm ${
                    shakeInput ? 'border-destructive/60 bg-destructive/5' : ''
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/5 to-transparent"
                  />
                  <div className="relative">
                    {userInput.trim().length > 0 ? (
                      <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                        {userInput}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Ввод появится здесь
                      </p>
                    )}
                  </div>
                </motion.div>

                {!isChecked && (
                  <div className="flex flex-wrap items-center gap-2">
                    <AnimatePresence initial={false}>
                      {mobileTypingFeedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary"
                        >
                          {mobileTypingFeedback}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {mobileHardErrorCount > 0 && (
                      <div className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                        Ошибок: {mobileHardErrorCount}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showHint && !isChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden rounded-2xl m-0 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-background p-4"
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

          {isChecked && (
            <TrainingRatingFooter>
              <RatingButtons verse={verse} onRate={onRate} />
            </TrainingRatingFooter>
          )}

          {isMobile && (
            <div
              aria-hidden="true"
              className="md:hidden pointer-events-none"
              style={{
                height: isMobileKeyboardVisible
                  ? MOBILE_RU_KEYBOARD_OVERLAY_SPACER_HEIGHT
                  : '0px',
                transition: 'height 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                willChange: 'height',
              }}
            />
          )}
        </div>

      <MobileRuKeyboardOverlay
        open={isMobileKeyboardVisible}
        disabled={isChecked}
        onKeyPress={handleMobileKeyPress}
      />
    </motion.div>
  );
}
