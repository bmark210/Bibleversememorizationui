'use client';

import React, { useState } from 'react';
import { BookOpen, Pencil, Search, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from '@/app/lib/toast';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
import type { Tag } from '@/api/models/Tag';
import {
  FILTER_VISUAL_THEME,
  type FilterVisualTheme,
  type VerseListStatusFilter,
} from '../constants';
import type { VerseListFilterOption } from '../types';

function ScrollRow({children, className}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <div
        className="flex gap-2 overflow-x-auto py-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-muted/20 via-card/50 to-transparent"
      />
    </div>
  );
}

const PANEL_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

type VerseListFilterCardProps = {
  totalVisible: number;
  totalCount: number;
  currentFilterLabel: string;
  currentFilterTheme: FilterVisualTheme;
  statusFilter: VerseListStatusFilter;
  filterOptions: VerseListFilterOption[];
  onTabClick: (filter: VerseListStatusFilter, label: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isLoadingTags?: boolean;
  allTags?: Tag[];
  selectedTagSlugs?: Set<string>;
  hasActiveTags?: boolean;
  onTagClick?: (slug: string) => void;
  onClearTags?: () => void;
  onCreateTagDialogOpen?: () => void;
  onDeleteTag?: (id: string, slug: string) => Promise<void>;
};

const ROOT_TABS = [
  { key: 'catalog', label: 'Каталог' },
  { key: 'my', label: 'Мои стихи' },
] as const;

export function VerseListFilterCard({
  totalVisible,
  totalCount,
  currentFilterLabel,
  currentFilterTheme,
  statusFilter,
  filterOptions,
  onTabClick,
  searchQuery = '',
  onSearchChange,
  allTags = [],
  isLoadingTags = false,
  selectedTagSlugs = new Set(),
  hasActiveTags = false,
  onTagClick,
  onClearTags,
  onCreateTagDialogOpen,
  onDeleteTag,
}: VerseListFilterCardProps) {
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const isCatalogMode = statusFilter === 'catalog';
  const isMyMode = !isCatalogMode;
  const visibleCountLabel =
    totalVisible === totalCount ? `${totalCount} стихов` : `${totalVisible} из ${totalCount}`;

  const handleDeleteTag = async (tag: Tag) => {
    if (!tag.id || !tag.slug) return;
    setDeletingTagId(tag.id);
    try {
      await onDeleteTag?.(tag.id, tag.slug);
      toast.success(`Тег «${tag.title}» удалён`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить тег');
    } finally {
      setDeletingTagId(null);
    }
  };

  return (
    <div className="mb-3">
      <Card className="gap-0 rounded-3xl border-border/70 bg-card">
        <div role="tablist" aria-label="Основной фильтр списка стихов" className="grid grid-cols-2 gap-1 rounded-2xl mx-3 mt-3 p-1 border border-border/35 bg-primary/5">
          {ROOT_TABS.map(({ key, label }) => {
            const isActive = key === 'catalog' ? isCatalogMode : isMyMode;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabClick(key, label)}
                className={cn(
                  'flex min-h-8 items-center justify-center gap-1.5 rounded-xl px-3 py-1 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/12 text-primary border-primary/30 border'
                    : 'text-muted-foreground '
                )}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>

          {isMyMode && (
              <div
                role="tablist"
                aria-label="Подфильтр моих стихов"
                className="mt-2"
              >
                <ScrollRow>
                  {filterOptions.map((option) => {
                    const isActive = statusFilter === option.key;
                    const optionTheme = FILTER_VISUAL_THEME[option.key];
                    return (
                      <button
                        key={option.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() =>
                          isActive
                            ? onTabClick('my', 'Мои стихи')
                            : onTabClick(option.key, option.label)
                        }
                        className={cn(
                          'first:ml-3 last:mr-3 text-foreground/75 inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                          isActive
                            ? optionTheme.activeTabClassName
                            : 'border-border/65 bg-background/55 text-foreground/80 hover:bg-muted/65 '
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isActive ? optionTheme.dotClassName : 'bg-muted-foreground/35'
                          )}
                        />
                        {option.label}
                      </button>
                    );
                  })}
                </ScrollRow>
              </div>
          )}

        <AnimatePresence initial={false}>
          <motion.div
            key="tags-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={PANEL_TRANSITION}
          >
        <div className="overflow-hidden rounded-2xl my-2">
          <div className="flex items-center justify-between gap-2 border-b border-border/35 px-3.5 pt-2 pb-2.5 sm:px-4">
            <span className="text-[11px] font-medium text-muted-foreground">
              {hasActiveTags ? `Темы: ${selectedTagSlugs.size}` : 'Все темы'}
            </span>
            <div className="flex items-center gap-3">
              {hasActiveTags && (
                <button
                  type="button"
                  onClick={onClearTags}
                  className="text-[11px] text-muted-foreground transition-colors "
                >
                  Сбросить
                </button>
              )}
              {onCreateTagDialogOpen && (
                <button
                  type="button"
                  onClick={onCreateTagDialogOpen}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors "
                >
                  <Pencil className="h-3 w-3" />
                  Редактировать
                </button>
              )}
            </div>
          </div>

          {isLoadingTags ? (
            <div className="flex gap-2 px-3.5 my-2.5">
              {[56, 72, 48, 64].map((w) => (
                <Skeleton key={w} className="h-6 rounded-full shrink-0" style={{ width: w }} />
              ))}
            </div>
          ) : allTags.length > 0 ? (
            <div className="py-2">
              <ScrollRow>
                {allTags.map((tag, i) => {
                  const slug = tag.slug ?? '';
                  const isActive = selectedTagSlugs.has(slug);
                  const isDeleting = deletingTagId === tag.id;
                  const canToggle = Boolean(slug) && !isDeleting;
                  const tagKey = tag.id ?? (slug || `tag-${i}`);

                  return (
                    <motion.div
                      key={tagKey}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: Math.min(i * 0.045, 0.32),
                        duration: 0.18,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="group/tag relative first:ml-3 last:mr-3 shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!slug) return;
                          onTagClick?.(slug);
                        }}
                        disabled={!canToggle}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                          isActive
                            ? 'border-primary/40 bg-primary/12 text-primary'
                            : 'border-border/60 bg-background/55 text-foreground/75 hover:bg-muted/60 ',
                          !canToggle && 'pointer-events-none opacity-40'
                        )}
                      >
                        <span
                          className={cn(
                            'text-[10px]',
                            isActive ? 'text-primary/55' : 'text-muted-foreground/45'
                          )}
                        >
                          #
                        </span>
                        {tag.title}
                      </button>

                      {/* {onDeleteTag && (
                        <button
                          type="button"
                          aria-label={`Удалить тег ${tag.title}`}
                          onClick={() => void handleDeleteTag(tag)}
                          disabled={isDeleting}
                          className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-100 transition-opacity md:opacity-0 md:group-hover/tag:opacity-100 group-focus-within/tag:opacity-100"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      )} */}
                    </motion.div>
                  );
                })}
              </ScrollRow>
            </div>
          ) : (
            <p className="px-3.5 py-2.5 text-xs italic text-muted-foreground/50 sm:px-4">
              Нет тегов - создайте первый
            </p>
          )}
        </div>
        </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}
