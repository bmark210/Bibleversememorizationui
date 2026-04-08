'use client';

import { BookOpen, Layers } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

export type VerseListPrimaryView = 'verses' | 'chapters';

type VerseListViewToggleProps = {
  activeView: VerseListPrimaryView;
  onChange: (view: VerseListPrimaryView) => void;
  className?: string;
};

export function VerseListViewToggle({
  activeView,
  onChange,
  className,
}: VerseListViewToggleProps) {
  return (
    <div className={cn('shrink-0', className)}>
      <Tabs
        value={activeView}
        onValueChange={(v) => onChange(v as VerseListPrimaryView)}
      >
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-none border-t border-border-subtle bg-bg-overlay p-0 backdrop-blur-xl">
          <TabsTrigger
            value="verses"
            className={cn(
              'h-full gap-2 rounded-none text-sm font-medium',
              'data-[state=active]:border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              'data-[state=active]:text-brand-primary',
            )}
          >
            <BookOpen className="size-[18px]" />
            Стихи
          </TabsTrigger>
          <TabsTrigger
            value="chapters"
            className={cn(
              'h-full gap-2 rounded-none text-sm font-medium',
              'data-[state=active]:border-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none',
              'data-[state=active]:text-brand-primary',
            )}
          >
            <Layers className="size-[18px]" />
            Главы
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
