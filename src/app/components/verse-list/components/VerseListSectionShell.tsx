import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Card } from '@/app/components/ui/card';
import { cn } from '@/app/components/ui/utils';
import type { VerseListSectionConfig } from '../types';

type VerseListSectionShellProps = {
  config: VerseListSectionConfig;
  count: number;
  contentHeightMode?: 'virtualized' | 'auto';
  children: React.ReactNode;
  totalCount: number;
};

export function VerseListSectionShell({
  config,
  count,
  contentHeightMode = 'virtualized',
  children,
  totalCount,
}: VerseListSectionShellProps) {
  const estimatedRows = count > 0 ? count : 3;
  const shouldUseVirtualizedViewport = contentHeightMode === 'virtualized';
  const contentStyle = shouldUseVirtualizedViewport
    ? {
        height: `min(100%, calc(${estimatedRows} * 13rem))`,
        maxHeight: '100%',
      }
    : undefined;

  return (
    <section
      className={cn('min-h-0', shouldUseVirtualizedViewport && 'h-full')}
      aria-labelledby={config.headingId}
    >
      <Card
        className={cn(
          'min-h-0 flex flex-col gap-0 overflow-hidden rounded-3xl border-border/70',
          shouldUseVirtualizedViewport && 'h-full',
          config.borderClassName,
        )}
      >
        <div className={`border-b border-border/70 p-3 sm:p-5 text-foreground/75 ${config.tintClassName}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${config.dotClassName}`} />
                <span id={config.headingId} className="font-medium">
                  {config.title}
                </span>
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                 {totalCount > 0 ? `${totalCount} шт.` : 'Пока пусто'}
                </Badge>
              </div>
              {/* <p className="mt-1 text-xs text-muted-foreground">{config.subtitle}</p> */}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'min-h-0 bg-muted/10 px-3 sm:px-4',
            shouldUseVirtualizedViewport && 'flex-1',
          )}
        >
          <div
            className={cn(
              shouldUseVirtualizedViewport ? 'h-full min-h-0' : 'h-fit',
            )}
            style={contentStyle}
          >
            {children}
          </div>
        </div>
      </Card>
    </section>
  );
}
