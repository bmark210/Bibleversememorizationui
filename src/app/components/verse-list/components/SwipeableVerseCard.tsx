import React from 'react';
import { Archive, BookMarked, Clock, Users, X } from 'lucide-react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { cn } from '@/app/components/ui/utils';
import {
  VerseProgressValue,
  VerseStatusMetaPill,
  VerseStatusPill,
} from '@/app/components/VerseStatusSummary';
import { resolveVerseCardActionModel } from '@/app/components/verseCardActionModel';
import {
  VERSE_CARD_COLOR_CONFIG,
  type VerseCardColorConfig,
} from '@/app/components/verseCardColorConfig';
import { Verse } from "@/app/domain/verse";
import { VerseStatus } from '@/shared/domain/verseStatus';
import {
  getVerseDisplayStatus,
  getVerseProgressPercent,
} from '@/shared/verseRules';
import {
  getVerseCardLayoutSignature,
  getVerseStageVisual,
} from '../constants';
import { haptic } from '../haptics';

export type SwipeCardProps = {
  verse: Verse;
  onOpen: () => void;
  onOpenProgress?: (verse: Verse) => void;
  onOpenOwners?: (verse: Verse) => void;
  onOpenTags?: (verse: Verse) => void;
  onAddToLearning: (verse: Verse) => void;
  onStartTraining?: (verse: Verse) => void;
  onPauseLearning: (verse: Verse) => void;
  onResumeLearning: (verse: Verse) => void;
  onEditQueuePosition?: (verse: Verse) => void;
  onRemoveFromQueue?: (verse: Verse) => void;
  isPending?: boolean;
  isFocusMode?: boolean;
  isCatalogMode?: boolean;
  isAnchorEligible?: boolean;
  colorConfig?: VerseCardColorConfig;
};

const SwipeableVerseCardComponent = ({
  verse,
  onOpen,
  onOpenProgress,
  onOpenOwners,
  onOpenTags,
  onAddToLearning,
  onStartTraining,
  onPauseLearning,
  onResumeLearning,
  onEditQueuePosition,
  onRemoveFromQueue,
  isPending = false,
  isFocusMode = false,
  isCatalogMode = false,
  isAnchorEligible = false,
  colorConfig = VERSE_CARD_COLOR_CONFIG,
}: SwipeCardProps) => {
  const displayStatus = getVerseDisplayStatus(verse);
  const stageVisual = getVerseStageVisual(verse);
  const tonePalette = colorConfig.tones[stageVisual.key];
  const layoutSignature = getVerseCardLayoutSignature(verse);
  const totalProgressPercent = getVerseProgressPercent(verse);
  const popularityValue =
    typeof verse.popularityValue === 'number'
      ? Math.max(0, Math.round(verse.popularityValue))
      : null;
  const popularityChip = (() => {
    if (popularityValue == null) return null;
    if (verse.popularityScope === 'friends') {
      return popularityValue > 0 ? {
        icon: Users,
          label: `${popularityValue}`,
          accentClassName: colorConfig.popularity.friends.accentClassName,
        } : null;
    }
    if (verse.popularityScope === 'players') {
      return popularityValue > 0 ? {
        icon: Users,
          label: `${popularityValue}`,
          accentClassName: colorConfig.popularity.players.accentClassName,
        } : null;
    }
    return null;
  })();
  const popularityPreviewUsers = Array.isArray(verse.popularityPreviewUsers)
    ? verse.popularityPreviewUsers.slice(0, 3)
    : [];
  const hasOwnersTrigger =
    Boolean(onOpenOwners) &&
    popularityChip != null &&
    popularityValue != null &&
    popularityValue > 0 &&
    (verse.popularityScope === 'friends' || verse.popularityScope === 'players');
  const nextReviewAt =
    displayStatus === 'REVIEW' && (verse.nextReviewAt ?? verse.nextReview)
      ? new Date(verse.nextReviewAt ?? verse.nextReview ?? '')
      : null;
  const ctaModel = resolveVerseCardActionModel({
    status: displayStatus,
    flow: verse.flow,
    nextReviewAt,
    isAnchorEligible,
  });
  const visiblePrimaryAction =
    ctaModel.primaryAction?.id === 'train' ? null : ctaModel.primaryAction;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.currentTarget !== e.target) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      haptic('light');
      onOpen();
    }
  };

  const stopCardOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const handleOpenTags = (e: React.MouseEvent | React.KeyboardEvent) => {
    stopCardOpen(e);
    if (!verse.tags || verse.tags.length === 0) return;
    if (!onOpenTags) return;
    haptic('light');
    onOpenTags?.(verse);
  };

  const handleOpenProgress = (e: React.MouseEvent | React.KeyboardEvent) => {
    stopCardOpen(e);
    if (!onOpenProgress) return;
    haptic('light');
    onOpenProgress(verse);
  };

  const handlePrimaryAction = () => {
    const action = visiblePrimaryAction;
    if (!action) return;

    if (action.id === 'add-to-my' || action.id === 'start-learning') {
      onAddToLearning(verse);
      return;
    }

    if (action.id === 'resume') {
      onResumeLearning(verse);
      return;
    }

    if (action.id === 'train' || action.id === 'anchor') {
      if (!onStartTraining) return;
      onStartTraining(verse);
    }
  };

  const handleUtilityAction = () => {
    if (ctaModel.utilityAction?.id !== 'pause') return;
    onPauseLearning(verse);
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  const renderActions = () => {
    // Queue mode: show remove-from-queue button
    if (displayStatus === VerseStatus.QUEUE) {
      return (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Убрать из очереди"
          aria-label={`Убрать ${verse.reference} из очереди`}
          disabled={isPending}
          className={cn(
            "h-9 rounded-full px-3 text-[12px] font-medium",
            colorConfig.actionButtonClassName,
            colorConfig.actionButtonHoverClassName,
            tonePalette.accentBorderClassName,
            tonePalette.accentTextClassName,
          )}
          onClick={(e) => {
            stopCardOpen(e);
            onRemoveFromQueue?.(verse);
          }}
        >
          <X className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[8rem] truncate text-[12px] font-medium">Убрать</span>
        </Button>
      );
    }

    // Catalog mode only shows verses that are not yet in "Мои стихи".
    if (isCatalogMode) {
      return (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Добавить в мои стихи"
          aria-label={`Добавить ${verse.reference} в мои стихи`}
          disabled={isPending}
          className={cn(
            "h-9 rounded-full px-3 text-[12px] font-medium",
            colorConfig.actionButtonClassName,
            colorConfig.actionButtonHoverClassName,
            tonePalette.accentBorderClassName,
            tonePalette.accentTextClassName,
          )}
          onClick={(e) => {
            stopCardOpen(e);
            onAddToLearning(verse);
          }}
        >
          <BookMarked className="h-3.5 w-3.5 shrink-0" />
          <span className="max-w-[8rem] truncate text-[12px] font-medium">Добавить в мои</span>
        </Button>
      );
    }

    const primaryAction = visiblePrimaryAction;
    const utilityAction = ctaModel.utilityAction;
    const primaryNeedsTraining =
      primaryAction?.id === 'train' || primaryAction?.id === 'anchor';
    const primaryDisabled = isPending || (primaryNeedsTraining && !onStartTraining);

    return (
      <>
        {primaryAction ? (
          <Button
            type="button"
            data-tour={primaryAction.dataTour}
            size="sm"
            variant="ghost"
            title={primaryAction.title}
            aria-label={primaryAction.ariaLabel}
            disabled={primaryDisabled}
            className={cn(
              "h-9 rounded-full px-3 text-[12px] font-medium",
              colorConfig.actionButtonClassName,
              colorConfig.actionButtonHoverClassName,
              tonePalette.accentBorderClassName,
              tonePalette.accentTextClassName,
            )}
            onClick={(e) => {
              stopCardOpen(e);
              handlePrimaryAction();
            }}
          >
            <primaryAction.icon className="h-4 w-4 shrink-0" />
            <span className="max-w-[8rem] truncate text-[12px] font-medium">
              {primaryAction.label}
            </span>
          </Button>
        ) : null}

        {utilityAction ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title={utilityAction.title}
            aria-label={utilityAction.ariaLabel}
            disabled={isPending}
            className={cn(
              "h-9 rounded-full px-3 text-[12px] font-medium",
              colorConfig.actionButtonClassName,
              colorConfig.actionButtonHoverClassName,
              tonePalette.accentBorderClassName,
              tonePalette.accentTextClassName,
            )}
            onClick={(e) => {
              stopCardOpen(e);
              handleUtilityAction();
            }}
          >
            <utilityAction.icon className="h-4 w-4 shrink-0" />
            <span className="text-[12px] font-medium">{utilityAction.label}</span>
          </Button>
        ) : null}
      </>
    );
  };

  const waitingMetaContent = ctaModel.waitingLabel ? (
    <VerseStatusMetaPill
      label={ctaModel.waitingLabel}
      size="sm"
      className={cn("max-w-full", colorConfig.waitingPillClassName)}
    />
  ) : null;

  const statusMetaContent =
    !ctaModel.showProgress || !ctaModel.statusTone ? null : (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <button
        type="button"
        data-tour="verse-card-progress-button"
        onClick={handleOpenProgress}
        className="inline-flex max-w-full items-center text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-full"
        aria-label={`Показать путь прогресса стиха ${verse.reference}`}
      >
        <VerseStatusPill tone={ctaModel.statusTone} size="sm" className="max-w-full" />
      </button>
      {waitingMetaContent}
    </div>
  );

  const socialMetaContent = !isFocusMode ? (
    hasOwnersTrigger ? (
      <button
        type="button"
        onClick={(event) => {
          stopCardOpen(event);
          onOpenOwners?.(verse);
        }}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] shadow-sm transition-colors',
          colorConfig.metaPanelClassName,
          colorConfig.actionButtonHoverClassName,
          popularityChip?.accentClassName
        )}
        aria-label={popularityChip?.label ?? 'Открыть список пользователей'}
      >
        <span className="font-semibold tabular-nums">{verse.popularityScope === 'players' ? 'У игроков: ' : 'У друзей: '} {popularityValue}</span>
        <span className="flex -space-x-1.5">
          {popularityPreviewUsers.map((user) => (
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
      </button>
    ) : popularityChip ? (
      <div className="pointer-events-none">
        <Badge
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[10px] shadow-sm',
            colorConfig.metaPanelClassName,
            popularityChip.accentClassName
          )}
        >
          <popularityChip.icon className="w-3.5 h-3.5" />
          {popularityChip.label}
        </Badge>
      </div>
    ) : null
  ) : null;

  return (
    <div className="relative isolate verse-card-appear">
      <div
        role="button"
        tabIndex={0}
        aria-label={`${verse.reference} — нажмите чтобы открыть`}
        onClick={() => {
          haptic('light');
          onOpen();
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative z-10 rounded-[1.9rem] p-[1px] shadow-[var(--shadow-elevated)] transition-[box-shadow,transform] cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          tonePalette.frameClassName
        )}
      >
        <div
          className={cn(
            "relative min-h-full overflow-hidden rounded-[calc(1.9rem-1px)] border p-4 bg-bg-elevated",
            colorConfig.surfaceBorderClassName,
            tonePalette.surfaceClassName
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0",
              tonePalette.surfaceTintClassName
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-8 right-8 top-0 h-[3px] bg-gradient-to-r",
              tonePalette.lineClassName
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -top-8 left-1/2 h-20 w-[72%] -translate-x-1/2 rounded-full blur-3xl",
              tonePalette.glowClassName
            )}
          />
          <div className="relative min-h-full space-y-2.5">
            <div className="mb-0 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-brand-primary break-words [overflow-wrap:anywhere]">
                {verse.reference}
                </h3>
              </div>

              <div className="flex flex-shrink-0 items-center justify-end gap-2">
                {renderActions()}
              </div>
            </div>

            <p
              className={cn(
                'font-verse text-text-secondary',
                isFocusMode
                  ? 'text-base leading-[1.75] whitespace-pre-wrap break-words'
                  : 'text-[0.98rem] leading-[1.72] line-clamp-3'
              )}
            >
              {verse.text}
            </p>

            {!isFocusMode && verse.tags && verse.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {verse.tags.slice(0, 3).map((tag, index) =>
                  onOpenTags ? (
                    <button
                      key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
                      type="button"
                      onClick={handleOpenTags}
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full border px-2.5 py-0.5 text-[10px] transition-colors",
                        colorConfig.tagClassName,
                        colorConfig.tagInteractiveClassName
                      )}
                      aria-label={`Открыть все теги стиха ${verse.reference}`}
                    >
                      <span className="opacity-50">#</span>
                      {tag.title}
                    </button>
                  ) : (
                    <span
                      key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full border px-2.5 py-0.5 text-[10px]",
                        colorConfig.tagClassName
                      )}
                    >
                      <span className="opacity-50">#</span>
                      {tag.title}
                    </span>
                  ),
                )}
                {verse.tags.length > 3 && (
                  onOpenTags ? (
                    <button
                      type="button"
                      onClick={handleOpenTags}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] transition-colors",
                        colorConfig.tagClassName,
                        colorConfig.tagInteractiveClassName
                      )}
                      aria-label={`Показать еще ${verse.tags.length - 3} тегов стиха ${verse.reference}`}
                    >
                      +{verse.tags.length - 3}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px]",
                        colorConfig.tagClassName
                      )}
                    >
                      +{verse.tags.length - 3}
                    </span>
                  )
                )}
              </div>
            )}

            {socialMetaContent ? (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
               {socialMetaContent}
              </div>
            ) : null}
          </div>
          {!isFocusMode && !isCatalogMode && displayStatus === VerseStatus.MY ? (
            <div key="my-shelf" className="relative overflow-hidden">
              <div className="flex items-center pt-3">
                <div className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                  'border-status-collection/28 bg-status-collection-soft text-status-collection',
                  'text-[11px] font-semibold',
                )}>
                  <Archive className="h-3 w-3 shrink-0" />
                  <span>На полке</span>
                </div>
              </div>
            </div>
          ) : !isFocusMode && displayStatus === VerseStatus.QUEUE ? (
            <div key={layoutSignature} className="relative overflow-hidden">
              <div className="flex items-end justify-between gap-3 pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    stopCardOpen(e);
                    if (onEditQueuePosition) {
                      haptic('light');
                      onEditQueuePosition(verse);
                    }
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-status-queue/28 bg-status-queue-soft px-2.5 py-1 text-[11px] font-semibold text-status-queue',
                    onEditQueuePosition
                      ? 'cursor-pointer transition-opacity hover:opacity-75 active:scale-95'
                      : 'cursor-default',
                  )}
                  aria-label="Изменить позицию в очереди"
                >
                  <Clock className="h-3 w-3 shrink-0" />
                  {verse.queuePosition === 1 ? (
                    <span>Следующий</span>
                  ) : (
                    <span>В очереди</span>
                  )}
                  {typeof verse.queuePosition === 'number' && verse.queuePosition > 1 && (
                    <>
                      <span className="opacity-40">·</span>
                      <span className="tabular-nums">#{verse.queuePosition}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : !isFocusMode && (statusMetaContent || waitingMetaContent) ? (
            <div
              key={layoutSignature}
              className="relative overflow-hidden"
            >
              <div className="flex items-end justify-between gap-3 pt-3">
                <div className="min-w-0 flex-1">
                  {statusMetaContent ?? waitingMetaContent}
                </div>
                <button
                  type="button"
                  onClick={handleOpenProgress}
                  className={cn(
                    "inline-flex shrink-0 rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    colorConfig.summaryCompactPanelClassName,
                    tonePalette.accentBorderClassName
                  )}
                  aria-label={`Показать путь прогресса стиха ${verse.reference}`}
                >
                  <VerseProgressValue
                    progressPercent={totalProgressPercent}
                    size="sm"
                    className={tonePalette.progressClassName}
                  />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const SwipeableVerseCard = React.memo(SwipeableVerseCardComponent);
SwipeableVerseCard.displayName = 'SwipeableVerseCard';
