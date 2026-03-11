import React from 'react';
import { ListFilter, SearchX } from 'lucide-react';
import { Card } from '@/app/components/ui/card';

type VerseListEmptyStateProps = {
  currentFilterLabel: string;
  isAllFilter?: boolean;
};

export function VerseListEmptyState({
  currentFilterLabel,
  isAllFilter = false,
}: VerseListEmptyStateProps) {
  const title = isAllFilter ? 'Пока нет стихов' : 'Ничего не найдено';
  const description = isAllFilter
    ? 'Список пуст. Когда стихи появятся, они отобразятся здесь.'
    : `По фильтру «${currentFilterLabel}» сейчас нет карточек. Попробуйте переключить фильтр.`;

  return (
    <Card className="relative my-4 flex h-[calc(100%-2rem)] min-h-[14rem] flex-col justify-center overflow-hidden rounded-3xl border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-7 text-center gap-4 sm:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-10 top-4 h-24 w-24 rounded-full bg-foreground/5 blur-2xl" />
        <div className="absolute -right-6 bottom-3 h-20 w-20 rounded-full bg-foreground/5 blur-2xl" />
      </div>

      <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/85 shadow-sm">
        {isAllFilter ? (
          <SearchX className="h-6 w-6 text-muted-foreground" />
        ) : (
          <ListFilter className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="relative">
        <div className="text-lg font-semibold tracking-tight text-primary">{title}</div>
        <p className="mt-2 text-sm text-foreground/75 leading-6">{description}</p>
      </div>
    </Card>
  );
}
