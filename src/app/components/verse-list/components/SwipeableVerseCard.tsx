import React from 'react';
import { Brain, Clock3, Pause, Play, Plus, Repeat, Trash2, Trophy, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { cn } from '@/app/components/ui/utils';
import {
  VerseProgressValue,
  VerseStatusPill,
  type VerseStatusSummaryTone,
} from '@/app/components/VerseStatusSummary';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/shared/domain/verseStatus';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import { TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from '@/shared/training/constants';
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
  onPauseLearning: (verse: Verse) => void;
  onResumeLearning: (verse: Verse) => void;
  onRequestDelete: (verse: Verse) => void;
  isPending?: boolean;
  isFocusMode?: boolean;
};

export const SwipeableVerseCard = ({
  verse,
  onOpen,
  onOpenProgress,
  onOpenOwners,
  onOpenTags,
  onAddToLearning,
  onPauseLearning,
  onResumeLearning,
  onRequestDelete,
  isPending = false,
  isFocusMode = false,
}: SwipeCardProps) => {
  const masteryLevel = Number(verse.masteryLevel ?? 0);
  const displayStatus = normalizeDisplayVerseStatus(verse.status);
  const stageVisual = getVerseStageVisual(verse);
  const stageVisualTheme = FILTER_VISUAL_THEME[stageVisual.key];
  const layoutSignature = getVerseCardLayoutSignature(verse);
  const repetitionsCount = Math.max(0, Number(verse.repetitions ?? 0));
  const totalProgress = Math.min(masteryLevel + repetitionsCount, TOTAL_REPEATS_AND_STAGE_MASTERY_MAX);
  const totalProgressPercent = Math.round((totalProgress / TOTAL_REPEATS_AND_STAGE_MASTERY_MAX) * 100);
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
          'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
      } : null;
    }
    if (verse.popularityScope === 'players') {
      return popularityValue > 0 ? {
        icon: Users,
        label: `${popularityValue}`,
        className:
          'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
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
  const isNotYetDueCard = displayStatus === 'REVIEW' && verse.nextReviewAt
    ? Date.now() < new Date(verse.nextReviewAt).getTime()
    : false;

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

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  const renderActions = () => {
    const primaryAction =
      displayStatus === 'CATALOG'
        ? {
            label: 'В мои',
            title: 'Добавить в мои стихи',
            ariaLabel: 'Добавить стих в список своих',
            icon: Plus,
            dataTour: 'verse-card-add-button',
            onClick: () => onAddToLearning(verse),
          }
        : displayStatus === VerseStatus.MY
          ? {
              label: 'Начать',
              title: 'Начать изучение',
              ariaLabel: 'Добавить стих в изучение',
              icon: Play,
              dataTour: 'verse-card-promote-button',
              onClick: () => onAddToLearning(verse),
            }
          : displayStatus === VerseStatus.STOPPED
            ? {
                label: 'Продолжить',
                title: 'Возобновить изучение',
                ariaLabel: 'Возобновить изучение стиха',
                icon: Play,
                onClick: () => onResumeLearning(verse),
              }
            : {
                label: 'Пауза',
                title: 'Поставить на паузу',
                ariaLabel: 'Поставить стих на паузу',
                icon: Pause,
                onClick: () => onPauseLearning(verse),
              };
    const canDelete = displayStatus !== 'CATALOG';

    return (
      <>
        <Button
          type="button"
          data-tour={primaryAction.dataTour}
          size="sm"
          variant="outline"
          title={primaryAction.title}
          aria-label={primaryAction.ariaLabel}
          disabled={isPending}
          className="h-9 rounded-full border-border/60 bg-background/45 px-3 text-foreground/85 shadow-sm backdrop-blur-sm hover:bg-muted/45"
          onClick={(e) => {
            stopCardOpen(e);
            primaryAction.onClick();
          }}
        >
          <primaryAction.icon className="h-4 w-4 shrink-0" />
          <span className="max-w-[6.5rem] truncate text-[13px] font-medium">
            {primaryAction.label}
          </span>
        </Button>

        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Удалить стих"
            aria-label="Удалить стих"
            disabled={isPending}
            className="h-9 w-9 rounded-full border-border/50 bg-background/35 text-destructive/70 shadow-sm backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              stopCardOpen(e);
              onRequestDelete(verse);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </>
    );
  };

  const statusTone = (() => {
    if (displayStatus === 'MASTERED') {
      return {
        icon: Trophy,
        title: 'Выучен',
        pillClassName: 'border-amber-500/25 bg-amber-500/[0.08]',
        titleClassName: 'text-amber-800/85 dark:text-amber-300/85',
        iconClassName: 'text-amber-700 dark:text-amber-300',
      };
    }
    if (displayStatus === 'REVIEW') {
      return {
        icon: isNotYetDueCard ? Clock3 : Repeat,
        title: isNotYetDueCard ? 'Ждёт повтора' : 'Повторение',
        pillClassName: 'border-violet-500/20 bg-violet-500/[0.08]',
        titleClassName: 'text-violet-700/85 dark:text-violet-300/85',
        iconClassName: 'text-violet-700 dark:text-violet-300',
      };
    }
    if (displayStatus === VerseStatus.STOPPED) {
      return {
        icon: Pause,
        title: 'На паузе',
        pillClassName: 'border-rose-500/20 bg-rose-500/[0.08]',
        titleClassName: 'text-rose-700/85 dark:text-rose-300/85',
        iconClassName: 'text-rose-700 dark:text-rose-300',
      };
    }
    return {
      icon: Brain,
      title: 'Изучение',
      pillClassName: 'border-emerald-500/20 bg-emerald-500/[0.08]',
      titleClassName: 'text-emerald-700/85 dark:text-emerald-300/85',
      iconClassName: 'text-emerald-700 dark:text-emerald-300',
    };
  })() satisfies VerseStatusSummaryTone;

  const statusMetaContent = (displayStatus === VerseStatus.MY || displayStatus === 'CATALOG') ? null : (
    <button
      type="button"
      data-tour="verse-card-progress-button"
      onClick={handleOpenProgress}
      className="inline-flex max-w-full text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-full"
      aria-label={`Показать путь прогресса стиха ${verse.reference}`}
    >
      <VerseStatusPill tone={statusTone} size="sm" className="max-w-full" />
    </button>
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
        <span className="font-semibold tabular-nums">{popularityValue}</span>
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
          <div className="flex items-start justify-between gap-3">
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
        {!isFocusMode && statusMetaContent ? (
          <motion.div
            key={layoutSignature}
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-end justify-between gap-3 pt-2">
              <div className="min-w-0 flex-1">{statusMetaContent}</div>
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
