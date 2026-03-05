import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";

type VerseListHeaderProps = {
  onAddVerseClick: () => void;
};

export function VerseListHeader({ onAddVerseClick }: VerseListHeaderProps) {
  return (
    <div className="mb-4 flex justify-between items-start gap-3">
          <h1 className="mb-1 text-primary">Cтихи</h1>
          <Button
            type="button"
            variant="default"
            onClick={onAddVerseClick}
            className="flex bg-card/50 text-primary border border-border dark:border-border/35 items-center justify-center gap-2 rounded-2xl overflow-hidden"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
    </div>
  );
}
