import React from "react";
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
}: VerseListHeaderProps) {
  const isTelegramFullscreen = useTelegramUiStore(
    (state) => state.isTelegramFullscreen
  );

  return (
    <div className={cn("flex justify-between items-start gap-3 px-4 sm:px-6 lg:px-8 relative", isTelegramFullscreen ? "" : "pt-3 sm:pt-5 lg:pt-7")}>
      {isTelegramFullscreen ? null : <h1 className="text-primary">Cтихи</h1>}
        <Button
          type="button"
          variant="default"
          onClick={onAddVerseClick}
          className={cn("flex bg-card/50 text-primary border border-border dark:border-border/35 items-center justify-center gap-2 rounded-2xl overflow-hidden", 
            isTelegramFullscreen ? "absolute right-[20px] top-[23px] !font-medium !border-none !shadow-none !ring-offset-0 bg-transparent text-foreground/70" : ""
          )}
        >
          {isTelegramFullscreen ? <Plus className="w-4 h-4" /> : null}
          {isTelegramFullscreen ? null : "Добавить"}
        </Button>
    </div>
  );
}
