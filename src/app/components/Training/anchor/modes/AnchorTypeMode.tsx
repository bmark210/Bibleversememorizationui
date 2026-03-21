"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
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

type AnchorTypeModeProps = {
  fontSizes: TrainingFontSizes;
  question: TypeQuestion;
  typedAnswer: string;
  typingAttempts: number;
  canSubmitTypeAnswer: boolean;
  isCompactTypeMode: boolean;
  typeInputReadiness: TypeInputReadiness | null;
  controlsLocked: boolean;
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
  inputRef,
  onTypedAnswerChange,
  onTypeSubmit,
}: AnchorTypeModeProps) {
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const compactExpectedLength = useMemo(
    () =>
      isCompactTypeMode
        ? Array.from(sanitizeCompactInput(question.answerLabel)).length
        : 0,
    [isCompactTypeMode, question.answerLabel]
  );

  useEffect(() => {
    return () => {
      if (mobileFocusTimeoutRef.current) {
        window.clearTimeout(mobileFocusTimeoutRef.current);
      }
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
        block: "start",
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
            ((typedAnswer.trim().length) /
              (typedAnswer.trim().length + typeInputReadiness.remainingChars)) *
              100
          )
        )
      : 100;

  return (
    <div className="space-y-2.5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onTypeSubmit();
        }}
      >
        <div className="relative">
          <Input
            ref={inputRef as RefObject<HTMLInputElement>}
            value={typedAnswer}
            style={{ fontSize: `${fontSizes.base}px` }}
            onChange={(event) =>
              onTypedAnswerChange(
                isCompactTypeMode
                  ? trimToMaxLetters(
                      sanitizeCompactInput(event.target.value),
                      compactExpectedLength
                    )
                  : event.target.value
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
                "font-mono uppercase tracking-[0.18em] text-center pr-[6.5rem]"
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
                  : "bg-muted/50 text-muted-foreground/60 border border-border/30"
              )}
              disabled={!canSubmitTypeAnswer || controlsLocked}
            >
              {typingAttempts === 0 ? "Проверить" : "Ещё раз"}
            </Button>
          </div>
        </div>
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
                    : "bg-foreground/[0.08]"
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

      {typingAttempts > 0 && question.retryHint && (
        <p className="text-xs text-foreground/55 px-0.5">
          {question.retryHint}
        </p>
      )}
    </div>
  );
}
