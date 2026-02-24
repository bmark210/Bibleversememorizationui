import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

type VerseListHeaderProps = {
  onAddVerseClick: () => void;
};

export function VerseListHeader({ onAddVerseClick }: VerseListHeaderProps) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <h1 className="mb-1">Cтихи</h1>
        <p className="text-sm text-muted-foreground">
          Кликните на карточку, чтобы перейти в галерею и начать изучение.
        </p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button onClick={onAddVerseClick} className="shrink-0 w-full sm:w-auto rounded-3xl">
          <Plus className="w-4 h-4 mr-2" />
          Добавить стих
        </Button>
      </div>
    </div>
  );
}

