import type { Ref } from "react";
import { ChevronLeft, ChevronRight, Eye, Trash2, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { haptic } from "../utils";
import type { GalleryStatusAction } from "../types";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";

type Props = {
  isActionPending: boolean;
  isFocusMode?: boolean;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  previewStatusAction: GalleryStatusAction | null;
  onClose: () => void;
  onToggleFocusMode?: () => void;
  onGoPrev?: () => void;
  onGoNext?: () => void;
  onPreviewStatusAction: () => void;
  onDeleteRequest: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
};

export function GalleryFooter({
  isActionPending,
  isFocusMode = false,
  canGoPrev = false,
  canGoNext = false,
  previewStatusAction,
  onClose,
  onToggleFocusMode,
  onGoPrev,
  onGoNext,
  onPreviewStatusAction,
  onDeleteRequest,
  closeButtonRef,
}: Props) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const bottomInset = contentSafeAreaInset.bottom;
  const iconButtonClassName =
    "h-11 w-11 rounded-2xl !border !border-border/60 bg-muted/35 text-foreground/75 backdrop-blur-xl";

  return (
    <div style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }} className="shrink-0 px-4 sm:px-6 z-40">
      <div className="mx-auto w-full flex flex-wrap items-center justify-center max-w-3xl gap-2.5 sm:gap-3">
        <Button
          variant="outline"
          className={iconButtonClassName}
          onClick={onGoPrev}
          disabled={isActionPending || !canGoPrev}
          aria-label="Предыдущий стих"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          className="flex gap-2 backdrop-blur-xl rounded-2xl !border border-border/60 bg-muted/35 text-foreground/75"
          ref={closeButtonRef}
          onClick={onClose}
          disabled={isActionPending}
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
          Закрыть
        </Button>

        {onToggleFocusMode ? (
          <Button
            variant="outline"
            className={cn(
              iconButtonClassName,
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
        ) : null}

        {previewStatusAction ? (
          <Button
            variant="outline"
            className={cn(iconButtonClassName, "flex gap-2")}
            onClick={onPreviewStatusAction}
            disabled={isActionPending}
            aria-label={previewStatusAction.label}
          >
            <previewStatusAction.icon className="h-4 w-4" />
          </Button>
        ) : null}

        <Button
          variant="outline"
          className={cn(iconButtonClassName, "w-fit gap-2 text-destructive")}
          haptic={false}
          onClick={() => {
            if (isActionPending) return;
            haptic("warning");
            onDeleteRequest();
          }}
          disabled={isActionPending}
          aria-label="Удалить стих"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          className={iconButtonClassName}
          onClick={onGoNext}
          disabled={isActionPending || !canGoNext}
          aria-label="Следующий стих"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
