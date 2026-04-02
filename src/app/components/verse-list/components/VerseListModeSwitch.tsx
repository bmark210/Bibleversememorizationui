'use client';

import { BookPlus, LibraryBig } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  getVisibleVerseListPrimaryFilterOptions,
  type VerseListPrimaryFilterKey,
} from './primaryFilterTabs';

type VerseListModeSwitchProps = {
  activeMode: VerseListPrimaryFilterKey;
  totalCount: number;
  onModeChange: (mode: VerseListPrimaryFilterKey) => void;
  isFullscreen?: boolean;
  className?: string;
};

const MODE_CONFIG: Record<
  VerseListPrimaryFilterKey,
  {
    Icon: typeof LibraryBig;
    countLabel: string;
    activeTrigger: string;
  }
> = {
  my: {
    Icon: LibraryBig,
    countLabel: 'в моих',
    activeTrigger: 'data-[state=active]:text-status-collection',
  },
  catalog: {
    Icon: BookPlus,
    countLabel: 'в каталоге',
    activeTrigger: 'data-[state=active]:text-brand-primary',
  },
};

export function VerseListModeSwitch({
  activeMode,
  totalCount: _totalCount,
  onModeChange,
  isFullscreen: _isFullscreen = false,
  className,
}: VerseListModeSwitchProps) {
  const visibleModes = getVisibleVerseListPrimaryFilterOptions();

  return (
    <div
      data-tour="verse-list-mode-switch"
      className={cn('shrink-0', className)}
    >
      <Tabs
        value={activeMode}
        onValueChange={(v) => onModeChange(v as VerseListPrimaryFilterKey)}
      >
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-none border-t border-border-subtle bg-bg-overlay p-0 backdrop-blur-xl">
          {visibleModes.map(({ key, label }) => {
            const cfg = MODE_CONFIG[key];
            const Icon = cfg.Icon;

            return (
              <TabsTrigger
                key={key}
                value={key}
                data-tour={`verse-mode-tab-${key}`}
                className={cn(
                  'h-full gap-2 rounded-none text-sm font-medium',
                  'data-[state=active]:border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                  cfg.activeTrigger,
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
