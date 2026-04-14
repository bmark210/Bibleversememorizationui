import React from "react";
import { useCallback, useRef } from "react";
import { ArrowRightLeft, BookMarked, BookOpen, Minus, Pause, Play, Trash2 } from "lucide-react";
import { VerseCard } from "@/app/components/VerseCard";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { VerseTagPills, VerseStatePill } from "@/app/components/texts/TextCards";
import type { Verse } from "@/app/domain/verse";
import type { PreparedVersePreview } from "../previewModel";
import type {
  VerseGalleryPrimaryActionOverride,
  VerseGallerySourceMode,
} from "../types";
import { usePreviewLineClamp } from "../hooks/usePreviewLineClamp";
import {
  isCatalogGalleryOwnedVerse,
  isCatalogGalleryMode,
} from "../presentation";
import type { VerseCardColorConfig } from "@/app/components/verseCardColorConfig";
import { resolveTextVersePresentation } from "@/app/components/texts/resolveTextVersePresentation";

type Props = {
  preview: PreparedVersePreview;
  sourceMode?: VerseGallerySourceMode;
  isActionPending: boolean;
  activeTagSlugs?: Set<string> | Iterable<string> | null;
  isFocusMode?: boolean;
  onStartTraining: () => void;
  onStatusAction: () => void;
  onCatalogRemove?: () => void;
  onDeleteRequest?: () => void;
  onReplaceRequest?: () => void;
  onUtilityAction?: () => void;
  onOpenProgress?: (verse: Verse) => void;
  onOpenTags?: (verse: Verse) => void;
  onOpenOwners?: (verse: Verse) => void;
  onEditQueuePosition?: (verse: Verse) => void;
  onOpenAnnotation?: (verse: Verse) => void;
  onVerticalSwipeStep?: (step: 1 | -1) => void;
  colorConfig?: VerseCardColorConfig;
  primaryActionOverride?: VerseGalleryPrimaryActionOverride | null;
};

export const VersePreviewCard = React.memo(function VersePreviewCard({
  preview,
  sourceMode = "my",
  isActionPending,
  activeTagSlugs: _activeTagSlugs = null,
  isFocusMode = false,
  onStartTraining: _onStartTraining,
  onStatusAction,
  onCatalogRemove,
  onDeleteRequest,
  onReplaceRequest,
  // onUtilityAction,
  onOpenProgress: _onOpenProgress,
  onOpenTags,
  onOpenOwners: _onOpenOwners,
  onEditQueuePosition: _onEditQueuePosition,
  onOpenAnnotation,
  onVerticalSwipeStep,
  colorConfig: _colorConfig,
  primaryActionOverride = null,
}: Props) {
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const lineClamp = usePreviewLineClamp(preview.verse.text, isFocusMode, previewBodyRef);
  const { verse } = preview;
  const isCatalogMode = isCatalogGalleryMode(sourceMode);
  const isCatalogOwned = isCatalogGalleryOwnedVerse(sourceMode, preview.status);
  const presentation = resolveTextVersePresentation(verse);
  const minimalStateLabel = isCatalogMode
    ? isCatalogOwned
      ? "В текстах"
      : "Стихи"
    : presentation.label;
  const minimalStateToneClass = isCatalogMode
    ? isCatalogOwned
      ? "border-brand-primary/20 bg-brand-primary/10 text-brand-primary"
      : "border-border-subtle bg-bg-surface/80 text-text-secondary"
    : presentation.toneClassName;
  const statusButton = !isCatalogMode && presentation.actionKind
    ? {
        label: presentation.actionKind === "resume" ? "Возобновить" : "Пауза",
        icon: presentation.actionKind === "resume" ? Play : Pause,
      }
    : null;
  const CatalogIcon = primaryActionOverride
    ? primaryActionOverride.icon
    : isCatalogOwned
      ? Minus
      : BookMarked;
  const catalogLabel = primaryActionOverride
    ? primaryActionOverride.label
    : isCatalogOwned
      ? "Убрать из текстов"
      : "Добавить в коробку";

  const handleCatalogAction = useCallback(() => {
    if (primaryActionOverride) {
      primaryActionOverride.onClick(verse);
      return;
    }

    if (isCatalogOwned) {
      onCatalogRemove?.();
      return;
    }

    onStatusAction();
  }, [isCatalogOwned, onCatalogRemove, onStatusAction, primaryActionOverride, verse]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <VerseCard
        isActive
        minHeight="training"
        bodyScrollable={isFocusMode}
        onVerticalSwipeStep={isFocusMode ? onVerticalSwipeStep : undefined}
        shellClassName="max-w-3xl"
        contentClassName={isFocusMode ? "pr-1" : undefined}
        header={
          <div className={cn("w-full min-w-0", isFocusMode ? "space-y-4" : "space-y-3")}>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                className={cn(
                  "min-w-0 truncate [font-family:var(--font-heading)] font-semibold tracking-tight text-text-primary",
                  isFocusMode ? "text-[1.95rem] sm:text-[2.15rem]" : "text-[1.6rem] sm:text-[1.75rem]",
                )}
              >
                {verse.reference}
              </h2>
              <VerseStatePill
                label={minimalStateLabel}
                toneClassName={minimalStateToneClass}
              />
            </div>
          </div>
        }
        body={
          <div
            ref={previewBodyRef}
            className={cn(
              "flex h-full min-w-0 flex-col px-1",
              isFocusMode
                ? "items-start pt-1 sm:pt-2"
                : "items-start justify-center gap-4 overflow-hidden",
            )}
          >
            <p
              style={isFocusMode ? undefined : { WebkitLineClamp: lineClamp }}
              className={cn(
                "w-full max-w-[34ch] break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-text-secondary",
                isFocusMode
                  ? "text-[1.35rem] leading-[2] sm:text-[1.55rem]"
                  : "text-[1.18rem] leading-8 [display:-webkit-box] [-webkit-box-orient:vertical] overflow-hidden text-ellipsis sm:text-[1.3rem]",
              )}
            >
              {verse.text}
            </p>

            <VerseTagPills
              tags={verse.tags}
              onPress={onOpenTags ? () => onOpenTags(verse) : undefined}
              className={isFocusMode ? "mt-5" : undefined}
            />
          </div>
        }
        footer={
          <div className="flex flex-wrap gap-2">
            {isCatalogMode ? (
              <Button
                type="button"
                size="sm"
                className="h-11 rounded-full px-4 shadow-[var(--shadow-soft)] sm:px-5"
                disabled={isActionPending}
                onClick={handleCatalogAction}
                aria-label={primaryActionOverride?.ariaLabel ?? catalogLabel}
              >
                <CatalogIcon className="h-4 w-4" />
                {catalogLabel}
              </Button>
            ) : statusButton ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full px-3"
                disabled={isActionPending}
                onClick={onStatusAction}
              >
                <statusButton.icon className="h-4 w-4" />
                {statusButton.label}
              </Button>
            ) : null}

            {!isCatalogMode && onReplaceRequest && presentation.label === "Изучение" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full px-3"
                disabled={isActionPending}
                onClick={onReplaceRequest}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Заменить
              </Button>
            ) : null}

            {/* Annotation info button — shown when verse has annotation data */}
            {onOpenAnnotation && verse.annotation ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full px-3"
                disabled={isActionPending}
                onClick={() => onOpenAnnotation(verse)}
                aria-label="Полная информация о стихе"
              >
                <BookOpen className="h-4 w-4" />
                Подробнее
              </Button>
            ) : null}

            {!isCatalogMode && onDeleteRequest ? (
             <div className="flex-1 flex justify-end">
               <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full px-3 text-state-error hover:text-state-error"
                disabled={isActionPending}
                onClick={onDeleteRequest}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
             </div>
            ) : null}
          </div>
        }
      />
    </div>
  );
});
