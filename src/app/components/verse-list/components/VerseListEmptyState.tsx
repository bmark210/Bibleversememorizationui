import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';

type VerseListEmptyStateProps = {
  onAddVerseClick: () => void;
};

export function VerseListEmptyState({ onAddVerseClick }: VerseListEmptyStateProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-gradient-to-br from-background to-primary/5 p-8 text-center gap-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/80">
        <BookOpen className="h-6 w-6 text-primary" />
      </div>
      <div>
        <div className="text-lg font-semibold">Список пока пуст</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Добавьте первый стих, и он появится здесь. Дальше сможете открыть его в галерее и начать тренировку.
        </p>
      </div>
      <div className="flex justify-center">
        <Button onClick={onAddVerseClick} className="rounded-full">
          <Plus className="w-4 h-4 mr-2" />
          Добавить первый стих
        </Button>
      </div>
    </Card>
  );
}

