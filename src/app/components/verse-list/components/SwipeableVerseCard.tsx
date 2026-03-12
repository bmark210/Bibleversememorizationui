import React from 'react';
import { Brain, Clock3, Pause, Play, Plus, Repeat, Trash2, Trophy, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { cn } from '@/app/components/ui/utils';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/shared/domain/verseStatus';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import { REPEAT_THRESHOLD_FOR_MASTERED, TRAINING_STAGE_MASTERY_MAX, TOTAL_REPEATS_AND_STAGE_MASTERY_MAX } from '@/shared/training/constants';
import {
  FILTER_VISUAL_THEME,
  getStoppedVerseStageKind,
  getVerseCardLayoutSignature,
  getVerseStageVisual,
} from '../constants';
import { haptic } from '../haptics';

export type SwipeCardProps = {
  verse: Verse;
  onOpen: () => void;
  onOpenOwners?: (verse: Verse) => void;
  onOpenTags?: (verse: Verse) => void;
  onAddToLearning: (verse: Verse) => void;
  onPauseLearning: (verse: Verse) => void;
  onResumeLearning: (verse: Verse) => void;
  onRequestDelete: (verse: Verse) => void;
  isPending?: boolean;
};

export const SwipeableVerseCard = ({
  verse,
  onOpen,
  onOpenOwners,
  onOpenTags,
  onAddToLearning,
  onPauseLearning,
  onResumeLearning,
  onRequestDelete,
  isPending = false,
}: SwipeCardProps) => {
  const masteryLevel = Number(verse.masteryLevel ?? 0);
  const displayStatus = normalizeDisplayVerseStatus(verse.status);
  const stoppedStageKind =
    displayStatus === VerseStatus.STOPPED ? getStoppedVerseStageKind(verse) : null;
  const isStoppedReviewCard = displayStatus === VerseStatus.STOPPED && stoppedStageKind === 'review';
  const isStoppedMasteredCard = displayStatus === VerseStatus.STOPPED && stoppedStageKind === 'mastered';
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
  const waitingUntilLabel = (() => {
    if (!verse.nextReviewAt) return null;
    const date = new Date(verse.nextReviewAt);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  })();
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

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

  const renderActions = () => {
    // Глобальный стих, не добавленный пользователем — только кнопка "Добавить"
    if (displayStatus === 'CATALOG') {
      return (
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Добавить в мои стихи"
          aria-label="Добавить стих в список своих"
          disabled={isPending}
          className="rounded-lg bg-primary/5"
          onClick={(e) => {
            stopCardOpen(e);
            onAddToLearning(verse);
          }}
        >
          <Plus className="w-4 h-4 text-foreground/75" />
        </Button>
      );
    }

    if (displayStatus === VerseStatus.MY) {
      return (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Добавить в изучение"
            aria-label="Добавить стих в изучение"
            disabled={isPending}
            className="rounded-lg bg-primary/5"
            onClick={(e) => {
              stopCardOpen(e);
              onAddToLearning(verse);
            }}
          >
            <Play className="w-4 h-4 text-foreground/75" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Удалить стих"
            aria-label="Удалить стих"
            disabled={isPending}
            className="rounded-lg bg-primary/5"
            onClick={(e) => {
              stopCardOpen(e);
              onRequestDelete(verse);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive/75" />
          </Button>
        </>
      );
    }

    if (
      displayStatus === VerseStatus.LEARNING ||
      displayStatus === 'REVIEW' ||
      displayStatus === 'MASTERED'
    ) {
      return (
        <>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Поставить на паузу"
            aria-label="Поставить стих на паузу"
            disabled={isPending}
            className="rounded-lg bg-primary/5"
            onClick={(e) => {
              stopCardOpen(e);
              onPauseLearning(verse);
            }}
          >
            <Pause className="w-4 h-4 text-foreground/75" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Удалить стих"
            aria-label="Удалить стих"
            disabled={isPending}
            className="rounded-lg bg-primary/5"
            onClick={(e) => {
              stopCardOpen(e);
              onRequestDelete(verse);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive/75" />
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Возобновить изучение"
          aria-label="Возобновить изучение стиха"
          disabled={isPending}
          className="rounded-lg bg-primary/5"
          onClick={(e) => {
            stopCardOpen(e);
            onResumeLearning(verse);
          }}
        >
          <Play className="w-4 h-4 text-foreground/75" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Удалить стих"
          aria-label="Удалить стих"
          disabled={isPending}
          className="rounded-lg bg-primary/5 text-destructive hover:text-destructive"
          onClick={(e) => {
            stopCardOpen(e);
            onRequestDelete(verse);
          }}
        >
          <Trash2 className="w-4 h-4 text-destructive/75" />
        </Button>
      </>
    );
  };

  const statusTone = (() => {
    if (displayStatus === 'MASTERED') {
      return {
        icon: Trophy,
        title: 'Выучен',
        subtitle: `${repetitionsCount} повторений`,
        wrapperClass: 'border-amber-500/25',
        bgFillClass: 'bg-amber-500/[0.12]',
        titleClass: 'text-amber-800/85 dark:text-amber-300/85',
        valueClass: 'text-amber-800 dark:text-amber-300',
        iconColorClass: 'text-amber-700 dark:text-amber-300',
        trackClass: 'bg-amber-500/12',
        fillClass: 'from-amber-500 to-yellow-400/85',
      };
    }
    if (displayStatus === 'REVIEW') {
      return {
        icon: isNotYetDueCard ? Clock3 : Repeat,
        title: 'Повторение',
        subtitle: isNotYetDueCard && waitingUntilLabel
          ? `Доступно в ${waitingUntilLabel}`
          : `Повтор ${repetitionsCount} из ${REPEAT_THRESHOLD_FOR_MASTERED}`,
        wrapperClass: 'border-violet-500/20',
        bgFillClass: 'bg-violet-500/[0.12]',
        titleClass: 'text-violet-700/85 dark:text-violet-300/85',
        valueClass: 'text-violet-700 dark:text-violet-300',
        iconColorClass: 'text-violet-700 dark:text-violet-300',
        trackClass: 'bg-violet-500/12',
        fillClass: 'from-violet-500 to-violet-400/80',
      };
    }
    if (displayStatus === VerseStatus.STOPPED) {
      const subtitle = isStoppedMasteredCard
        ? `Выучен · ${repetitionsCount} повт.`
        : isStoppedReviewCard
          ? `Повтор ${repetitionsCount} из ${REPEAT_THRESHOLD_FOR_MASTERED}`
          : `Ступень ${masteryLevel} из ${TRAINING_STAGE_MASTERY_MAX}`;
      return {
        icon: Pause,
        title: 'На паузе',
        subtitle,
        wrapperClass: 'border-rose-500/20',
        bgFillClass: 'bg-rose-500/[0.12]',
        titleClass: 'text-rose-700/85 dark:text-rose-300/85',
        valueClass: 'text-rose-700 dark:text-rose-300',
        iconColorClass: 'text-rose-700 dark:text-rose-300',
        trackClass: 'bg-rose-500/12',
        fillClass: 'from-rose-500 to-rose-400/80',
      };
    }
    return {
      icon: Brain,
      title: 'Изучение',
      subtitle: `Ступень ${masteryLevel} из ${TRAINING_STAGE_MASTERY_MAX}`,
      wrapperClass: 'border-emerald-500/20',
      bgFillClass: 'bg-emerald-500/[0.12]',
      titleClass: 'text-emerald-700/85 dark:text-emerald-300/85',
      valueClass: 'text-emerald-700 dark:text-emerald-300',
      iconColorClass: 'text-emerald-700 dark:text-emerald-300',
      trackClass: 'bg-emerald-500/12',
      fillClass: 'from-emerald-500 to-emerald-400/80',
    };
  })();

  const statusMetaContent = (displayStatus === VerseStatus.MY || displayStatus === 'CATALOG') ? null : (
    <div className={cn('relative rounded-xl border overflow-hidden', statusTone.wrapperClass)}>
      <div
        className={cn('absolute inset-y-0 left-0 transition-[width] duration-700 ease-out', statusTone.bgFillClass)}
        style={{ width: `${totalProgressPercent}%` }}
      />
      <div className="relative z-10 flex items-center gap-2 px-2.5 py-1.5">
        <statusTone.icon className={cn('h-3.5 w-3.5 flex-shrink-0', statusTone.iconColorClass)} />
        <span className={cn('text-[10px] font-semibold uppercase tracking-[0.12em]', statusTone.titleClass)}>
          {statusTone.title}
        </span>
        <span className="h-3 w-px bg-border/50 flex-shrink-0" aria-hidden="true" />
        <span className="text-[10px] text-muted-foreground flex-1 truncate min-w-0">
          {statusTone.subtitle}
        </span>
        <span className={cn('text-[10px] font-bold tabular-nums flex-shrink-0', statusTone.valueClass)}>
          {totalProgressPercent}%
        </span>
      </div>
      <div className={cn('h-[3px]', statusTone.trackClass)}>
        <div
          className={cn('h-full bg-gradient-to-r transition-[width] duration-700 ease-out', statusTone.fillClass)}
          style={{ width: `${totalProgressPercent}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="relative isolate">
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
          relative z-10 rounded-2xl p-4 shadow-sm
          border ${stageVisualTheme.cardClassName} 
          active:shadow-md transition-shadow cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        `}
      >
        <div className="flex items-start justify-between gap-3 min-h-full space-y-2">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-primary">{verse.reference}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{verse.text}</p>
            
              {verse.tags && verse.tags.length > 0 && (
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
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {renderActions()}
          </div>
        </div>
        <div className="flex items-center gap-2 justify-between">
        {statusMetaContent ? (
                <motion.div
                key={layoutSignature}
                initial={{ height: 0, opacity: 0, y: -4 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
                >
                  <div className="pt-0.5">{statusMetaContent}</div>
                </motion.div>
              ) : <div className="w-full h-4"></div>}

        {hasOwnersTrigger ? (
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
        ) : null}
        </div>
      </div>
        </AnimatePresence>
    </div>
  );
};
