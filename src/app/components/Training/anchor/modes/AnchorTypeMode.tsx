"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { QuestionBadge } from "../AnchorTrainingCardUi";
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
  question: TypeQuestion;
  typedAnswer: string;
  typingAttempts: number;
  canSubmitTypeAnswer: boolean;
  isContextPrefixTypeMode: boolean;
  typeInputReadiness: TypeInputReadiness | null;
  controlsLocked: boolean;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onTypedAnswerChange: (value: string) => void;
  onTypeSubmit: () => void;
};

export function AnchorTypeMode({
  question,
  typedAnswer,
  typingAttempts,
  canSubmitTypeAnswer,
  isContextPrefixTypeMode,
  typeInputReadiness,
  controlsLocked,
  inputRef,
  onTypedAnswerChange,
  onTypeSubmit,
}: AnchorTypeModeProps) {
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const contextPrefixExpectedLength = useMemo(
    () =>
      isContextPrefixTypeMode
        ? Array.from(sanitizeCompactInput(question.answerLabel)).length
        : 0,
    [isContextPrefixTypeMode, question.answerLabel]
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
            onChange={(event) =>
              onTypedAnswerChange(
                isContextPrefixTypeMode
                  ? trimToMaxLetters(
                      sanitizeCompactInput(event.target.value),
                      contextPrefixExpectedLength
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
              "h-12 rounded-[1.45rem] border-border/60 bg-background/88 pr-[110px] text-base transition-colors focus:border-primary/35",
              isContextPrefixTypeMode &&
                "font-mono uppercase tracking-[0.16em]"
            )}
            onFocus={handleInputFocus}
            autoCapitalize={isContextPrefixTypeMode ? "characters" : "none"}
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            disabled={controlsLocked}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl px-4 text-xs font-medium bg-primary/80 border border-border/60 text-primary-foreground"
              disabled={!canSubmitTypeAnswer || controlsLocked}
            >
              {typingAttempts === 0 ? "Проверить" : "Ещё раз"}
            </Button>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuestionBadge className="border-border/60 bg-background/82 text-foreground/68">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold tabular-nums text-primary">
            {Math.min(typingAttempts + 1, question.maxAttempts)}
          </span>
          из {question.maxAttempts} попыток
        </QuestionBadge>
        {typingAttempts > 0 && question.retryHint && (
          <p className="text-xs font-medium text-foreground/72">
            {question.retryHint}
          </p>
        )}
      </div>

      {typeInputReadiness &&
        !typeInputReadiness.canSubmit &&
        typeInputReadiness.remainingChars > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Введите ещё минимум {typeInputReadiness.remainingChars} симв. для
            проверки.
          </p>
        )}
    </div>
  );
}
