"use client";

import type { RefObject } from "react";
import { AnchorFirstLettersKeyboardMode } from "./modes/AnchorFirstLettersKeyboardMode";
import { AnchorChoiceMode } from "./modes/AnchorChoiceMode";
import { AnchorTapMode } from "./modes/AnchorTapMode";
import { AnchorTypeMode } from "./modes/AnchorTypeMode";
import type {
  TrainerQuestion,
  TypeInputReadiness,
} from "./anchorTrainingTypes";

type AnchorTrainingModeRendererProps = {
  question: TrainerQuestion;
  selectedOption: string | null;
  isAnswered: boolean;
  controlsLocked: boolean;
  tapSequence: string[];
  selectedTapLabels: string[];
  typedAnswer: string;
  typingAttempts: number;
  canSubmitTypeAnswer: boolean;
  isContextPrefixTypeMode: boolean;
  typeInputReadiness: TypeInputReadiness | null;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onChoiceSelect: (value: string) => void;
  onTapSelect: (optionId: string) => void;
  onTypedAnswerChange: (value: string) => void;
  onTypeSubmit: () => void;
};

export function AnchorTrainingModeRenderer({
  question,
  selectedOption,
  isAnswered,
  controlsLocked,
  tapSequence,
  selectedTapLabels,
  typedAnswer,
  typingAttempts,
  canSubmitTypeAnswer,
  isContextPrefixTypeMode,
  typeInputReadiness,
  inputRef,
  onChoiceSelect,
  onTapSelect,
  onTypedAnswerChange,
  onTypeSubmit,
}: AnchorTrainingModeRendererProps) {
  if (question.interaction === "choice") {
    return (
      <AnchorChoiceMode
        question={question}
        selectedOption={selectedOption}
        isAnswered={isAnswered}
        controlsLocked={controlsLocked}
        onChoiceSelect={onChoiceSelect}
      />
    );
  }

  if (question.interaction === "tap") {
    return (
      <AnchorTapMode
        question={question}
        tapSequence={tapSequence}
        selectedTapLabels={selectedTapLabels}
        isAnswered={isAnswered}
        controlsLocked={controlsLocked}
        onTapSelect={onTapSelect}
      />
    );
  }

  if (question.modeId === "context-prefix-type") {
    return (
      <AnchorFirstLettersKeyboardMode
        question={question}
        typedAnswer={typedAnswer}
        typingAttempts={typingAttempts}
        canSubmitTypeAnswer={canSubmitTypeAnswer}
        controlsLocked={controlsLocked}
        inputRef={inputRef}
        onTypedAnswerChange={onTypedAnswerChange}
        onTypeSubmit={onTypeSubmit}
      />
    );
  }

  return (
    <AnchorTypeMode
      question={question}
      typedAnswer={typedAnswer}
      typingAttempts={typingAttempts}
      canSubmitTypeAnswer={canSubmitTypeAnswer}
      isContextPrefixTypeMode={isContextPrefixTypeMode}
      typeInputReadiness={typeInputReadiness}
      controlsLocked={controlsLocked}
      inputRef={inputRef}
      onTypedAnswerChange={onTypedAnswerChange}
      onTypeSubmit={onTypeSubmit}
    />
  );
}
