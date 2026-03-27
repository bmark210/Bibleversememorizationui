import React from 'react';
import { Users } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
import { Verse } from "@/app/domain/verse";
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import { computeVerseTotalProgressPercent } from '@/shared/training/verseTotalProgress';
import {
  FILTER_VISUAL_THEME,
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
  isPending?: boolean;
  isFocusMode?: boolean;
  isAnchorEligible?: boolean;
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
  isPending = false,
  isFocusMode = false,
  isAnchorEligible = false,
}: SwipeCardProps) => {
  const reduceMotion = useReducedMotion();
  const displayStatus = normalizeDisplayVerseStatus(verse.status);
  const stageVisual = getVerseStageVisual(verse);
  const stageVisualTheme = FILTER_VISUAL_THEME[stageVisual.key];
  const layoutSignature = getVerseCardLayoutSignature(verse);
  const totalProgressPercent = computeVerseTotalProgressPercent(
    verse.masteryLevel,
    verse.repetitions
  );
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
          className:
            'border-status-community/25 bg-status-community-soft text-status-community',
        } : null;
    }
    if (verse.popularityScope === 'players') {
      return popularityValue > 0 ? {
        icon: Users,
          label: `${popularityValue}`,
          className:
            'border-status-collection/25 bg-status-collection-soft text-status-collection',
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
            className="h-9 rounded-full px-2.5 text-foreground/58 hover:bg-muted/35 hover:text-foreground/82"
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
            className="h-9 rounded-full px-2.5 text-foreground/58 hover:bg-muted/35 hover:text-foreground/82"
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
      className="max-w-full border-border/60 bg-background/55"
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
          'inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/25 px-2 py-1 text-[10px] text-muted-foreground/70 shadow-sm transition-colors hover:bg-muted/45',
          popularityChip?.className
        )}
        aria-label={popularityChip?.label ?? 'Открыть список пользователей'}
      >
        <span className="font-semibold tabular-nums">{verse.popularityScope === 'players' ? 'У игроков: ' : 'У друзей: '} {popularityValue}</span>
        <span className="flex -space-x-1.5">
          {popularityPreviewUsers.map((user) => (
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
      </button>
    ) : popularityChip ? (
      <div className="pointer-events-none">
        <Badge
          className={cn(
            'rounded-full border border-border/40 bg-muted/25 px-2 py-0.5 text-[10px] text-muted-foreground/70 shadow-sm',
            popularityChip.className
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
      <AnimatePresence initial={false}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${verse.reference} — нажмите чтобы открыть`}
        onClick={() => {
          haptic('light');
          onOpen();
        }}
        onKeyDown={handleKeyDown}
        className={`
          relative z-10 rounded-3xl p-4 shadow-sm
          border ${stageVisualTheme.cardClassName} 
          active:shadow-md transition-shadow cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        <div className="min-h-full space-y-2.5">
          <div className="flex items-start justify-between gap-3 mb-0">
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-primary break-words [overflow-wrap:anywhere]">
                {verse.reference}
              </h3>
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-2">
              {renderActions()}
            </div>
          </div>

          <p
            className={cn(
              'font-verse text-muted-foreground',
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
                    className="inline-flex items-center gap-0.5 rounded-full border border-border/40 bg-muted/25 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/45"
                    aria-label={`Открыть все теги стиха ${verse.reference}`}
                  >
                    <span className="opacity-50">#</span>
                    {tag.title}
                  </button>
                ) : (
                  <span
                    key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
                    className="inline-flex items-center gap-0.5 rounded-full border border-border/40 bg-muted/25 px-2 py-0.5 text-[10px] text-muted-foreground"
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
                    className="text-[10px] text-muted-foreground/45 self-center transition-colors hover:text-muted-foreground/75"
                    aria-label={`Показать еще ${verse.tags.length - 3} тегов стиха ${verse.reference}`}
                  >
                    +{verse.tags.length - 3}
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground/45 self-center">
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
        {!isFocusMode && (statusMetaContent || waitingMetaContent) ? (
          <motion.div
            key={layoutSignature}
            initial={reduceMotion ? false : { height: 0, opacity: 0, y: -4 }}
            animate={
              reduceMotion
                ? { opacity: 1 }
                : { height: 'auto', opacity: 1, y: 0 }
            }
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0, y: -4 }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
            }
            className="overflow-hidden"
          >
            <div className="flex items-end justify-between gap-3 pt-2">
              <div className="min-w-0 flex-1">
                {statusMetaContent ?? waitingMetaContent}
              </div>
              <button
                type="button"
                onClick={handleOpenProgress}
                className="inline-flex shrink-0 rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label={`Показать путь прогресса стиха ${verse.reference}`}
              >
                <VerseProgressValue progressPercent={totalProgressPercent} size="sm" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </div>
        </AnimatePresence>
    </div>
  );
};

export const SwipeableVerseCard = React.memo(SwipeableVerseCardComponent);
SwipeableVerseCard.displayName = 'SwipeableVerseCard';
