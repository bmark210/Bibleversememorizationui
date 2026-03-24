import React, { type Ref } from "react";
import { ChevronDown, ChevronUp, Eye, Trash2, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { haptic } from "@/app/components/VerseGallery/utils";

type Props = {
  isActionPending: boolean;
  isFocusMode?: boolean;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  showDelete?: boolean;
  bottomInset?: number;
  onClose: () => void;
  onToggleFocusMode?: () => void;
  onGoPrev?: () => void;
  onGoNext?: () => void;
  onDeleteRequest: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
};

export const GalleryFooter = React.memo(function GalleryFooter({
  isActionPending,
  isFocusMode = false,
  canGoPrev = false,
  canGoNext = false,
  showDelete = true,
  bottomInset = 0,
  onClose,
  onToggleFocusMode,
  onGoPrev,
  onGoNext,
  onDeleteRequest,
  closeButtonRef,
}: Props) {
  const navButtonClassName =
    "h-11 w-11 shrink-0 rounded-xl text-foreground/75";
  const iconButtonClassName =
    "h-11 rounded-2xl !border !border-border/60 bg-muted/35 text-foreground/75 backdrop-blur-xl";
  const quietActionClassName =
    "h-11 rounded-2xl border-border/60 bg-muted/28 px-3 text-foreground/68 backdrop-blur-xl hover:bg-muted/42 hover:text-foreground/86";

  return (
    <div style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }} className="shrink-0 z-40 px-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-nowrap items-center justify-between gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="icon"
          className={navButtonClassName}
          onClick={onGoPrev}
          disabled={isActionPending || !canGoPrev}
          aria-label="Предыдущий стих"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2">
          {showDelete ? (
            <Button
              variant="outline"
              className={cn(
                quietActionClassName,
                "shrink-0 gap-2 text-foreground/62 hover:text-destructive",
              )}
              haptic={false}
              onClick={() => {
                if (isActionPending) return;
                haptic("warning");
                onDeleteRequest();
              }}
              disabled={isActionPending}
              aria-label="Удалить стих"
              >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : <div className="w-[42px]"/>}

          {onToggleFocusMode && (
            <Button
              variant="outline"
              className={cn(
                iconButtonClassName,
                "shrink-0",
                isFocusMode && "border-primary/35 !bg-primary/10 text-primary",
              )}
              onClick={onToggleFocusMode}
              disabled={isActionPending}
              aria-pressed={isFocusMode}
              aria-label={
                isFocusMode
                  ? "Выключить показ полного текста"
                  : "Включить показ полного текста"
              }
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}


          <Button
            variant="outline"
            className={cn(iconButtonClassName, "shrink-0 flex gap-2")}
            ref={closeButtonRef}
            onClick={onClose}
            disabled={isActionPending}
            aria-label="Закрыть"
          >
            <span className="text-[13px] font-medium">Закрыть</span>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className={navButtonClassName}
          onClick={onGoNext}
          disabled={isActionPending || !canGoNext}
          aria-label="Следующий стих"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
});
