"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Toaster } from "@/app/components/ui/toaster";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { GALLERY_TOASTER_ID } from "@/app/lib/toast";
import {
  showTrainingContactToast as showContactToastFn,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
import { TrainingCard } from "@/app/components/VerseGallery/components/TrainingCard";
import { getVerseIdentity } from "@/app/components/VerseGallery/utils";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import { useTrainingSession } from "./useTrainingSession";

const TRAINING_TOASTER_ID = GALLERY_TOASTER_ID;

// Card slide animation
const slideVariants = {
  enter: (dir: number) =>
    dir === 0
      ? { opacity: 0, scale: 1, y: 0 }
      : { y: dir > 0 ? "100%" : "-100%", opacity: 0, scale: 0.88 },
  center: (dir: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition:
      dir === 0
        ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
        : { type: "spring" as const, stiffness: 320, damping: 32 },
  }),
  exit: (dir: number) =>
    dir === 0
      ? { opacity: 0, scale: 1, transition: { duration: 0.15, ease: "easeIn" as const } }
      : {
          y: dir > 0 ? "-18%" : "18%",
          opacity: 0,
          scale: 0.86,
          transition: { duration: 0.2, ease: "easeIn" as const },
        },
};

function toReadableSentence(text: string | null): string | null {
  if (!text) return null;
  const normalized = text.charAt(0).toUpperCase() + text.slice(1);
  return normalized.endsWith(".") ? normalized : `${normalized}.`;
}

interface TrainingSessionProps {
  verses: Verse[];
  onClose: () => void;
  onVersePatched?: (event: VersePatchEvent) => void;
}

export function TrainingSession({
  verses,
  onClose,
  onVersePatched,
}: TrainingSessionProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;

  const [isMounted, setIsMounted] = useState(false);
  const [direction, setDirection] = useState(0);
  const [hasInteractionStarted, setHasInteractionStarted] = useState(false);
  const [pendingNavigationStep, setPendingNavigationStep] = useState<1 | -1 | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const session = useTrainingSession({
    verses,
    onVersePatched,
    onSessionComplete: onClose,
  });

  // Fire contact toast via Sonner
  useEffect(() => {
    if (!session.contactToastPayload) return;
    showContactToastFn(session.contactToastPayload, {
      durationMs: 3200,
      toasterId: TRAINING_TOASTER_ID,
    });
  }, [session.contactToastPayload]);

  // Reset interaction state on verse change
  useEffect(() => {
    setHasInteractionStarted(false);
    setPendingNavigationStep(null);
  }, [session.trainingActiveVerse?.key]);

  const markInteractionStarted = useCallback(() => {
    setHasInteractionStarted(true);
  }, []);

  const requestNavigationStep = useCallback(
    (step: 1 | -1) => {
      if (
        session.isActionPending ||
        session.milestonePopup !== null ||
        session.quickForgetConfirmStage !== null
      ) {
        return;
      }
      if (!hasInteractionStarted) {
        setDirection(step);
        session.handleNavigationStep(step);
        return;
      }
      setPendingNavigationStep(step);
    },
    [session, hasInteractionStarted]
  );

  const confirmNavigationStep = useCallback(() => {
    if (pendingNavigationStep === null) return;
    const step = pendingNavigationStep;
    setPendingNavigationStep(null);
    setDirection(step);
    session.handleNavigationStep(step);
  }, [pendingNavigationStep, session]);

  const cancelNavigationStep = useCallback(() => {
    setPendingNavigationStep(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        session.milestonePopup !== null ||
        session.quickForgetConfirmStage !== null ||
        pendingNavigationStep !== null
      ) {
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        requestNavigationStep(1);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        requestNavigationStep(-1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, pendingNavigationStep, requestNavigationStep, session]);

  if (!session.trainingActiveVerse || session.trainingModeId === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-foreground/50">
          Нет стихов для тренировки в выбранных режимах
        </p>
      </div>
    );
  }

  const bodyKey = getVerseIdentity(session.trainingActiveVerse.raw);

  // Milestone popup theming
  const milestonePopup = session.milestonePopup;

  const milestoneStageLabel =
    milestonePopup?.status === "MASTERED"
      ? "Завершение"
      : milestonePopup?.status === "REVIEW"
        ? "Повторение"
        : milestonePopup?.status === "LEARNING"
          ? "Изучение"
          : "Этап";

  const milestoneTheme =
    milestonePopup?.status === "MASTERED"
      ? {
          contentClassName:
            "border-amber-500/25 bg-gradient-to-br from-amber-400/14 via-card to-yellow-300/6",
          glowClassName:
            "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.22),transparent_56%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.2),transparent_52%)]",
          badgeClassName:
            "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-300",
          statCardClassName: "border-amber-500/25 bg-amber-500/[0.08]",
          valueClassName: "text-amber-800 dark:text-amber-300",
        }
      : milestonePopup?.status === "REVIEW"
        ? {
            contentClassName:
              "border-violet-500/20 bg-gradient-to-br from-violet-500/9 via-card to-card",
            glowClassName:
              "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.24),transparent_56%),radial-gradient(circle_at_bottom_left,rgba(167,139,250,0.2),transparent_52%)]",
            badgeClassName:
              "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
            statCardClassName: "border-violet-500/25 bg-violet-500/[0.08]",
            valueClassName: "text-violet-700 dark:text-violet-300",
          }
        : {
            contentClassName:
              "border-emerald-500/20 bg-gradient-to-br from-emerald-500/7 via-card to-card",
            glowClassName:
              "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_56%),radial-gradient(circle_at_bottom_left,rgba(52,211,153,0.2),transparent_52%)]",
            badgeClassName:
              "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            statCardClassName: "border-emerald-500/25 bg-emerald-500/[0.08]",
            valueClassName: "text-emerald-700 dark:text-emerald-300",
          };

  const milestoneNextReviewSentence = toReadableSentence(
    milestonePopup?.nextReviewHint ?? null
  );

  const milestoneDialogContent =
    milestonePopup?.milestoneKind === "review_to_mastered"
      ? {
          title: "Стих выучен полностью",
          description:
            "Этап повторения завершён. Стих перешёл в список завершённых.",
        }
      : milestonePopup?.milestoneKind === "review_progress"
        ? {
            title: "Этап повторения обновлён",
            description: milestoneNextReviewSentence
              ? `Повтор засчитан. ${milestoneNextReviewSentence}`
              : "Повтор засчитан. Стих остаётся на этапе повторения по интервальному графику.",
          }
        : milestonePopup?.milestoneKind === "learning_to_review"
          ? {
              title: "Переход к этапу повторения",
              description: milestoneNextReviewSentence
                ? `Этап изучения завершён. ${milestoneNextReviewSentence}`
                : "Стих переведён в повторение. Теперь он закрепляется по интервальным повторам.",
            }
          : {
              title: "Стих переведён в этап изучения",
              description:
                "Это первый этап изучения. После завершения этапа изучения стих перейдёт в интервальное повторение.",
            };

  return (
    <>
      {/* Toaster portalled to body for correct stacking */}
      {isMounted &&
        createPortal(
          <Toaster
            id={TRAINING_TOASTER_ID}
            offset={{ top: `${Math.max(topInset, 0) + 12}px` }}
          />,
          document.body
        )}

      {/* Accessibility */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {session.feedbackMessage}
      </div>

      {/* Header: counter */}
      <div className="flex items-center justify-center py-2 text-xs text-foreground/40 tabular-nums">
        {session.trainingIndex + 1} / {session.trainingVerseCount}
      </div>

      {/* Card area */}
      <div
        className="flex-1 relative grid place-items-center px-4 sm:px-6"
        role="region"
        aria-roledescription="carousel"
        aria-label="Карточки обучения"
      >
        <AnimatePresence initial={false} mode="sync" custom={direction}>
          <motion.div
            key={bodyKey}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="col-start-1 row-start-1 w-full max-w-4xl min-w-0 focus-visible:outline-none"
            tabIndex={-1}
          >
            <TrainingCard
              trainingVerse={session.trainingActiveVerse}
              modeId={session.trainingModeId}
              rendererRef={session.rendererRef}
              onSwipeStep={requestNavigationStep}
              onTrainingInteractionStart={markInteractionStarted}
              onRate={(rating) => {
                setHasInteractionStarted(true);
                return session.handleRate(rating);
              }}
              onQuickForget={() => {
                setHasInteractionStarted(true);
                session.requestQuickForget();
              }}
              quickForgetLabel={session.quickForgetLabel}
              quickForgetDisabled={session.isActionPending}
              hideRatingFooter={milestonePopup !== null}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom padding */}
      <div style={{ height: `${Math.max(bottomInset, 12)}px` }} />

      {/* Milestone popup dialog */}
      <AlertDialog
        open={milestonePopup !== null}
        onOpenChange={() => {
          // Only closeable via confirm button
        }}
      >
        <AlertDialogContent
          className={`overflow-hidden rounded-3xl backdrop-blur-xl shadow-2xl ${milestoneTheme.contentClassName}`}
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 backdrop-blur-lg ${milestoneTheme.glowClassName}`}
          />
          <AlertDialogHeader className="relative gap-3">
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${milestoneTheme.badgeClassName}`}
            >
              {milestonePopup?.reference}
            </span>
            <AlertDialogTitle className="text-balance text-xl leading-tight text-muted-foreground/90">
              {milestoneDialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground/90">
              {milestoneDialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div
            className={`relative grid gap-2 rounded-2xl border p-3 text-xs text-foreground/80 sm:grid-cols-2 ${milestoneTheme.statCardClassName}`}
          >
            <div className={`rounded-xl border px-3 py-2 ${milestoneTheme.statCardClassName}`}>
              <span className="text-foreground/75">Текущий этап</span>
              <div className={`mt-0.5 text-sm font-semibold ${milestoneTheme.valueClassName}`}>
                {milestoneStageLabel}
              </div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${milestoneTheme.statCardClassName}`}>
              <span className="text-foreground/75">Прогресс</span>
              <div className={`mt-0.5 text-sm font-semibold ${milestoneTheme.valueClassName}`}>
                {milestonePopup?.beforeProgressPercent}% → {milestonePopup?.afterProgressPercent}%
              </div>
            </div>
          </div>

          <AlertDialogFooter className="relative">
            <AlertDialogAction
              className={`w-full rounded-full sm:w-auto text-sm font-medium ${milestoneTheme.valueClassName} border border-border/70 ${milestoneTheme.statCardClassName}`}
              onClick={session.confirmMilestonePopup}
            >
              Понятно
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick forget confirm */}
      <AlertDialog
        open={session.quickForgetConfirmStage !== null}
        onOpenChange={(open) => {
          if (!open) session.cancelQuickForget();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {session.quickForgetConfirmStage === "review"
                ? "Отметить как «не вспомнил»?"
                : "Отметить как «забыл»?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {session.quickForgetConfirmStage === "review"
                ? "Прогресс повторения не изменится. Следующая попытка будет доступна примерно через 10 минут."
                : "Текущий шаг будет засчитан как «Забыл» и рейтинг снизится согласно правилам этапа изучения."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={session.cancelQuickForget}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={session.confirmQuickForget}
            >
              Подтвердить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation confirm (when exercise in progress) */}
      <AlertDialog
        open={pendingNavigationStep !== null}
        onOpenChange={(open) => {
          if (!open) cancelNavigationStep();
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base text-foreground/90">
              Перейти к другому стиху?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground/90">
              Если перейти сейчас, прогресс текущего упражнения не сохранится.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full border border-border/60 bg-muted/35 text-foreground/70"
              onClick={cancelNavigationStep}
            >
              Остаться
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-border/60 bg-primary/60 text-background"
              onClick={confirmNavigationStep}
            >
              Перейти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
