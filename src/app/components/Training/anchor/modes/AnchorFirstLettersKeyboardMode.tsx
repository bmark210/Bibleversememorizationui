"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { QuestionBadge } from "../AnchorTrainingCardUi";
import type { TypeQuestion } from "../anchorTrainingTypes";
import { Input } from "@/app/components/ui/input";

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

type AnchorFirstLettersKeyboardModeProps = {
  question: TypeQuestion;
  typedAnswer: string;
  typingAttempts: number;
  canSubmitTypeAnswer: boolean;
  controlsLocked: boolean;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onTypedAnswerChange: (value: string) => void;
  onTypeSubmit: () => void;
};

export function AnchorFirstLettersKeyboardMode({
  question,
  typedAnswer,
  typingAttempts,
  canSubmitTypeAnswer,
  controlsLocked,
  inputRef,
  onTypedAnswerChange,
  onTypeSubmit,
}: AnchorFirstLettersKeyboardModeProps) {
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const expectedLength = useMemo(
    () => Array.from(sanitizeCompactInput(question.answerLabel)).length,
    [question.answerLabel]
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

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary/5 to-transparent"
        />
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          value={typedAnswer}
          onChange={(event) =>
            onTypedAnswerChange(
              trimToMaxLetters(
                sanitizeCompactInput(event.target.value),
                expectedLength
              )
            )
          }
          onFocus={handleInputFocus}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSubmitTypeAnswer) {
                onTypeSubmit();
              }
            }
          }}
          placeholder={question.placeholder}
          disabled={controlsLocked}
          className="relative resize-none border-0 bg-transparent p-4 font-mono text-base uppercase tracking-[0.16em] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuestionBadge className="border-border/60 bg-background/82 text-foreground/68">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold tabular-nums text-primary">
            {Math.min(typingAttempts + 1, question.maxAttempts)}
          </span>
          из {question.maxAttempts} попыток
        </QuestionBadge>
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-xl px-4 text-xs font-medium text-foreground/60 border border-border/60 bg-background/80 hover:border-primary/35"
          disabled={!canSubmitTypeAnswer || controlsLocked}
          onClick={onTypeSubmit}
        >
          {typingAttempts === 0 ? "Проверить" : "Ещё раз"}
        </Button>
      </div>

      {question.retryHint && (
        <p className="text-xs font-medium text-foreground/72">
          {question.retryHint}
        </p>
      )}
    </div>
  );
}
