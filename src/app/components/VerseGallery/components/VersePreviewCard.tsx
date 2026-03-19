import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Anchor,
  Brain,
  Clock3,
  Dumbbell,
  Pause,
  Play,
  Plus,
  Repeat,
  Trophy,
  Users,
} from "lucide-react";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { VerseCard } from "@/app/components/VerseCard";
import {
  VerseStatusSummary,
  VerseStatusMetaPill,
  type VerseStatusSummaryTone,
} from "@/app/components/VerseStatusSummary";
import { formatVerseAvailabilityLabel } from "@/app/components/formatVerseAvailabilityLabel";
import type { Verse } from "@/app/App";
import { normalizeVerseStatus, parseDate, computeTotalProgressPercent } from "../utils";
import type { VerseCardPreviewTone } from "@/app/components/VerseCard";

type Props = {
  verse: Verse;
  isActionPending: boolean;
  activeTagSlugs?: Iterable<string> | null;
  isAnchorEligible?: boolean;
  isFocusMode?: boolean;
  onStartTraining: () => void;
  onStatusAction: () => void;
  onOpenProgress?: (verse: Verse) => void;
  onOpenTags?: (verse: Verse) => void;
  onOpenOwners?: (verse: Verse) => void;
  onVerticalSwipeStep?: (step: 1 | -1) => void;
};

export function VersePreviewCard({
  verse,
  isActionPending,
  activeTagSlugs = null,
  isAnchorEligible = false,
  isFocusMode = false,
  onStartTraining,
  onStatusAction,
  onOpenProgress,
  onOpenTags,
  onOpenOwners,
  onVerticalSwipeStep,
}: Props) {
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const previewTextRef = useRef<HTMLParagraphElement>(null);
  const [lineClamp, setLineClamp] = useState(8);
  const status = normalizeVerseStatus(verse.status);
  const rawMasteryLevel = Number(verse.masteryLevel ?? 0);
  const repetitionsCount = Math.max(0, Number(verse.repetitions ?? 0));
  const totalProgressPercent = computeTotalProgressPercent(rawMasteryLevel, repetitionsCount);
  const nextReviewAt = parseDate(
    (verse as Record<string, unknown>).nextReviewAt ??
      (verse as Record<string, unknown>).nextReview
  );
  const isNotYetDue =
    status === "REVIEW" && nextReviewAt !== null && Date.now() < nextReviewAt.getTime();
  const availabilityLabel = isNotYetDue
    ? formatVerseAvailabilityLabel(nextReviewAt)
    : null;
  const isReviewStage = status === "REVIEW" || status === "MASTERED";
  const activeTagSlugSet = useMemo(() => {
    const next = new Set<string>();
    if (!activeTagSlugs) return next;

    for (const rawSlug of activeTagSlugs) {
      const slug = String(rawSlug ?? "").trim();
      if (!slug) continue;
      next.add(slug);
    }

    return next;
  }, [activeTagSlugs]);
  const normalizedTags = useMemo(() => {
    if (!Array.isArray(verse.tags) || verse.tags.length === 0) return [];

    const seen = new Set<string>();
    return verse.tags.reduce<Array<{ id?: string; slug?: string; title: string }>>(
      (acc, tag) => {
        const title = String(tag?.title ?? "").trim();
        if (!title) return acc;

        const key = String(tag?.id ?? tag?.slug ?? title.toLowerCase());
        if (seen.has(key)) return acc;
        seen.add(key);

        acc.push({
          id: tag?.id,
          slug: tag?.slug,
          title,
        });
        return acc;
      },
      [],
    );
  }, [verse.tags]);
  const previewUsers = useMemo(() => {
    if (!Array.isArray(verse.popularityPreviewUsers)) return [];

    const seen = new Set<string>();
    return verse.popularityPreviewUsers
      .reduce<Array<{ telegramId: string; name: string; avatarUrl: string | null }>>(
        (acc, user) => {
          const telegramId = String(user?.telegramId ?? "").trim();
          const name = String(user?.name ?? "").trim();
          if (!telegramId || !name || seen.has(telegramId)) return acc;
          seen.add(telegramId);

          acc.push({
            telegramId,
            name,
            avatarUrl:
              typeof user?.avatarUrl === "string" && user.avatarUrl.trim()
                ? user.avatarUrl.trim()
                : null,
          });
          return acc;
        },
        [],
      )
      .slice(0, 4);
  }, [verse.popularityPreviewUsers]);

  const tone: VerseCardPreviewTone | undefined =
    status === "CATALOG"
      ? "catalog"
      : status === VerseStatus.MY
        ? "my"
        : status === VerseStatus.STOPPED
          ? "stopped"
          : status === "MASTERED"
            ? "mastered"
            : isReviewStage
              ? "review"
              : "learning";
  const popularityValue =
    typeof verse.popularityValue === "number"
      ? Math.max(0, Math.round(verse.popularityValue))
      : null;
  const popularityBadge = (() => {
    if (popularityValue == null) return null;
    if (verse.popularityScope === "friends") {
      return {
        icon: Users,
        label: `У друзей ${popularityValue}`,
        className:
          "border-cyan-500/35 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
      };
    }
    if (verse.popularityScope === "players") {
      return {
        icon: Users,
        label: `У игроков ${popularityValue}`,
        className:
          "border-slate-500/35 bg-slate-500/12 text-slate-700 dark:text-slate-300",
      };
    }
    return null;
  })();
  const hasOwnersTrigger =
    Boolean(onOpenOwners) &&
    popularityBadge != null &&
    popularityValue != null &&
    popularityValue > 0 &&
    (verse.popularityScope === "friends" || verse.popularityScope === "players");

  const primaryAction = buildPrimaryAction({
    status,
    isNotYetDue,
    isAnchorEligible,
    onStartTraining,
    onStatusAction,
  });
  const waitingActionLabel = isNotYetDue ? availabilityLabel : null;

  const statusTone = buildStatusTone({
    status,
    isNotYetDue,
  });

  const showFooter = !isFocusMode && statusTone !== null;

  useLayoutEffect(() => {
    if (isFocusMode || typeof window === "undefined") return;

    const bodyEl = previewBodyRef.current;
    const textEl = previewTextRef.current;
    if (!bodyEl || !textEl) return;

    let rafId: number | null = null;

    const updateLineClamp = () => {
      const currentBodyEl = previewBodyRef.current;
      const currentTextEl = previewTextRef.current;
      if (!currentBodyEl || !currentTextEl) return;

      const bodyStyle = window.getComputedStyle(currentBodyEl);
      const textStyle = window.getComputedStyle(currentTextEl);
      const paddingTop = Number.parseFloat(bodyStyle.paddingTop || "0") || 0;
      const paddingBottom =
        Number.parseFloat(bodyStyle.paddingBottom || "0") || 0;
      const availableHeight = Math.max(
        0,
        currentBodyEl.clientHeight - paddingTop - paddingBottom,
      );

      let lineHeight = Number.parseFloat(textStyle.lineHeight || "");
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        const fontSize = Number.parseFloat(textStyle.fontSize || "0") || 16;
        lineHeight = fontSize * 1.625;
      }

      const nextClamp = Math.max(2, Math.floor(availableHeight / lineHeight));
      setLineClamp((prev) => (prev === nextClamp ? prev : nextClamp));
    };

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateLineClamp();
      });
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleUpdate())
        : null;

    resizeObserver?.observe(bodyEl);
    resizeObserver?.observe(textEl);
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isFocusMode, verse.text, showFooter]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <VerseCard
        isActive
        minHeight="training"
        bodyScrollable={isFocusMode}
        onVerticalSwipeStep={isFocusMode ? onVerticalSwipeStep : undefined}
        previewTone={tone}
        metaBadge={
          isFocusMode ? null : hasOwnersTrigger ? (
            <button
              type="button"
              onClick={() => onOpenOwners?.(verse)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] shadow-sm transition-colors hover:bg-muted/45",
                "border-border/40 bg-muted/25 text-muted-foreground/70",
                popularityBadge?.className,
              )}
              aria-label={popularityBadge?.label ?? "Открыть список пользователей"}
            >
              {previewUsers.length > 0 ? (
                <span className="flex -space-x-1.5">
                  {previewUsers.map((user) => (
                    <Avatar
                      key={user.telegramId}
                      className="h-4 w-4 border border-background shadow-sm"
                    >
                      {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      ) : null}
                      <AvatarFallback className="bg-secondary text-[8px] text-secondary-foreground">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center">
                  <popularityBadge.icon className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="truncate font-semibold">
                {popularityBadge?.label}
              </span>
            </button>
          ) : popularityBadge && popularityValue && popularityValue > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                popularityBadge.className
              )}
            >
              <popularityBadge.icon className="h-3.5 w-3.5" />
              {popularityBadge.label}
            </span>
          ) : null
        }
        header={
          <div
            className={cn(
              "w-full min-w-0 flex-shrink-0 text-center",
              isFocusMode ? "space-y-3" : "space-y-4",
            )}
          >
            <h2 className="text-3xl sm:text-4xl font-serif text-primary/90 italic break-words [overflow-wrap:anywhere]">
              {verse.reference}
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto" />
            {!isFocusMode ? (
              normalizedTags.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {normalizedTags.slice(0, 3).map((tag, index) => {
                    const slug = String(tag.slug ?? "").trim();
                    const isActive = Boolean(slug) && activeTagSlugSet.has(slug);

                    return onOpenTags ? (
                      <button
                        key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
                        type="button"
                        onClick={() => onOpenTags(verse)}
                        className={cn(
                          "inline-flex min-h-5 items-center rounded-full border px-3 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
                          isActive
                            ? "border-primary/30 bg-primary/12 text-primary"
                            : "border-border/60 bg-muted/35 text-muted-foreground hover:bg-muted/55",
                        )}
                        aria-label={`Открыть теги стиха ${verse.reference}`}
                      >
                        #{tag.title}
                      </button>
                    ) : (
                      <span
                        key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
                        className={cn(
                          "inline-flex min-h-5 items-center rounded-full border px-3 py-0.5 text-[11px] font-medium tracking-wide",
                          isActive
                            ? "border-primary/30 bg-primary/12 text-primary"
                            : "border-border/60 bg-muted/35 text-muted-foreground",
                        )}
                      >
                        #{tag.title}
                      </span>
                    );
                  })}

                  {normalizedTags.length > 3 ? (
                    onOpenTags ? (
                      <button
                        type="button"
                        onClick={() => onOpenTags(verse)}
                        className="inline-flex min-h-5 items-center rounded-full border border-border/60 bg-muted/35 px-3 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground transition-colors hover:bg-muted/55"
                        aria-label={`Показать еще ${normalizedTags.length - 3} тегов`}
                      >
                        +{normalizedTags.length - 3}
                      </button>
                    ) : (
                      <span className="inline-flex min-h-5 items-center rounded-full border border-border/60 bg-muted/35 px-3 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                        +{normalizedTags.length - 3}
                      </span>
                    )
                  ) : null}
                </div>
              ) : null
            ) : null}
          </div>
        }
        body={
          <div
            ref={previewBodyRef}
            className={cn(
              "h-full min-w-0 flex justify-center px-2",
              isFocusMode
                ? "items-start overflow-visible pt-1 sm:pt-2"
                : "items-start overflow-hidden pt-2 sm:pt-4",
            )}
          >
            <p
              ref={previewTextRef}
              style={isFocusMode ? undefined : { WebkitLineClamp: lineClamp }}
              className={cn(
                "font-verse w-full max-w-full italic text-center break-words [overflow-wrap:anywhere]",
                isFocusMode
                  ? "whitespace-pre-wrap text-2xl sm:text-[2rem] leading-[1.9] text-foreground/70"
                  : "max-h-full text-[1.45rem] sm:text-[1.95rem] leading-[1.8] text-foreground/90 font-normal [display:-webkit-box] [-webkit-box-orient:vertical] overflow-hidden text-ellipsis",
              )}
            >
              «{verse.text}»
            </p>
          </div>
        }
        centerAction={
          primaryAction ? (
            <Button
              data-tour="verse-gallery-primary-cta"
              variant="secondary"
              className={cn(
                "gap-2 min-w-[200px] max-w-full rounded-2xl border border-border/60 bg-background/78 text-foreground/88 shadow-lg backdrop-blur-sm hover:bg-muted/48",
                primaryAction.className
              )}
              onClick={primaryAction.onClick}
              disabled={isActionPending || Boolean(primaryAction.disabled)}
              aria-label={primaryAction.ariaLabel}
            >
              <primaryAction.icon className="h-4 w-4" />
              <span className="min-w-0 truncate">{primaryAction.label}</span>
            </Button>
          ) : waitingActionLabel ? (
            <div className="flex justify-center">
              <VerseStatusMetaPill
                label={waitingActionLabel}
                className="gap-2 rounded-2xl border-border/60 bg-background/72 px-4 py-3"
              />
            </div>
          ) : null
        }
        footer={
          showFooter && statusTone ? (
            <button
              type="button"
              onClick={() => onOpenProgress?.(verse)}
              className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl"
              aria-label={`Показать путь прогресса стиха ${verse.reference}`}
            >
              <StatusFooter
                statusTone={statusTone}
                totalProgressPercent={totalProgressPercent}
              />
            </button>
          ) : null
        }
      />
    </div>
  );
}

// ─── Status footer (CSS transitions, no motion.div) ──────────────────────────

type StatusTone = VerseStatusSummaryTone;

function StatusFooter({
  statusTone,
  totalProgressPercent,
}: {
  statusTone: StatusTone;
  totalProgressPercent: number;
}) {
  return (
    <VerseStatusSummary
      tone={statusTone}
      progressPercent={totalProgressPercent}
      className="w-full justify-between"
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type PrimaryAction = {
  label: string;
  ariaLabel: string;
  icon: typeof Brain;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
};

function buildPrimaryAction(params: {
  status: ReturnType<typeof normalizeVerseStatus>;
  isNotYetDue: boolean;
  isAnchorEligible: boolean;
  onStartTraining: () => void;
  onStatusAction: () => void;
}): PrimaryAction | null {
  const { status, isNotYetDue, isAnchorEligible, onStartTraining, onStatusAction } = params;

  if (status === "CATALOG") {
    return {
      label: "Добавить в мои",
      ariaLabel: "Добавить стих в мои стихи",
      icon: Plus,
      onClick: onStatusAction,
    };
  }

  if (status === VerseStatus.MY) {
    return {
      label: "Начать изучение",
      ariaLabel: "Начать изучение стиха",
      icon: Play,
      onClick: onStatusAction,
    };
  }

  if (status === VerseStatus.STOPPED) {
    return {
      label: "Возобновить",
      ariaLabel: "Возобновить изучение стиха",
      icon: Play,
      onClick: onStatusAction,
    };
  }

  if (status === "MASTERED") {
    return isAnchorEligible
      ? {
          label: "Закрепить",
          ariaLabel: "Перейти к закреплению стиха",
          icon: Anchor,
          onClick: onStartTraining,
        }
      : null;
  }

  if (status === VerseStatus.LEARNING) {
    return {
      label: "Тренироваться",
      ariaLabel: "Продолжить тренировку стиха",
      icon: Dumbbell,
      onClick: onStartTraining,
    };
  }

  if (status === "REVIEW" && !isNotYetDue) {
    return {
      label: "Тренироваться",
      ariaLabel: "Перейти к повторению стиха",
      icon: Dumbbell,
      onClick: onStartTraining,
    };
  }

  return null;
}

function buildStatusTone(params: {
  status: ReturnType<typeof normalizeVerseStatus>;
  isNotYetDue: boolean;
}): StatusTone | null {
  const { status, isNotYetDue } = params;

  if (status === "CATALOG" || status === VerseStatus.MY) {
    return null;
  }
  if (status === VerseStatus.STOPPED) {
    return {
      icon: Pause,
      title: "На паузе",
      pillClassName: "border-rose-500/20 bg-rose-500/[0.08]",
      iconClassName: "text-rose-700 dark:text-rose-300",
      titleClassName: "text-rose-700/80 dark:text-rose-300/80",
    };
  }
  if (status === "MASTERED") {
    return {
      icon: Trophy,
      title: "Выучен",
      pillClassName: "border-amber-500/25 bg-amber-500/[0.08]",
      iconClassName: "text-amber-800 dark:text-amber-300",
      titleClassName: "text-amber-800/80 dark:text-amber-300/80",
    };
  }
  if (status === "REVIEW") {
    return {
      icon: isNotYetDue ? Clock3 : Repeat,
      title: isNotYetDue ? "Ждёт повтора" : "Повторение",
      pillClassName: "border-violet-500/20 bg-violet-500/[0.08]",
      iconClassName: "text-violet-700 dark:text-violet-300",
      titleClassName: "text-violet-700/80 dark:text-violet-300/80",
    };
  }
  if (status === VerseStatus.LEARNING) {
    return {
      icon: Brain,
      title: "Изучение",
      pillClassName: "border-emerald-500/20 bg-emerald-500/[0.08]",
      iconClassName: "text-emerald-700 dark:text-emerald-300",
      titleClassName: "text-emerald-700/80 dark:text-emerald-300/80",
    };
  }
  return null;
}
