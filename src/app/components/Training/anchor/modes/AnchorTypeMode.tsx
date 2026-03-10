"use client";

import type { RefObject } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { QuestionBadge } from "../AnchorTrainingCardUi";
import type { TypeInputReadiness, TypeQuestion } from "../anchorTrainingTypes";

type AnchorTypeModeProps = {
  question: TypeQuestion;
  typedAnswer: string;
  typingAttempts: number;
  canSubmitTypeAnswer: boolean;
  isContextPrefixTypeMode: boolean;
  typeInputReadiness: TypeInputReadiness | null;
  controlsLocked: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
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
            ref={inputRef}
            value={typedAnswer}
            onChange={(event) =>
              onTypedAnswerChange(
                isContextPrefixTypeMode
                  ? event.target.value.toUpperCase()
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
            className="h-12 rounded-[1.45rem] border-border/60 bg-background/88 pr-24 text-base transition-colors focus:border-primary/35"
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
              className="h-8 rounded-xl px-4 text-xs font-medium"
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
