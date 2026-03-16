import React from "react";
import { Eye, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import { useTelegramUiStore } from "@/app/stores/telegramUiStore";

type VerseListHeaderProps = {
  onAddVerseClick: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onAboutSectionClick?: () => void;
};

export function VerseListHeader({
  onAddVerseClick,
  isFocusMode = false,
  onToggleFocusMode,
}: VerseListHeaderProps) {
  const isTelegramFullscreen = useTelegramUiStore((state) => state.isTelegramFullscreen);

  return (
    <div className={cn("flex justify-between items-start gap-3 px-4 sm:px-6 lg:px-8 relative", isTelegramFullscreen ? "" : "pt-3 sm:pt-5 lg:pt-7")}>
      {isTelegramFullscreen ? null : <h1 className="text-primary">Cтиxи</h1>}
      <div
        className={cn(
          "flex items-center gap-2",
          isTelegramFullscreen && "absolute right-[20px] top-[23px] !gap-1",
        )}
      >
        {onToggleFocusMode ? (
          <Button
            data-tour="verse-list-focus-mode-button"
            type="button"
            variant="default"
            aria-pressed={isFocusMode}
            title={
              isFocusMode
                ? "Выключить режим чтения"
                : "Включить режим чтения"
            }
            onClick={onToggleFocusMode}
            className={cn(
              "flex bg-card/50 text-foreground/75 border border-border dark:border-border/35 items-center justify-center gap-2 rounded-2xl overflow-hidden", 
              isTelegramFullscreen
                ? "font-medium !border-none !shadow-none !ring-offset-0 bg-transparent text-foreground/70"
                : "",
              isFocusMode &&
                "border-primary/35 bg-primary/10 text-primary",
            )}
          >
            <Eye className="h-4 w-4" />
            {isTelegramFullscreen ? null : <span>Текст</span>}
          </Button>
        ) : null}

        <Button
          data-tour="verse-list-add-button"
          type="button"
          variant="default"
          onClick={onAddVerseClick}
          className={cn("flex bg-card/50 text-foreground/75 border border-border dark:border-border/35 items-center justify-center gap-2 rounded-2xl overflow-hidden", 
            isTelegramFullscreen ? "font-medium !border-none !shadow-none !ring-offset-0 bg-transparent text-foreground/70" : ""
          )}
        >
          {isTelegramFullscreen ? <Plus className="w-4 h-4" /> : null}
          {isTelegramFullscreen ? null : "Добавить"}
        </Button>
      </div>
    </div>
  );
}
