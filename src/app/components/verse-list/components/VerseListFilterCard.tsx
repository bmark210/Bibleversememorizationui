import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import {
  FILTER_VISUAL_THEME,
  type FilterVisualTheme,
  type VerseListStatusFilter,
} from '../constants';
import type { VerseListFilterOption } from '../types';

type VerseListFilterCardProps = {
  totalVisible: number;
  totalCount: number;
  currentFilterLabel: string;
  currentFilterTheme: FilterVisualTheme;
  statusFilter: VerseListStatusFilter;
  filterOptions: VerseListFilterOption[];
  onTabClick: (filter: VerseListStatusFilter, label: string) => void;
};

export function VerseListFilterCard({
  totalVisible,
  totalCount,
  currentFilterLabel,
  currentFilterTheme,
  statusFilter,
  filterOptions,
  onTabClick,
}: VerseListFilterCardProps) {
  return (
    <div className="mb-6">
      <Card className="border-border/70 rounded-3xl p-4 sm:p-5 gap-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-medium">Фильтр по статусу</div>
            <p className="text-xs text-muted-foreground mt-1">
              Загружено {totalVisible} из {totalCount} {totalCount === 1 ? 'стиха' : totalCount < 5 ? 'стихов' : 'стихов'}.
            </p>
          </div>
          <Badge
            variant="outline"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${currentFilterTheme.currentBadgeClassName}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${currentFilterTheme.dotClassName}`} />
            Текущий: {currentFilterLabel}
          </Badge>
        </div>

        <div role="tablist" aria-label="Фильтр по статусу стихов" className="flex flex-wrap gap-2">
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
                  rounded-full border px-3.5 backdrop-blur-sm transition-colors
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
        </div>
      </Card>
    </div>
  );
}
