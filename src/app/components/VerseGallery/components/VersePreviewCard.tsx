import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookMarked, Clock, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { VerseCard } from "@/app/components/VerseCard";
import {
  VerseStatusSummary,
  VerseStatusMetaPill,
  type VerseStatusSummaryTone,
} from "@/app/components/VerseStatusSummary";
import {
  VERSE_CARD_COLOR_CONFIG,
  type VerseCardColorConfig,
} from "@/app/components/verseCardColorConfig";
import type { Verse } from "@/app/domain/verse";
import { VerseStatus } from "@/shared/domain/verseStatus";
import type { PreparedVersePreview } from "../previewModel";
import type { VerseGallerySourceMode } from "../types";
import {
  getGalleryPreviewTone,
  isCatalogGalleryOwnedVerse,
  isCatalogGalleryMode,
} from "../presentation";

type Props = {
  preview: PreparedVersePreview;
  sourceMode?: VerseGallerySourceMode;
  isActionPending: boolean;
  activeTagSlugs?: Set<string> | Iterable<string> | null;
  isFocusMode?: boolean;
  onStartTraining: () => void;
  onStatusAction: () => void;
  onCatalogRemove?: () => void;
  onUtilityAction?: () => void;
  onOpenProgress?: (verse: Verse) => void;
  onOpenTags?: (verse: Verse) => void;
  onOpenOwners?: (verse: Verse) => void;
  onEditQueuePosition?: (verse: Verse) => void;
  onVerticalSwipeStep?: (step: 1 | -1) => void;
  colorConfig?: VerseCardColorConfig;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const VersePreviewCard = React.memo(function VersePreviewCard({
  preview,
  sourceMode = "my",
  isActionPending,
  activeTagSlugs = null,
  isFocusMode = false,
  onStartTraining,
  onStatusAction,
  onCatalogRemove,
  onUtilityAction,
  onOpenProgress,
  onOpenTags,
  onOpenOwners,
  onEditQueuePosition,
  onVerticalSwipeStep,
  colorConfig = VERSE_CARD_COLOR_CONFIG,
}: Props) {
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const previewTextRef = useRef<HTMLParagraphElement>(null);
  const [lineClamp, setLineClamp] = useState(8);
  const {
    verse,
    actionModel,
    tone,
    totalProgressPercent,
    normalizedTags,
    previewUsers,
    popularityValue,
    popularityBadge,
  } = preview;
  const isCatalogMode = isCatalogGalleryMode(sourceMode);
  const isCatalogOwned = isCatalogGalleryOwnedVerse(sourceMode, preview.status);
  const displayTone = getGalleryPreviewTone(sourceMode, tone);
  const tonePalette = colorConfig.tones[displayTone ?? "learning"];
  const activeTagSlugSet = useMemo(() => {
    if (!activeTagSlugs) return new Set<string>();
    // Fast path: already a Set (passed from VerseGallery).
    if (activeTagSlugs instanceof Set) return activeTagSlugs;

    const next = new Set<string>();
    for (const rawSlug of activeTagSlugs) {
      const slug = String(rawSlug ?? "").trim();
      if (!slug) continue;
      next.add(slug);
    }
    return next;
  }, [activeTagSlugs]);
  const visibleTags = useMemo(() => {
    if (normalizedTags.length <= 3 || activeTagSlugSet.size === 0) {
      return normalizedTags.slice(0, 3);
    }

    return [...normalizedTags]
      .sort((left, right) => {
        const leftSlug = String(left.slug ?? "").trim();
        const rightSlug = String(right.slug ?? "").trim();
        const leftActive = Boolean(leftSlug) && activeTagSlugSet.has(leftSlug);
        const rightActive = Boolean(rightSlug) && activeTagSlugSet.has(rightSlug);
        if (leftActive === rightActive) return 0;
        return leftActive ? -1 : 1;
      })
      .slice(0, 3);
  }, [activeTagSlugSet, normalizedTags]);
  const hasOwnersTrigger =
    Boolean(onOpenOwners) &&
    popularityBadge != null &&
    popularityValue != null &&
    popularityValue > 0 &&
    (verse.popularityScope === "friends" || verse.popularityScope === "players");

  const primaryAction = actionModel.primaryAction;
  const waitingActionLabel = actionModel.waitingLabel;
  const statusTone = actionModel.statusTone;
  const showFooter =
    !isFocusMode &&
    !isCatalogMode &&
    actionModel.showProgress &&
    statusTone !== null;
  const inlineUtilityAction =
    !isCatalogMode &&
    primaryAction?.id === "train" &&
    actionModel.utilityAction?.id === "pause"
      ? actionModel.utilityAction
      : null;
  const primaryLabel = isCatalogMode
    ? isCatalogOwned
      ? "Убрать из моих"
      : "Добавить в мои"
    : primaryAction?.label ?? null;
  const primaryAriaLabel = isCatalogMode
    ? isCatalogOwned
      ? `Убрать стих ${verse.reference} из моих`
      : `Добавить стих ${verse.reference} в мои`
    : primaryAction?.ariaLabel ?? undefined;
  const primaryIcon = isCatalogMode
    ? isCatalogOwned
      ? Minus
      : BookMarked
    : primaryAction?.icon;
  const PrimaryIcon = primaryIcon;

  const handlePrimaryAction = useCallback(() => {
    if (isCatalogMode) {
      if (isCatalogOwned) {
        onCatalogRemove?.();
        return;
      }

      onStatusAction();
      return;
    }

    if (!primaryAction) return;

    if (primaryAction.id === "train" || primaryAction.id === "anchor") {
      onStartTraining();
      return;
    }

    onStatusAction();
  }, [
    isCatalogMode,
    isCatalogOwned,
    onCatalogRemove,
    onStartTraining,
    onStatusAction,
    primaryAction,
  ]);

  // ── Line-clamp calculation ──────────────────────────────────────────────────
  // Deferred to useEffect (not useLayoutEffect) so it doesn't block the first
  // paint of the card after a swipe. ResizeObserver is debounced via rAF.
  useEffect(() => {
    if (isFocusMode || typeof window === "undefined") return;

    const bodyEl = previewBodyRef.current;
    const textEl = previewTextRef.current;
    if (!bodyEl || !textEl) return;

    let rafId: number | null = null;

    const updateLineClamp = () => {
      const currentBodyEl = previewBodyRef.current;
      const currentTextEl = previewTextRef.current;
      if (!currentBodyEl || !currentTextEl) return;

      const availableHeight = currentBodyEl.clientHeight;
      if (availableHeight <= 0) return;

      let lineHeight = Number.parseFloat(
        window.getComputedStyle(currentTextEl).lineHeight || "",
      );
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        const fontSize =
          Number.parseFloat(
            window.getComputedStyle(currentTextEl).fontSize || "0",
          ) || 16;
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
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isFocusMode, showFooter, verse.text]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <VerseCard
        isActive
        minHeight="training"
        bodyScrollable={isFocusMode}
        onVerticalSwipeStep={isFocusMode ? onVerticalSwipeStep : undefined}
        previewTone={displayTone}
        colorConfig={colorConfig}
        metaBadge={
          isFocusMode ? null : hasOwnersTrigger ? (
            <button
              type="button"
              onClick={() => onOpenOwners?.(verse)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] shadow-sm transition-colors",
                colorConfig.metaPanelClassName,
                colorConfig.actionButtonHoverClassName,
                popularityBadge?.accentClassName,
              )}
              aria-label={popularityBadge?.label ?? "Открыть список пользователей"}
            >
              {previewUsers.length > 0 ? (
                <span className="flex -space-x-1.5">
                  {previewUsers.map((user) => (
                    <Avatar
                      key={user.telegramId}
                      className={cn("h-4 w-4 border shadow-sm", colorConfig.avatarRingClassName)}
                    >
                      {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                      ) : null}
                      <AvatarFallback
                        className={cn("text-[8px]", colorConfig.avatarFallbackClassName)}
                      >
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
                colorConfig.metaPanelClassName,
                popularityBadge.accentClassName,
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
            <h2 className="text-3xl sm:text-4xl font-serif text-brand-primary italic break-words [overflow-wrap:anywhere]">
              {verse.reference}
            </h2>
            <div
              className={cn(
                "mx-auto h-px w-16 bg-gradient-to-r",
                tonePalette.lineClassName,
              )}
            />
            {!isFocusMode ? (
              normalizedTags.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {visibleTags.map((tag, index) => {
                    return onOpenTags ? (
                      <button
                        key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
                        type="button"
                        onClick={() => onOpenTags(verse)}
                        className={cn(
                          "inline-flex min-h-5 items-center rounded-full border px-3 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
                          colorConfig.tagClassName,
                          colorConfig.tagInteractiveClassName,
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
                          colorConfig.tagClassName
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
                        className={cn(
                          "inline-flex min-h-5 items-center rounded-full border px-3 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
                          colorConfig.tagClassName,
                          colorConfig.tagInteractiveClassName,
                        )}
                        aria-label={`Показать еще ${normalizedTags.length - 3} тегов`}
                      >
                        +{normalizedTags.length - 3}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex min-h-5 items-center rounded-full border px-3 py-0.5 text-[11px] font-medium tracking-wide",
                          colorConfig.tagClassName
                        )}
                      >
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
                  ? "whitespace-pre-wrap text-2xl sm:text-[2rem] leading-[1.9] text-text-secondary"
                  : "max-h-full text-[1.45rem] sm:text-[1.95rem] leading-[1.8] text-text-primary/92 font-normal [display:-webkit-box] [-webkit-box-orient:vertical] overflow-hidden text-ellipsis",
              )}
            >
              «{verse.text}»
            </p>
          </div>
        }
        centerAction={
          PrimaryIcon && primaryLabel ? (
            <div className="flex max-w-full items-center justify-center gap-2.5">
              <Button
                data-tour="verse-gallery-primary-cta"
                variant="secondary"
                className={cn(
                  "gap-2 max-w-full rounded-2xl border shadow-lg backdrop-blur-sm",
                  colorConfig.actionButtonClassName,
                  colorConfig.actionButtonHoverClassName,
                  tonePalette.accentBorderClassName,
                  tonePalette.accentTextClassName,
                  inlineUtilityAction ? "min-w-[184px]" : "min-w-[200px]",
                )}
                onClick={handlePrimaryAction}
                disabled={isActionPending}
                aria-label={primaryAriaLabel}
              >
                <PrimaryIcon className="h-4 w-4" />
                <span className="min-w-0 truncate">{primaryLabel}</span>
              </Button>

              {inlineUtilityAction ? (
                <Button
                  type="button"
                  data-tour="verse-gallery-inline-utility"
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-2xl border shadow-lg backdrop-blur-sm",
                    colorConfig.actionButtonClassName,
                    colorConfig.actionButtonHoverClassName,
                    tonePalette.accentBorderClassName,
                    tonePalette.accentTextClassName,
                  )}
                  onClick={onUtilityAction}
                  disabled={isActionPending}
                  aria-label={inlineUtilityAction.ariaLabel}
                  title={inlineUtilityAction.title}
                >
                  <inlineUtilityAction.icon className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ) : !isCatalogMode && waitingActionLabel ? (
            <div className="flex justify-center">
              <VerseStatusMetaPill
                label={waitingActionLabel}
                className={cn(
                  "gap-2 rounded-2xl px-4 py-3",
                  colorConfig.waitingPillClassName,
                  tonePalette.accentBorderClassName,
                )}
              />
            </div>
          ) : null
        }
        footer={
          isCatalogOwned ? (
            <div className="flex justify-center">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold",
                  "border-status-collection/28 bg-status-collection-soft text-status-collection",
                )}
              >
                <BookMarked className="h-3.5 w-3.5 shrink-0" />
                <span>В моих</span>
              </span>
            </div>
          ) : preview.status === VerseStatus.QUEUE ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => onEditQueuePosition?.(verse)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border border-status-queue/28 bg-status-queue-soft px-3 py-1.5 text-[12px] font-semibold text-status-queue',
                  onEditQueuePosition
                    ? 'cursor-pointer transition-opacity hover:opacity-75 active:scale-95'
                    : 'cursor-default',
                )}
                aria-label="Изменить позицию в очереди"
              >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>В очереди</span>
                {typeof verse.queuePosition === 'number' && verse.queuePosition > 0 && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="tabular-nums">#{verse.queuePosition}</span>
                  </>
                )}
              </button>
            </div>
          ) : showFooter && statusTone ? (
            <button
              type="button"
              onClick={() => onOpenProgress?.(verse)}
              className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl"
              aria-label={`Показать путь прогресса стиха ${verse.reference}`}
            >
              <StatusFooter
                statusTone={statusTone}
                totalProgressPercent={totalProgressPercent}
                colorConfig={colorConfig}
                progressClassName={tonePalette.progressClassName}
              />
            </button>
          ) : null
        }
      />
    </div>
  );
});

// ─── Status footer (CSS transitions, no motion.div) ──────────────────────────

type StatusTone = VerseStatusSummaryTone;

function StatusFooter({
  statusTone,
  totalProgressPercent,
  colorConfig,
  progressClassName,
}: {
  statusTone: StatusTone;
  totalProgressPercent: number;
  colorConfig: VerseCardColorConfig;
  progressClassName: string;
}) {
  return (
    <VerseStatusSummary
      tone={statusTone}
      progressPercent={totalProgressPercent}
      className={colorConfig.summaryPanelClassName}
      progressClassName={progressClassName}
    />
  );
}
