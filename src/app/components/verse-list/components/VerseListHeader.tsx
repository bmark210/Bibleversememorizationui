import React from "react";
// import { GraduationCap, Plus } from "lucide-react";
// import { Button } from "@/app/components/ui/button";
import { useTelegramUiStore } from "@/app/stores/telegramUiStore";
import { Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";

type VerseListHeaderProps = {
  onAddVerseClick: () => void;
  onAboutSectionClick?: () => void;
};

export function VerseListHeader({
  onAddVerseClick,
  // onAboutSectionClick,
}: VerseListHeaderProps) {
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen
  );

  return (
    <div className="flex justify-between items-start gap-3 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-5 lg:pt-7 relative">
      {!isTelegramFullscreen ? <h1 className="text-primary">Cтихи</h1> : null}
        <Button
          type="button"
          variant="default"
          onClick={onAddVerseClick}
          className={cn("flex bg-card/50 text-primary border border-border dark:border-border/35 items-center justify-center gap-2 rounded-2xl overflow-hidden", 
            !isTelegramFullscreen ? "" : "absolute right-[20px] top-[68px] !border-none !shadow-none !ring-offset-0 bg-transparent text-foreground/70"
          )}
        >
          <Plus className="w-4 h-4" />
          Добавить
        </Button>
    </div>
  );
}
