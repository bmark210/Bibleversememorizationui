"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type { TrainingFontSizes } from "@/app/components/training-session/modes/useTrainingFontSize";
import type { TypeInputReadiness, TypeQuestion } from "../anchorTrainingTypes";
import { cn } from "@/app/components/ui/utils";

function sanitizeCompactInput(value: string) {
  return value.replace(/[^\p{L}\p{N}]+/gu, "").toUpperCase();
}

function trimToMaxLetters(rawValue: string, maxLetters: number) {
  let lettersSeen = 0;
  let out = "";

  for (const ch of rawValue) {
    if (!/[\p{L}\p{N}]/u.test(ch)) continue;
    if (lettersSeen >= maxLetters) break;
    lettersSeen += 1;
    out += ch;
  }

  return out;
}

/** Modes that use full textarea instead of single-line input */
const FULL_TEXT_MODES = new Set<string>([
  "skeleton-verse",
]);

type AnchorTypeModeProps = {
  fontSizes: TrainingFontSizes;
  question: TypeQuestion;
  typedAnswer: string;
  typingAttempts: number;
  canSubmitTypeAnswer: boolean;
  isCompactTypeMode: boolean;
  typeInputReadiness: TypeInputReadiness | null;
  controlsLocked: boolean;
  matchPercent: number | null;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onTypedAnswerChange: (value: string) => void;
  onTypeSubmit: () => void;
};

export function AnchorTypeMode({
  fontSizes,
  question,
  typedAnswer,
  typingAttempts,
  canSubmitTypeAnswer,
  isCompactTypeMode,
  typeInputReadiness,
  controlsLocked,
  matchPercent,
  inputRef,
  onTypedAnswerChange,
  onTypeSubmit,
}: AnchorTypeModeProps) {
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const clearShakeRef = useRef<number | null>(null);
  const [shakeInput, setShakeInput] = useState(false);
  const prevAttemptsRef = useRef(typingAttempts);

  const isFullTextMode = FULL_TEXT_MODES.has(question.modeId);

  const compactExpectedLength = useMemo(
    () =>
      isCompactTypeMode
        ? Array.from(sanitizeCompactInput(question.answerLabel)).length
        : 0,
    [isCompactTypeMode, question.answerLabel],
  );

  // Trigger shake on failed attempt
  useEffect(() => {
    if (typingAttempts > prevAttemptsRef.current && matchPercent !== null && matchPercent < 80) {
      setShakeInput(true);
      if (clearShakeRef.current) window.clearTimeout(clearShakeRef.current);
      clearShakeRef.current = window.setTimeout(() => {
        setShakeInput(false);
        clearShakeRef.current = null;
      }, 260);
    }
    prevAttemptsRef.current = typingAttempts;
  }, [typingAttempts, matchPercent]);

  useEffect(() => {
    return () => {
      if (mobileFocusTimeoutRef.current) window.clearTimeout(mobileFocusTimeoutRef.current);
      if (clearShakeRef.current) window.clearTimeout(clearShakeRef.current);
    };
  }, []);

  const handleInputFocus = () => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    if (mobileFocusTimeoutRef.current) {
      window.clearTimeout(mobileFocusTimeoutRef.current);
    }

    mobileFocusTimeoutRef.current = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({
        block: isFullTextMode ? "center" : "start",
        inline: "nearest",
        behavior: "smooth",
      });
      mobileFocusTimeoutRef.current = null;
    }, 140);
  };

  const attemptsLeft = question.maxAttempts - typingAttempts;
  const readinessPercent =
    typeInputReadiness && !typeInputReadiness.canSubmit
      ? Math.min(
          100,
          Math.round(
            (typedAnswer.trim().length /
              (typedAnswer.trim().length + typeInputReadiness.remainingChars)) *
              100,
          ),
        )
      : 100;

  // Full-text mode (skeleton-verse) — textarea like FullRecallExercise
  if (isFullTextMode) {
    return (
      <div className="space-y-2.5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onTypeSubmit();
          }}
        >
          <motion.div
            animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-gradient-to-b from-background to-muted/20 shadow-sm transition-colors focus-within:border-primary/40",
              shakeInput
                ? "border-destructive/60 bg-destructive/5"
                : "border-border/50",
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-primary/[0.03] to-transparent"
            />
            <Textarea
              ref={inputRef as RefObject<HTMLTextAreaElement>}
              value={typedAnswer}
              onChange={(event) => onTypedAnswerChange(event.target.value)}
              onFocus={handleInputFocus}
              placeholder={question.placeholder}
              rows={4}
              className="relative min-h-[clamp(6rem,18dvh,9rem)] resize-none border-0 bg-transparent p-4 leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ fontSize: `${fontSizes.base}px` }}
              disabled={controlsLocked}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canSubmitTypeAnswer) onTypeSubmit();
                }
              }}
            />
          </motion.div>

          {/* Match percent display */}
          {matchPercent !== null && (
            <div
              className={cn(
                "mt-2 rounded-xl border px-3 py-2 text-sm",
                matchPercent >= 85
                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : matchPercent >= 60
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-destructive/45 bg-destructive/10 text-destructive",
              )}
            >
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Совпадение</span>
                <span className="font-semibold tabular-nums">{matchPercent}%</span>
              </p>
            </div>
          )}

          {/* Submit button */}
          <div className="mt-2.5">
            <Button
              type="submit"
              className={cn(
                "w-full h-11 rounded-xl text-sm font-medium transition-all duration-200",
                canSubmitTypeAnswer
                  ? "bg-primary/90 text-primary-foreground shadow-sm hover:bg-primary/95"
                  : "bg-muted/50 text-muted-foreground/60 border border-border/30",
              )}
              disabled={!canSubmitTypeAnswer || controlsLocked}
            >
              {typingAttempts === 0 ? "Проверить" : "Проверить ещё раз"}
            </Button>
          </div>
        </form>

        {/* Attempts indicator */}
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: question.maxAttempts }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 w-4 rounded-full transition-colors duration-200",
                  i < typingAttempts
                    ? "bg-rose-400/50"
                    : i === typingAttempts
                      ? "bg-primary/40"
                      : "bg-foreground/[0.08]",
                )}
              />
            ))}
            <span className="ml-1 text-[11px] text-muted-foreground/60 tabular-nums">
              {attemptsLeft > 0
                ? `${attemptsLeft} ${attemptsLeft === 1 ? "попытка" : "попытки"}`
                : ""}
            </span>
          </div>
        </div>

      </div>
    );
  }

  // Compact/standard mode — single-line Input
  return (
    <div className="space-y-2.5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onTypeSubmit();
        }}
      >
        <motion.div
          animate={shakeInput ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <Input
            ref={inputRef as RefObject<HTMLInputElement>}
            value={typedAnswer}
            style={{ fontSize: `${fontSizes.base}px` }}
            onChange={(event) =>
              onTypedAnswerChange(
                isCompactTypeMode
                  ? trimToMaxLetters(
                      sanitizeCompactInput(event.target.value),
                      compactExpectedLength,
                    )
                  : event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSubmitTypeAnswer) {
                  onTypeSubmit();
                }
              }
            }}
            placeholder={question.placeholder}
            className={cn(
              "h-12 rounded-xl border-border/40 bg-card/50 pr-[6.5rem] shadow-sm backdrop-blur-sm transition-all duration-200",
              "focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/15 focus-visible:bg-card/70",
              isCompactTypeMode &&
                "font-mono uppercase tracking-[0.18em] text-center pr-[6.5rem]",
            )}
            onFocus={handleInputFocus}
            autoCapitalize={isCompactTypeMode ? "characters" : "none"}
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            disabled={controlsLocked}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              size="sm"
              className={cn(
                "rounded-lg px-3.5 text-xs font-medium transition-all duration-200",
                canSubmitTypeAnswer
                  ? "bg-primary/90 text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground/60 border border-border/30",
              )}
              disabled={!canSubmitTypeAnswer || controlsLocked}
            >
              {typingAttempts === 0 ? "Проверить" : "Ещё раз"}
            </Button>
          </div>
        </motion.div>
      </form>

      {/* Attempts and readiness indicators */}
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: question.maxAttempts }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 w-4 rounded-full transition-colors duration-200",
                i < typingAttempts
                  ? "bg-rose-400/50"
                  : i === typingAttempts
                    ? "bg-primary/40"
                    : "bg-foreground/[0.08]",
              )}
            />
          ))}
          <span className="ml-1 text-[11px] text-muted-foreground/60 tabular-nums">
            {attemptsLeft > 0
              ? `${attemptsLeft} ${attemptsLeft === 1 ? "попытка" : "попытки"}`
              : ""}
          </span>
        </div>

        {typeInputReadiness &&
          !typeInputReadiness.canSubmit &&
          typeInputReadiness.remainingChars > 0 &&
          typedAnswer.trim().length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-8 rounded-full bg-foreground/[0.06] overflow-hidden">
                <div
                  className="h-full bg-primary/30 rounded-full transition-all duration-300"
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                ещё {typeInputReadiness.remainingChars}
              </span>
            </div>
          )}
      </div>

    </div>
  );
}
