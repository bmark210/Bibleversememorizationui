"use client";

import type { ReactNode, RefObject } from "react";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { VerseCard, type VerseCardPreviewTone } from "@/app/components/VerseCard";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";

type SessionTrack = "reference" | "incipit" | "context" | "mixed";
type SkillTrack = "reference" | "incipit" | "context";

type TapQuestionOption = {
  id: string;
  label: string;
  normalized: string;
};

type QuestionBase = {
  id: string;
  track: SkillTrack;
  modeLabel: string;
  modeHint: string;
  prompt: string;
  answerLabel: string;
};

type ChoiceQuestion = QuestionBase & {
  interaction: "choice";
  options: string[];
  isCorrectOption: (value: string) => boolean;
};

type TypeQuestion = QuestionBase & {
  interaction: "type";
  placeholder: string;
  maxAttempts: number;
  retryHint?: string;
};

type TapQuestion = QuestionBase & {
  interaction: "tap";
  options: TapQuestionOption[];
  expectedNormalized: string[];
};

type TrainerQuestion = ChoiceQuestion | TypeQuestion | TapQuestion;

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
  typeInputReadiness: { canSubmit: boolean; remainingChars: number } | null;
  inputRef: RefObject<HTMLInputElement | null>;
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

type TrackStat = {
  total: number;
  correct: number;
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
};

type TrackAccent = {
  badgeClassName: string;
  panelClassName: string;
  softPanelClassName: string;
  statClassName: string;
  dotClassName: string;
  lineClassName: string;
};

const TRACK_LABELS: Record<SkillTrack, string> = {
  reference: "Ссылка",
  incipit: "Начала",
  context: "Контекст",
};

const SESSION_TRACK_LABELS: Record<SessionTrack, string> = {
  reference: "Ссылка",
  incipit: "Начала",
  context: "Контекст",
  mixed: "Смешанный",
};

const TRACK_ACCENTS: Record<SessionTrack | SkillTrack, TrackAccent> = {
  reference: {
    badgeClassName:
      "border-sky-500/20 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300",
    panelClassName:
      "border-sky-500/18 bg-gradient-to-br from-sky-500/[0.10] via-background to-background",
    softPanelClassName:
      "border-sky-500/14 bg-sky-500/[0.07] text-sky-800 dark:text-sky-300",
    statClassName:
      "border-sky-500/18 bg-sky-500/[0.08] text-sky-800 dark:text-sky-300",
    dotClassName: "bg-sky-500",
    lineClassName: "from-transparent via-sky-500/45 to-transparent",
  },
  incipit: {
    badgeClassName:
      "border-rose-500/20 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300",
    panelClassName:
      "border-rose-500/18 bg-gradient-to-br from-rose-500/[0.10] via-background to-background",
    softPanelClassName:
      "border-rose-500/14 bg-rose-500/[0.07] text-rose-800 dark:text-rose-300",
    statClassName:
      "border-rose-500/18 bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
    dotClassName: "bg-rose-500",
    lineClassName: "from-transparent via-rose-500/45 to-transparent",
  },
  context: {
    badgeClassName:
      "border-teal-500/20 bg-teal-500/[0.08] text-teal-700 dark:text-teal-300",
    panelClassName:
      "border-teal-500/18 bg-gradient-to-br from-teal-500/[0.10] via-background to-background",
    softPanelClassName:
      "border-teal-500/14 bg-teal-500/[0.07] text-teal-800 dark:text-teal-300",
    statClassName:
      "border-teal-500/18 bg-teal-500/[0.08] text-teal-800 dark:text-teal-300",
    dotClassName: "bg-teal-500",
    lineClassName: "from-transparent via-teal-500/45 to-transparent",
  },
  mixed: {
    badgeClassName:
      "border-primary/20 bg-primary/[0.08] text-primary",
    panelClassName:
      "border-primary/18 bg-gradient-to-br from-primary/[0.10] via-background to-background",
    softPanelClassName:
      "border-primary/14 bg-primary/[0.07] text-primary",
    statClassName:
      "border-primary/18 bg-primary/[0.08] text-primary",
    dotClassName: "bg-primary",
    lineClassName: "from-transparent via-primary/45 to-transparent",
  },
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

function getChoiceStateClass(params: {
  isAnswered: boolean;
  optionIsCorrect: boolean;
  optionIsSelected: boolean;
}) {
  if (!params.isAnswered) {
    return "border-border/60 bg-background/88 text-foreground/86 hover:bg-muted/35";
  }
  if (params.optionIsCorrect) {
    return "border-emerald-500/24 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300";
  }
  if (params.optionIsSelected) {
    return "border-rose-500/24 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300";
  }
  return "border-border/55 bg-muted/25 text-foreground/62";
}

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

function getSummaryLabel(selectedTrack: SessionTrack) {
  return selectedTrack === "mixed"
    ? "Смешанная сессия"
    : `Режим: ${SESSION_TRACK_LABELS[selectedTrack]}`;
}

function QuestionBadge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function SurfacePanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.7rem] border border-border/60 bg-background/82",
        className
      )}
    >
      {children}
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
            <Badge
              variant="outline"
              className="rounded-full border-border/60 bg-background/82 px-3 py-1 text-[11px] text-foreground/72 shadow-sm"
            >
                {question.modeLabel}
            </Badge>
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
          <div className="rounded-[1.85rem] border border-border/60 bg-background/90 px-4 py-5 sm:px-6 sm:py-6">
            <p className="whitespace-pre-line text-center text-[1.02rem] leading-relaxed text-foreground/92 sm:text-[1.1rem]">
              {question.prompt}
            </p>
          </div>

          {question.interaction === "choice" && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {question.options.map((option) => {
                const optionIsSelected = selectedOption === option;
                const optionIsCorrect = question.isCorrectOption(option);
                const stateClassName = getChoiceStateClass({
                  isAnswered,
                  optionIsCorrect,
                  optionIsSelected,
                });

                return (
                  <button
                    key={`${question.id}-${option}`}
                    type="button"
                    disabled={isAnswered || controlsLocked}
                    onClick={() => onChoiceSelect(option)}
                    className={cn(
                      "rounded-[1.45rem] border px-4 py-3.5 text-left text-sm leading-relaxed transition-colors",
                      stateClassName
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {question.interaction === "tap" && (
            <div className="space-y-3">
              <SurfacePanel className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-foreground/72">Собрано</span>
                  <span className="text-xs font-semibold tabular-nums text-foreground/82">
                    {Math.min(tapSequence.length, question.expectedNormalized.length)}/
                    {question.expectedNormalized.length}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/82">
                  {selectedTapLabels.length > 0
                    ? selectedTapLabels.join(" ")
                    : "Нажимайте слова по порядку"}
                </p>
              </SurfacePanel>

              <div className="grid grid-cols-2 gap-2.5">
                {question.options.map((option) => {
                  const isUsed = tapSequence.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isAnswered || isUsed || controlsLocked}
                      onClick={() => onTapSelect(option.id)}
                      className={cn(
                        "rounded-[1.45rem] border px-3.5 py-3 text-left text-sm transition-colors",
                        isUsed
                          ? "border-primary/25 bg-primary/[0.08] text-foreground/84"
                          : "border-border/60 bg-background/88 text-foreground/86 hover:bg-muted/35"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {question.interaction === "type" && !isAnswered && (
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
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary tabular-nums">
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
                    Введите ещё минимум {typeInputReadiness.remainingChars} симв. для проверки.
                  </p>
                )}
            </div>
          )}
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
                        className="rounded-full px-5"
                        onClick={onContinue}
                      >
                        Продолжить
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SurfacePanel>
          ) : (
            <div className="flex justify-center">
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Свайп вверх переносит стих в конец сессии.
              </p>
            </div>
          )}
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
        <div className="flex h-full items-center justify-center">
          <p className="max-w-lg text-center text-sm leading-relaxed text-foreground/68">
            {description}
          </p>
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
