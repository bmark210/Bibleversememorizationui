"use client";

import type { ReactNode, RefObject } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { AnchorTrainingModeRenderer } from "./AnchorTrainingModeRenderer";
import { QuestionBadge, SurfacePanel } from "./AnchorTrainingCardUi";
import {
  getSummaryLabel,
  TRACK_ACCENTS,
  TRACK_LABELS,
  type TrackAccent,
} from "./anchorTrainingTrackMeta";
import type {
  SessionTrack,
  TrackStat,
  TrainerQuestion,
  TypeInputReadiness,
} from "./anchorTrainingTypes";

type AnchorTrainingQuestionCardProps = {
  question: TrainerQuestion;
  sessionTrack: SessionTrack;
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
  lastAnswerCorrect: boolean | null;
  lastAnswerUsedTolerance: boolean;
  lastAnswerForgotten: boolean;
  revealedVerseText: string;
  showContinueButton: boolean;
  onChoiceSelect: (value: string) => void;
  onTapSelect: (optionId: string) => void;
  onTypedAnswerChange: (value: string) => void;
  onTypeSubmit: () => void;
  onContinue: () => void;
};

type AnchorTrainingSummaryCardProps = {
  resultPercent: number;
  correctCount: number;
  totalCount: number;
  referenceStats: TrackStat;
  incipitStats: TrackStat;
  endingStats: TrackStat;
  contextStats: TrackStat;
  caption: string;
  isSavingSession: boolean;
  saveSucceeded: boolean;
  saveErrorMessage: string | null;
  selectedTrack: SessionTrack;
};

type AnchorTrainingStateCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  visual?: "loading";
};

function getResultTheme(isCorrect: boolean | null) {
  if (isCorrect) {
    return {
      panelClassName:
        "border-emerald-500/24 bg-emerald-500/[0.07]",
      iconWrapClassName: "bg-emerald-500/14 text-emerald-600",
      titleClassName: "text-emerald-800 dark:text-emerald-300",
    };
  }

  return {
    panelClassName:
      "border-rose-500/24 bg-rose-500/[0.07]",
    iconWrapClassName: "bg-rose-500/14 text-rose-600",
    titleClassName: "text-rose-700 dark:text-rose-300",
  };
}

function LoadingPlaceholder({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-full bg-gradient-to-r from-border/45 via-primary/[0.14] to-border/45 animate-pulse",
        className
      )}
    />
  );
}

function AnchorTrainingLoadingVisual() {
  const loadingDots = [
    { className: "bg-primary/70", delayMs: 0 },
    { className: "bg-primary/80", delayMs: 160 },
    { className: "bg-primary/70", delayMs: 320 },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="rounded-[2rem] border border-border/55 bg-background/72 p-4 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-5">
        <div className="flex items-center justify-center gap-2.5">
          {loadingDots.map((dot) => (
            <span
              key={dot.className}
              className={cn("h-2 w-2 rounded-full animate-pulse", dot.className)}
              style={{ animationDelay: `${dot.delayMs}ms` }}
            />
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-[1.5rem] border border-border/50 bg-background/90 px-4 py-4">
            <LoadingPlaceholder className="mx-auto h-2.5 w-16" />
            <LoadingPlaceholder className="mx-auto mt-3 h-3 w-full max-w-[13.5rem]" />
            <LoadingPlaceholder className="mx-auto mt-2 h-3 w-4/5 max-w-[11.5rem]" />
          </div>

          <div className="space-y-2">
            <LoadingPlaceholder className="mx-auto h-2.5 w-3/4" />
            <LoadingPlaceholder className="mx-auto h-2.5 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnchorTrainingQuestionCard({
  question,
  sessionTrack,
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
  lastAnswerCorrect,
  lastAnswerUsedTolerance,
  lastAnswerForgotten,
  revealedVerseText,
  showContinueButton,
  onChoiceSelect,
  onTapSelect,
  onTypedAnswerChange,
  onTypeSubmit,
  onContinue,
}: AnchorTrainingQuestionCardProps) {
  const questionAccent = TRACK_ACCENTS[question.track];
  const resultTheme = getResultTheme(lastAnswerCorrect);
  const shouldPinTypeInputToTop =
    question.interaction === "type" && !isAnswered;
  const modeRenderer =
    question.interaction !== "type" || !isAnswered ? (
      <AnchorTrainingModeRenderer
        question={question}
        selectedOption={selectedOption}
        isAnswered={isAnswered}
        controlsLocked={controlsLocked}
        tapSequence={tapSequence}
        selectedTapLabels={selectedTapLabels}
        typedAnswer={typedAnswer}
        typingAttempts={typingAttempts}
        canSubmitTypeAnswer={canSubmitTypeAnswer}
        isCompactTypeMode={isCompactTypeMode}
        typeInputReadiness={typeInputReadiness}
        inputRef={inputRef}
        onChoiceSelect={onChoiceSelect}
        onTapSelect={onTapSelect}
        onTypedAnswerChange={onTypedAnswerChange}
        onTypeSubmit={onTypeSubmit}
      />
    ) : null;

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      {/* Header: track badge + mode hint */}
      <div className="shrink-0 pb-3 space-y-3 text-center">
        {sessionTrack === "mixed" && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <QuestionBadge className={questionAccent.badgeClassName}>
              <span
                aria-hidden="true"
                className={cn("h-1.5 w-1.5 rounded-full", questionAccent.dotClassName)}
              />
              {TRACK_LABELS[question.track]}
            </QuestionBadge>
          </div>
        )}
        <p className="text-sm leading-relaxed text-foreground/66">
          {question.modeHint}
        </p>
      </div>

      {/* Body: scrollable question content */}
      <ScrollShadowContainer className="flex-1">
        <div className="space-y-5">
          {shouldPinTypeInputToTop ? modeRenderer : null}

          <div className="rounded-[1.85rem] border border-border/60 bg-background/90 px-4 py-5 sm:px-6 sm:py-6">
            <p className="whitespace-pre-line text-center font-serif italic text-[1.02rem] leading-relaxed text-primary/90 sm:text-[1.1rem]">
              {question.prompt}
            </p>
          </div>

          {!shouldPinTypeInputToTop ? modeRenderer : null}
        </div>

        {/* Result footer inline */}
        {isAnswered && (
          <div className="mt-4">
            <SurfacePanel className={cn("px-4 py-4", resultTheme.panelClassName)}>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    resultTheme.iconWrapClassName
                  )}
                >
                  {lastAnswerCorrect ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", resultTheme.titleClassName)}>
                    {lastAnswerForgotten
                      ? "Ответ открыт"
                      : lastAnswerCorrect
                        ? lastAnswerUsedTolerance
                          ? "Зачтено с небольшой ошибкой"
                          : "Ответ верный"
                        : "Нужно повторить"}
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">Стих:</p>
                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-foreground/78">
                    {revealedVerseText}
                  </p>
                  {showContinueButton && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        className="rounded-full px-5 text-foreground/60 bg-background/80 border border-border"
                        onClick={onContinue}
                      >
                        Продолжить
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SurfacePanel>
          </div>
        )}
      </ScrollShadowContainer>
    </div>
  );
}

export function AnchorTrainingSummaryCard({
  resultPercent,
  correctCount,
  totalCount,
  referenceStats,
  incipitStats,
  endingStats,
  contextStats,
  caption,
  isSavingSession,
  saveSucceeded,
  saveErrorMessage,
  selectedTrack,
}: AnchorTrainingSummaryCardProps) {
  const accent = TRACK_ACCENTS[selectedTrack];

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      {/* Header: badges + accuracy */}
      <div className="shrink-0 pb-3 space-y-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <QuestionBadge className="border-border/60 bg-background/82 text-foreground/62">
            Сессия завершена
          </QuestionBadge>
          <QuestionBadge className={accent.badgeClassName}>
            <span
              aria-hidden="true"
              className={cn("h-1.5 w-1.5 rounded-full", accent.dotClassName)}
            />
            {getSummaryLabel(selectedTrack)}
          </QuestionBadge>
        </div>

        <SurfacePanel className="px-6 py-6 sm:px-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/42">
            Точность
          </p>
          <p className="mt-3 text-5xl font-semibold tabular-nums text-foreground/94">
            {resultPercent}%
          </p>
          <p className="mt-2 text-sm text-foreground/76">
            {correctCount} из {totalCount} ответов верны.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {caption}
          </p>
        </SurfacePanel>
      </div>

      {/* Body: stat rows */}
      <ScrollShadowContainer className="flex-1">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {referenceStats.total > 0 && (
            <SummaryStatRow
              label="Ссылка"
              stat={referenceStats}
              accent={TRACK_ACCENTS.reference}
            />
          )}
          {incipitStats.total > 0 && (
            <SummaryStatRow
              label="Начало"
              stat={incipitStats}
              accent={TRACK_ACCENTS.incipit}
            />
          )}
          {endingStats.total > 0 && (
            <SummaryStatRow
              label="Конец"
              stat={endingStats}
              accent={TRACK_ACCENTS.ending}
            />
          )}
          {contextStats.total > 0 && (
            <SummaryStatRow
              label="Контекст"
              stat={contextStats}
              accent={TRACK_ACCENTS.context}
            />
          )}
        </div>

        {/* Save status */}
        <div className="mt-4 flex justify-center">
          {isSavingSession && (
            <QuestionBadge className="border-border/60 bg-background/82 text-foreground/68">
              Сохраняем прогресс закрепления...
            </QuestionBadge>
          )}
          {saveSucceeded && !isSavingSession && (
            <QuestionBadge className="border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300">
              Прогресс закрепления сохранён.
            </QuestionBadge>
          )}
          {saveErrorMessage && !isSavingSession && (
            <QuestionBadge className="border-rose-500/20 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300">
              {saveErrorMessage}
            </QuestionBadge>
          )}
        </div>
      </ScrollShadowContainer>
    </div>
  );
}

export function AnchorTrainingStateCard({
  title,
  description,
  action,
  visual,
}: AnchorTrainingStateCardProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-5 text-center">
        <QuestionBadge className="border-border/60 bg-background/80 text-foreground/70">
          Закрепление
        </QuestionBadge>

        <SurfacePanel className="border-border/60 bg-gradient-to-br from-background via-background to-muted/45 px-6 py-6 sm:px-8">
          <p className="text-xl font-medium font-serif italic !text-primary/90">
            {title}
          </p>
        </SurfacePanel>

        {visual === "loading" ? <AnchorTrainingLoadingVisual /> : null}

        <p className="max-w-lg text-center text-sm leading-relaxed text-foreground/68">
          {description}
        </p>

        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

function SummaryStatRow({
  label,
  stat,
  accent,
}: {
  label: string;
  stat: TrackStat;
  accent: TrackAccent;
}) {
  const percent = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-[1.6rem] border px-4 py-3 text-sm",
        accent.statClassName
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("h-2 w-2 rounded-full", accent.dotClassName)}
          />
          <span className="font-medium">{label}</span>
        </div>
        <p className="mt-1 text-xs opacity-75">{percent}% точности</p>
      </div>
      <span className="shrink-0 font-semibold tabular-nums">
        {stat.correct}/{stat.total}
      </span>
    </div>
  );
}
