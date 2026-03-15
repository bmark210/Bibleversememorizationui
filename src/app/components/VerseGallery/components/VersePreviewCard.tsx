import { useMemo, useRef } from "react";
import {
  Anchor,
  Brain,
  Clock3,
  Lock,
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
  getVerseDifficultyBadgeClassName,
  getVerseDifficultyLabel,
} from "@/app/utils/verseDifficulty";
import {
  TRAINING_STAGE_MASTERY_MAX,
  TOTAL_REPEATS_AND_STAGE_MASTERY_MAX,
  REPEAT_THRESHOLD_FOR_MASTERED,
} from "@/shared/training/constants";
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
  onOpenDifficulty?: (verse: Verse) => void;
  onOpenProgress?: (verse: Verse) => void;
  onOpenTags?: (verse: Verse) => void;
  onOpenOwners?: (verse: Verse) => void;
};

export function VersePreviewCard({
  verse,
  isActionPending,
  activeTagSlugs = null,
  isAnchorEligible = false,
  isFocusMode = false,
  onStartTraining,
  onStatusAction,
  onOpenDifficulty,
  onOpenProgress,
  onOpenTags,
  onOpenOwners,
}: Props) {
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const previewTextRef = useRef<HTMLParagraphElement>(null);
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
  const notYetDueLabel =
    isNotYetDue && nextReviewAt
      ? `Доступно ${nextReviewAt.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`
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
    notYetDueLabel,
    isReviewStage,
    isAnchorEligible,
    onStartTraining,
    onStatusAction,
  });

  const statusTone = buildStatusTone({
    status,
    isNotYetDue,
    notYetDueLabel,
    repetitionsCount,
    rawMasteryLevel,
  });

  const showFooter = !isFocusMode && statusTone !== null;
  const difficultyLabel = getVerseDifficultyLabel(verse.difficultyLevel);
  const difficultyBadgeClassName = getVerseDifficultyBadgeClassName(
    verse.difficultyLevel
  );

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
        bodyScrollable
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
              <>
                <div className="flex items-center justify-center">
                  {onOpenDifficulty ? (
                    <button
                      type="button"
                      onClick={() => onOpenDifficulty(verse)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        difficultyBadgeClassName
                      )}
                      aria-label={`Пояснение по уровню сложности стиха ${verse.reference}`}
                      title="Что означает эта плашка"
                    >
                      {difficultyLabel}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm",
                        difficultyBadgeClassName
                      )}
                    >
                      {difficultyLabel}
                    </span>
                  )}
                </div>

                {normalizedTags.length > 0 ? (
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
                ) : null}
              </>
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
                : "items-start overflow-visible pt-2 sm:pt-4",
            )}
          >
            <p
              ref={previewTextRef}
              className={cn(
                "w-full max-w-full italic text-center break-words [overflow-wrap:anywhere]",
                isFocusMode
                  ? "whitespace-pre-wrap text-2xl sm:text-[2rem] leading-[1.9] text-foreground"
                  : "text-xl sm:text-2xl leading-relaxed text-foreground/90 font-light",
              )}
            >
              «{verse.text}»
            </p>
          </div>
        }
        centerAction={
          <Button
            data-tour="verse-gallery-primary-cta"
            variant="secondary"
            className={cn(
              "gap-2 min-w-[200px] max-w-full shadow-lg rounded-2xl backdrop-blur-sm",
              primaryAction?.className
            )}
            onClick={primaryAction?.onClick}
            disabled={isActionPending || Boolean(primaryAction?.disabled)}
            aria-label={primaryAction?.ariaLabel}
          >
            {primaryAction ? <primaryAction.icon className="h-4 w-4" /> : null}
            <span className="min-w-0 truncate">{primaryAction?.label}</span>
          </Button>
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

type StatusTone = {
  icon: typeof Brain;
  title: string;
  subtitle: string;
  wrapperClass: string;
  iconWrapClass: string;
  titleClass: string;
  valueClass: string;
  fillClass: string;
  trackClass: string;
  bgFillClass: string;
};

function StatusFooter({
  statusTone,
  totalProgressPercent,
}: {
  statusTone: StatusTone;
  totalProgressPercent: number;
}) {
  return (
    <div className={cn("relative rounded-2xl border overflow-hidden shadow-sm", statusTone.wrapperClass)}>
      {/* Background fill proportional to progress — CSS transition */}
      <div
        className={cn("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out", statusTone.bgFillClass)}
        style={{ width: `${totalProgressPercent}%` }}
      />
      <div className="relative z-10 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl border flex-shrink-0", statusTone.iconWrapClass)}>
              <statusTone.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 text-left">
              <div className={cn("text-[10px] font-semibold uppercase tracking-[0.18em] leading-tight", statusTone.titleClass)}>
                {statusTone.title}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {statusTone.subtitle}
              </div>
            </div>
          </div>
          <div className={cn("text-2xl font-bold tabular-nums flex-shrink-0", statusTone.valueClass)}>
            {totalProgressPercent}%
          </div>
        </div>

        {/* Progress bar — CSS transition instead of motion.div */}
        <div className={cn("relative h-1.5 rounded-full overflow-hidden", statusTone.trackClass)}>
          <div
            className={cn("absolute inset-y-0 left-0 bg-gradient-to-r rounded-full transition-[width] duration-700 ease-out", statusTone.fillClass)}
            style={{ width: `${totalProgressPercent}%` }}
          />
        </div>
      </div>
    </div>
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
  notYetDueLabel: string | null;
  isReviewStage: boolean;
  isAnchorEligible: boolean;
  onStartTraining: () => void;
  onStatusAction: () => void;
}): PrimaryAction | null {
  const { status, isNotYetDue, isReviewStage, isAnchorEligible, onStartTraining, onStatusAction } = params;

  if (status === "CATALOG") {
    return {
      label: "Добавить в мои",
      ariaLabel: "Добавить стих в мои стихи",
      icon: Plus,
      onClick: onStatusAction,
      className:
        "border border-slate-500/25 bg-gradient-to-r from-slate-500/14 to-slate-500/8 text-slate-700 hover:bg-slate-500/18 dark:text-slate-300",
    };
  }
  if (status === VerseStatus.MY) {
    return {
      label: "Добавить в изучение",
      ariaLabel: "Добавить стих в изучение",
      icon: Play,
      onClick: onStatusAction,
      className:
        "border border-sky-500/25 bg-gradient-to-r from-sky-500/18 to-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
    };
  }
  if (status === VerseStatus.STOPPED) {
    return {
      label: "Возобновить",
      ariaLabel: "Возобновить изучение стиха",
      icon: Play,
      onClick: onStatusAction,
      className:
        "border border-rose-500/25 bg-gradient-to-r from-rose-500/16 to-rose-500/8 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300",
    };
  }
  if (isNotYetDue) {
    return {
      label: "Повторять",
      ariaLabel: "Повторять этот стих",
      icon: Clock3,
      onClick: () => {},
      disabled: true,
      className:
        "border border-violet-500/25 bg-gradient-to-r from-violet-500/14 to-violet-500/8 text-violet-700 dark:text-violet-300",
    };
  }
  if (status === "MASTERED") {
    if (isAnchorEligible) {
      return {
        label: "Закрепить",
        ariaLabel: "Перейти к закреплению стиха",
        icon: Anchor,
        onClick: onStartTraining,
        className:
          "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-yellow-400/10 text-amber-800 hover:bg-amber-500/25 dark:text-amber-300",
      };
    }
    return {
      label: "Закрепить",
      ariaLabel: "Недостаточно стихов для закрепления",
      icon: Lock,
      onClick: () => {},
      disabled: true,
      className:
        "border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-yellow-400/10 text-amber-800 dark:text-amber-300 opacity-75 cursor-default",
    };
  }
  if (isReviewStage) {
    return {
      label: "Повторять",
      ariaLabel: "Повторять этот стих",
      icon: Repeat,
      onClick: onStartTraining,
      className:
        "border border-violet-500/25 bg-gradient-to-r from-violet-500/18 to-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300",
    };
  }
  return {
    label: "Учить",
    ariaLabel: "Учить этот стих",
    icon: Brain,
    onClick: onStartTraining,
    className:
      "border border-emerald-500/25 bg-gradient-to-r from-emerald-500/18 to-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
  };
}

function buildStatusTone(params: {
  status: ReturnType<typeof normalizeVerseStatus>;
  isNotYetDue: boolean;
  notYetDueLabel: string | null;
  repetitionsCount: number;
  rawMasteryLevel: number;
}): StatusTone | null {
  const { status, isNotYetDue, notYetDueLabel, repetitionsCount, rawMasteryLevel } = params;
  const repeatThreshold = REPEAT_THRESHOLD_FOR_MASTERED;

  if (status === "CATALOG") {
    return {
      icon: Plus,
      title: "Каталог",
      subtitle: "Добавьте стих в свои, чтобы начать путь",
      wrapperClass: "border-slate-500/20",
      iconWrapClass: "border-slate-500/25 bg-slate-500/12 text-slate-700 dark:text-slate-300",
      titleClass: "text-slate-700/80 dark:text-slate-300/80",
      valueClass: "text-slate-700 dark:text-slate-300",
      fillClass: "from-slate-500 to-slate-400/80",
      trackClass: "bg-slate-500/14",
      bgFillClass: "bg-slate-500/[0.13]",
    };
  }
  if (status === VerseStatus.MY) {
    return {
      icon: Play,
      title: "Мой список",
      subtitle: "Стих ждет первого упражнения",
      wrapperClass: "border-sky-500/20",
      iconWrapClass: "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-300",
      titleClass: "text-sky-700/80 dark:text-sky-300/80",
      valueClass: "text-sky-700 dark:text-sky-300",
      fillClass: "from-sky-500 to-sky-400/80",
      trackClass: "bg-sky-500/14",
      bgFillClass: "bg-sky-500/[0.13]",
    };
  }
  if (status === VerseStatus.STOPPED) {
    return {
      icon: Pause,
      title: "На паузе",
      subtitle: `${rawMasteryLevel + repetitionsCount} из ${TOTAL_REPEATS_AND_STAGE_MASTERY_MAX} шагов`,
      wrapperClass: "border-rose-500/20",
      iconWrapClass: "border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300",
      titleClass: "text-rose-700/80 dark:text-rose-300/80",
      valueClass: "text-rose-700 dark:text-rose-300",
      fillClass: "from-rose-500 to-rose-400/80",
      trackClass: "bg-rose-500/14",
      bgFillClass: "bg-rose-500/[0.13]",
    };
  }
  if (status === "MASTERED") {
    return {
      icon: Trophy,
      title: "Выучен",
      subtitle: "Все этапы пройдены",
      wrapperClass: "border-amber-500/25",
      iconWrapClass: "border-amber-500/30 bg-amber-500/14 text-amber-800 dark:text-amber-300",
      titleClass: "text-amber-800/80 dark:text-amber-300/80",
      valueClass: "text-amber-800 dark:text-amber-300",
      fillClass: "from-amber-500 to-yellow-400/85",
      trackClass: "bg-amber-500/14",
      bgFillClass: "bg-amber-500/[0.13]",
    };
  }
  if (status === "REVIEW") {
    return {
      icon: isNotYetDue ? Clock3 : Repeat,
      title: "Повторение",
      subtitle: isNotYetDue
        ? (notYetDueLabel ?? `Повтор ${repetitionsCount} из ${repeatThreshold}`)
        : `Повтор ${repetitionsCount} из ${repeatThreshold}`,
      wrapperClass: "border-violet-500/20",
      iconWrapClass: "border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-300",
      titleClass: "text-violet-700/80 dark:text-violet-300/80",
      valueClass: "text-violet-700 dark:text-violet-300",
      fillClass: "from-violet-500 to-violet-400/80",
      trackClass: "bg-violet-500/14",
      bgFillClass: "bg-violet-500/[0.13]",
    };
  }
  if (status === VerseStatus.LEARNING) {
    return {
      icon: Brain,
      title: "Изучение",
      subtitle: `Ступень ${rawMasteryLevel} из ${TRAINING_STAGE_MASTERY_MAX}`,
      wrapperClass: "border-emerald-500/20",
      iconWrapClass:
        "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
      titleClass: "text-emerald-700/80 dark:text-emerald-300/80",
      valueClass: "text-emerald-700 dark:text-emerald-300",
      fillClass: "from-emerald-500 to-emerald-400/80",
      trackClass: "bg-emerald-500/14",
      bgFillClass: "bg-emerald-500/[0.13]",
    };
  }
  return null;
}
