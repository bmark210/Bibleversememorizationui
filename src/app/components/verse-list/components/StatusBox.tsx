'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { StatusBoxTheme } from '../constants';

type StatusBoxProps = {
  title: string;
  description: string;
  count: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  theme: StatusBoxTheme;
  children: React.ReactNode;
};

export function StatusBox({
  title,
  description,
  count,
  isCollapsed,
  onToggleCollapse,
  theme,
  children,
}: StatusBoxProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-colors duration-200',
        theme.borderClass,
        theme.tintBgClass,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          'flex w-full items-center gap-2.5 px-4 py-3 text-left',
          'transition-colors duration-150',
          'hover:bg-bg-subtle/40 active:bg-bg-subtle/60',
          isCollapsed ? 'rounded-2xl' : 'rounded-t-2xl',
        )}
      >
        {/* Status dot */}
        <span
          className={cn(
            'h-[7px] w-[7px] shrink-0 rounded-full',
            theme.dotClass,
          )}
        />

        {/* Title + description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-[13px] font-semibold', theme.accentClass)}>
              {title}
            </span>
            <span
              className={cn(
                'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5',
                'text-[11px] font-semibold tabular-nums',
                theme.softBgClass,
                theme.accentClass,
              )}
            >
              {count}
            </span>
          </div>
          {!isCollapsed && (
            <p className="mt-0.5 text-[11px] text-text-subtle">
              {description}
            </p>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-text-muted transition-transform duration-300',
            isCollapsed && '-rotate-90',
          )}
        />
      </button>

      {/* Collapsible body */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isCollapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
