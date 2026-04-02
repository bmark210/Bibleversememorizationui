import React from 'react';
import { BookOpen, ListFilter, Plus, SearchX } from 'lucide-react';
import { Card } from '@/app/components/ui/card';

type VerseListEmptyStateProps = {
  currentFilterLabel: string;
  isAllFilter?: boolean;
  isMyFilter?: boolean;
  onNavigateToCatalog?: () => void;
};

export function VerseListEmptyState({
  currentFilterLabel,
  isAllFilter = false,
  isMyFilter = false,
  onNavigateToCatalog,
}: VerseListEmptyStateProps) {
  if (isMyFilter) {
    return (
      <Card className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-border/50 bg-gradient-to-br from-bg-subtle via-bg-surface to-bg-elevated p-8 text-center gap-5">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-10 top-4 h-28 w-28 rounded-full bg-status-collection/20 blur-2xl" />
          <div className="absolute -right-6 bottom-4 h-24 w-24 rounded-full bg-brand-primary/15 blur-2xl" />
        </div>

        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-bg-elevated/90 shadow-sm">
          <BookOpen className="h-7 w-7 text-text-muted" />
        </div>

        <div className="relative space-y-1.5">
          <p className="text-base font-semibold tracking-tight text-text-primary">
            Коллекция пуста
          </p>
          <p className="text-sm leading-relaxed text-text-secondary">
            Добавьте стихи из каталога, чтобы начать изучение.
            Они появятся здесь.
          </p>
        </div>

        {onNavigateToCatalog && (
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="relative flex items-center gap-2 rounded-2xl border border-brand-primary/25 bg-brand-primary/10 px-5 py-2.5 text-sm font-semibold text-brand-primary transition-colors hover:bg-brand-primary/15"
          >
            <Plus className="h-4 w-4" />
            Открыть каталог
          </button>
        )}
      </Card>
    );
  }

  const title = isAllFilter ? 'Каталог пуст' : 'Ничего не найдено';
  const description = isAllFilter
    ? 'Сейчас нет доступных стихов для добавления. Возможно, подходящие стихи уже находятся в разделе «Мои стихи» или фильтры слишком сузили список.'
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
