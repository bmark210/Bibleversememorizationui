import React from "react";
import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";

type VerseListHeaderProps = {
  onAddVerseClick: () => void;
  onAboutSectionClick?: () => void;
};

export function VerseListHeader({
  onAddVerseClick,
  onAboutSectionClick,
}: VerseListHeaderProps) {
  return (
    <div className="flex justify-between items-start gap-3 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 lg:pt-7">
      <h1 className="text-primary">Cтихи</h1>
      <div className="flex items-center gap-2">
        {onAboutSectionClick && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAboutSectionClick}
            className="h-8 rounded-2xl px-2.5 text-xs text-primary border border-border dark:border-border/35 bg-background/40"
          >
            <GraduationCap className="h-3.5 w-3.5" />
          </Button>
        )}

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
    </div>
  );
}
