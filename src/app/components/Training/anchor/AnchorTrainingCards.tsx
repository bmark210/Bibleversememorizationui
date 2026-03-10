"use client";

import type { ReactNode, RefObject } from "react";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { VerseCard, type VerseCardPreviewTone } from "@/app/components/VerseCard";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
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
  isContextPrefixTypeMode: boolean;
  typeInputReadiness: TypeInputReadiness | null;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  lastAnswerCorrect: boolean | null;
  lastAnswerUsedTolerance: boolean;
  lastAnswerForgotten: boolean;
  revealedVerseText: string;
  isAutoAdvancePending: boolean;
  showContinueButton: boolean;
  onSwipeStep: (step: 1 | -1) => void;
  onChoiceSelect: (value: string) => void;
  onTapSelect: (optionId: string) => void;
  onTypedAnswerChange: (value: string) => void;
  onTypeSubmit: () => void;
  onForgotAnswer: () => void;
  onContinue: () => void;
};

type AnchorTrainingSummaryCardProps = {
  resultPercent: number;
  correctCount: number;
  totalCount: number;
  referenceStats: TrackStat;
  incipitStats: TrackStat;
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
  tone?: VerseCardPreviewTone;
  action?: ReactNode;
  visual?: "loading";
};

const STATE_THEME: Record<
  VerseCardPreviewTone,
  {
    badgeClassName: string;
    panelClassName: string;
    titleClassName: string;
  }
> = {
  my: {
    badgeClassName: "border-border/60 bg-background/80 text-foreground/70",
    panelClassName:
      "border-border/60 bg-gradient-to-br from-background via-background to-muted/45",
    titleClassName: "text-foreground/92",
  },
  catalog: {
    badgeClassName: "border-border/60 bg-background/80 text-foreground/70",
    panelClassName:
      "border-border/60 bg-gradient-to-br from-background via-background to-muted/45",
    titleClassName: "text-foreground/92",
  },
  learning: {
    badgeClassName: "border-border/60 bg-background/80 text-foreground/70",
    panelClassName:
      "border-border/60 bg-gradient-to-br from-background via-background to-muted/45",
    titleClassName: "text-foreground/92",
  },
  review: {
    badgeClassName: "border-border/60 bg-background/80 text-foreground/70",
    panelClassName:
      "border-border/60 bg-gradient-to-br from-background via-background to-muted/45",
    titleClassName: "text-foreground/92",
  },
  mastered: {
    badgeClassName: "border-border/60 bg-background/80 text-foreground/70",
    panelClassName:
      "border-border/60 bg-gradient-to-br from-background via-background to-muted/45",
    titleClassName: "text-foreground/92",
  },
  stopped: {
    badgeClassName:
      "border-rose-500/20 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300",
    panelClassName:
      "border-rose-500/18 bg-gradient-to-br from-rose-500/[0.10] via-background to-background",
    titleClassName: "text-rose-800 dark:text-rose-300",
  },
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

function AnchorTrainingLoadingVisual() {
  const stages = ["Стихи", "Режимы", "Порядок"] as const;

  return (
    <div className="mx-auto w-full max-w-lg">
      <SurfacePanel className="border-border/60 bg-background/84 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <QuestionBadge className="border-border/60 bg-background/82 text-foreground/68">
            <span className="h-2 w-2 rounded-full bg-primary/80 animate-pulse" />
            Подготовка
          </QuestionBadge>
          <span className="text-[11px] text-muted-foreground">Закрепление</span>
        </div>

        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-muted/55">
            <div
              aria-hidden="true"
              className="h-full w-[68%] rounded-full bg-primary/75 animate-pulse"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {stages.map((stage, index) => (
            <div
              key={stage}
              className={cn(
                "rounded-full border px-2.5 py-1.5 text-center text-[11px] font-medium",
                index === 0
                  ? "border-primary/25 bg-primary/10 text-primary/80"
                  : "border-border/55 bg-background/72 text-muted-foreground",
              )}
            >
              {stage}
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Загружаем подходящие стихи и собираем последовательность вопросов.
        </p>
      </SurfacePanel>
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
  isContextPrefixTypeMode,
  typeInputReadiness,
  inputRef,
  lastAnswerCorrect,
  lastAnswerUsedTolerance,
  lastAnswerForgotten,
  revealedVerseText,
  isAutoAdvancePending,
  showContinueButton,
  onSwipeStep,
  onChoiceSelect,
  onTapSelect,
  onTypedAnswerChange,
  onTypeSubmit,
  onForgotAnswer,
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
        isContextPrefixTypeMode={isContextPrefixTypeMode}
        typeInputReadiness={typeInputReadiness}
        inputRef={inputRef}
        onChoiceSelect={onChoiceSelect}
        onTapSelect={onTapSelect}
        onTypedAnswerChange={onTypedAnswerChange}
        onTypeSubmit={onTypeSubmit}
      />
    ) : null;

  return (
    <VerseCard
      isActive
      minHeight="training"
      bodyScrollable
      onVerticalSwipeStep={onSwipeStep}
      shellClassName="!max-w-[46rem]"
      contentClassName="pb-2"
      header={
        <div className="space-y-3 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {sessionTrack === "mixed" && (
              <QuestionBadge className={questionAccent.badgeClassName}>
                <span
                  aria-hidden="true"
                  className={cn("h-1.5 w-1.5 rounded-full", questionAccent.dotClassName)}
                />
                {TRACK_LABELS[question.track]}
              </QuestionBadge>
            )}
            {/* <Badge
              variant="outline"
              className="rounded-full border-border/60 bg-background/82 px-3 py-1 text-[11px] text-foreground/72 shadow-sm"
            >
                {question.modeLabel}
            </Badge> */}
            {!isAnswered && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border px-3 text-[11px] font-semibold border-amber-500/35 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                onClick={onForgotAnswer}
                disabled={controlsLocked}
              >
                Забыл
              </Button>
            )}
          </div>
          <p className="text-sm leading-relaxed text-foreground/66">
            {question.modeHint}
          </p>
        </div>
      }
      body={
        <div className="space-y-5">
          {shouldPinTypeInputToTop ? modeRenderer : null}

          <div className="rounded-[1.85rem] border border-border/60 bg-background/90 px-4 py-5 sm:px-6 sm:py-6">
            <p className="whitespace-pre-line text-center font-serif italic text-[1.02rem] leading-relaxed text-primary/90 sm:text-[1.1rem]">
              {question.prompt}
            </p>
          </div>

          {!shouldPinTypeInputToTop ? modeRenderer : null}
        </div>
      }
      footer={
        <div className="space-y-3">
          {isAnswered ? (
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
                  {isAutoAdvancePending && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-foreground/62">
                      <Sparkles className="h-3.5 w-3.5" />
                      Переходим к следующему стиху...
                    </div>
                  )}
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
          )
           : null}
        </div>
      }
    />
  );
}

export function AnchorTrainingSummaryCard({
  resultPercent,
  correctCount,
  totalCount,
  referenceStats,
  incipitStats,
  contextStats,
  caption,
  isSavingSession,
  saveSucceeded,
  saveErrorMessage,
  selectedTrack,
}: AnchorTrainingSummaryCardProps) {
  const accent = TRACK_ACCENTS[selectedTrack];

  return (
    <VerseCard
      isActive
      minHeight="training"
      shellClassName="!max-w-[46rem]"
      header={
        <div className="space-y-4 text-center">
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
      }
      body={
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
              label="Начала"
              stat={incipitStats}
              accent={TRACK_ACCENTS.incipit}
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
      }
      footer={
        <div className="flex justify-center">
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
      }
    />
  );
}

export function AnchorTrainingStateCard({
  title,
  description,
  tone = "catalog",
  action,
  visual,
}: AnchorTrainingStateCardProps) {
  const theme = STATE_THEME[tone] ?? STATE_THEME.catalog;

  return (
    <VerseCard
      isActive
      minHeight="training"
      shellClassName="!max-w-[42rem]"
      header={
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <QuestionBadge className={theme.badgeClassName}>Закрепление</QuestionBadge>
          </div>
          <SurfacePanel className={cn("px-6 py-6 sm:px-8", theme.panelClassName)}>
            <p className={cn("text-xl font-medium", theme.titleClassName)}>{title}</p>
          </SurfacePanel>
        </div>
      }
      body={
        <div
          className={cn(
            "flex h-full justify-center",
            visual ? "items-start" : "items-center",
          )}
        >
          <div className="w-full max-w-lg space-y-5">
            {visual === "loading" ? <AnchorTrainingLoadingVisual /> : null}
            <p className="max-w-lg text-center text-sm leading-relaxed text-foreground/68">
              {description}
            </p>
          </div>
        </div>
      }
      centerAction={action ?? null}
    />
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
