'use client';

import React, { useRef, useState } from 'react';
import { Pencil, Plus, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { Tag } from '@/api/models/Tag';
import {
  FILTER_VISUAL_THEME,
  type FilterVisualTheme,
  type VerseListStatusFilter,
} from '../constants';
import type { VerseListFilterOption } from '../types';

// ── horizontal scroll row with right-fade ────────────────────────────────────
function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        className="flex gap-2 overflow-x-auto py-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent"
      />
    </div>
  );
}

// ── panel motion config ───────────────────────────────────────────────────────
const PANEL_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

// ── types ─────────────────────────────────────────────────────────────────────
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

// ── main component ────────────────────────────────────────────────────────────
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearchToggle = () => {
    if (searchOpen) {
      onSearchChange?.('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  };

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
    <div className="mb-6">
      <Card className="border-border/70 rounded-3xl py-4 sm:p-5 gap-0">
        {/* ── header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div>
            <div className="text-sm font-medium">Фильтр</div>
            <p className="text-xs text-muted-foreground mt-1">
              Загружено {totalCount}{' '}
              {totalCount === 1 ? 'стиха(а)' : 'стихов'}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={searchOpen ? 'Закрыть поиск' : 'Поиск по стихам'}
              className={`h-8 w-8 rounded-full transition-colors ${
                searchOpen || searchQuery
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={handleSearchToggle}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {searchOpen && (
            <motion.div
              key="search-row"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="overflow-hidden px-4 pt-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Поиск по ссылке, тексту или тегу..."
                  className="rounded-xl pl-9 pr-9 h-9 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    onClick={() => onSearchChange?.('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── status tabs ── */}
        <div className="pt-4">
          <ScrollRow>
            {filterOptions.map((option) => {
              const isActive = statusFilter === option.key;
              const optionTheme = FILTER_VISUAL_THEME[option.key];
              return (
                <Button
                  key={option.key}
                  role="tab"
                  aria-selected={isActive}
                  size="sm"
                  variant="ghost"
                  className={`
                    rounded-full first:ml-4 last:mr-4 border px-3.5 backdrop-blur-sm transition-colors
                    inline-flex items-center gap-2
                    ${isActive
                      ? optionTheme.activeTabClassName
                      : 'border-border/60 bg-background/45 text-foreground/85 hover:bg-muted/50 hover:text-foreground'}
                  `}
                  onClick={() => onTabClick(option.key, option.label)}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? optionTheme.dotClassName : 'bg-muted-foreground/35'
                    }`}
                  />
                  {option.label}
                </Button>
              );
            })}
          </ScrollRow>
        </div>

        {/* ── tags panel ── */}
        <div className="mt-4">
          <AnimatePresence initial={false}>
            <motion.div
              key="tags-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={PANEL_TRANSITION}
              className="overflow-hidden"
            >
              <div className="border-t border-border/25 pt-2.5">
                <div className="flex items-center justify-between px-4">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {hasActiveTags ? `Выбрано ${selectedTagSlugs.size}` : 'Все темы'}
                  </span>
                  <div className="flex items-center gap-3">
                    {hasActiveTags && (
                      <button
                        type="button"
                        onClick={onClearTags}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Сбросить
                      </button>
                    )}
                    {onCreateTagDialogOpen && (
                      <button
                        type="button"
                        onClick={onCreateTagDialogOpen}
                        className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Редактировать
                      </button>
                    )}
                  </div>
                </div>

                {isLoadingTags ? (
                  <div className="flex gap-2 mt-2 px-4">
                    {[56, 72, 48, 64].map((w) => (
                      <Skeleton key={w} className="h-6 rounded-full shrink-0" style={{ width: w }} />
                    ))}
                  </div>
                ) : allTags.length > 0 ? (
                  <div className="mt-2">
                    <ScrollRow>
                      {allTags.map((tag, i) => {
                        const slug = tag.slug ?? '';
                        const isActive = selectedTagSlugs.has(slug);
                        const isDeleting = deletingTagId === tag.id;
                        return (
                          <motion.div
                            key={slug}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: Math.min(i * 0.045, 0.32),
                              duration: 0.18,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className="shrink-0 first:ml-4 last:mr-4 group/tag relative"
                          >
                            <button
                              type="button"
                              onClick={() => onTagClick?.(slug)}
                              disabled={isDeleting}
                              className={[
                                'inline-flex items-center gap-1 rounded-full border',
                                'px-2.5 py-0.5 text-xs font-medium transition-colors',
                                isActive
                                  ? 'border-primary/40 bg-primary/12 text-primary'
                                  : 'border-border/55 bg-background/40 text-foreground/70 hover:bg-muted/50 hover:text-foreground',
                                isDeleting ? 'opacity-40 pointer-events-none' : '',
                              ].join(' ')}
                            >
                              <span
                                className={`text-[10px] ${
                                  isActive ? 'text-primary/55' : 'text-muted-foreground/40'
                                }`}
                              >
                                #
                              </span>
                              {tag.title}
                            </button>

                            {onDeleteTag && (
                              <button
                                type="button"
                                aria-label={`Удалить тег ${tag.title}`}
                                onClick={() => void handleDeleteTag(tag)}
                                disabled={isDeleting}
                                className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover/tag:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </ScrollRow>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/45 italic mt-2 px-4">
                    Нет тегов — создайте первый
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
