"use client";

import type { RefObject } from "react";
import { AnchorChoiceMode } from "./modes/AnchorChoiceMode";
import { AnchorTapMode } from "./modes/AnchorTapMode";
import { AnchorTypeMode } from "./modes/AnchorTypeMode";
import { DragReorderMode } from "./modes/interactions/DragReorderMode";
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
  isCompactTypeMode: boolean;
  typeInputReadiness: TypeInputReadiness | null;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onChoiceSelect: (value: string) => void;
  onTapSelect: (optionId: string) => void;
  onTypedAnswerChange: (value: string) => void;
  onTypeSubmit: () => void;
  onOrderSubmit: (orderedIds: string[]) => void;
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
  isCompactTypeMode,
  typeInputReadiness,
  inputRef,
  onChoiceSelect,
  onTapSelect,
  onTypedAnswerChange,
  onTypeSubmit,
  onOrderSubmit,
}: AnchorTrainingModeRendererProps) {
  if (question.interaction === "drag") {
    return (
      <DragReorderMode
        question={question}
        isAnswered={isAnswered}
        controlsLocked={controlsLocked}
        onOrderSubmit={onOrderSubmit}
      />
    );
  }

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

  return (
    <AnchorTypeMode
      question={question}
      typedAnswer={typedAnswer}
      typingAttempts={typingAttempts}
      canSubmitTypeAnswer={canSubmitTypeAnswer}
      isCompactTypeMode={isCompactTypeMode}
      typeInputReadiness={typeInputReadiness}
      controlsLocked={controlsLocked}
      inputRef={inputRef}
      onTypedAnswerChange={onTypedAnswerChange}
      onTypeSubmit={onTypeSubmit}
    />
  );
}
