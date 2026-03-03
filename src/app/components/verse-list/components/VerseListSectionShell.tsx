import React from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Card } from '@/app/components/ui/card';
import type { VerseListSectionConfig } from '../types';

type VerseListSectionShellProps = {
  config: VerseListSectionConfig;
  count: number;
  contentHeightMode?: 'virtualized' | 'auto';
  children: React.ReactNode;
};

export function VerseListSectionShell({
  config,
  count,
  contentHeightMode = 'virtualized',
  children,
}: VerseListSectionShellProps) {
  const maxViewportHeight = 'clamp(20rem,56dvh,40rem)';
  const estimatedRows = count > 0 ? count : 3;
  const viewportHeight = `min(calc(${estimatedRows} * 11rem), ${maxViewportHeight})`;
  const shouldUseVirtualizedViewport = contentHeightMode === 'virtualized';
  const contentStyle = shouldUseVirtualizedViewport
    ? { height: viewportHeight, maxHeight: maxViewportHeight }
    : undefined;

  return (
    <section className="min-h-0" aria-labelledby={config.headingId}>
      <Card
        className={`gap-0 overflow-hidden border-border/70 rounded-3xl min-h-0 flex flex-col ${config.borderClassName}`}
      >
        <div className={`border-b border-border/70 p-4 sm:p-5 text-foreground/75 ${config.tintClassName}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <div className={`h-2.5 w-2.5 rounded-full ${config.dotClassName}`} />
                <span id={config.headingId} className="font-medium">
                  {config.title}
                </span>
                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                  {count} шт.
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-4 min-h-0">
          <div className={shouldUseVirtualizedViewport ? 'min-h-0' : 'h-fit'} style={contentStyle}>
            {children}
          </div>
        </div>
      </Card>
    </section>
  );
}
