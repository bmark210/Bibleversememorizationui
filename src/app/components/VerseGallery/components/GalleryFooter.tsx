import React, {
  memo,
  useCallback,
  useMemo,
  type Ref,
} from "react";
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

const NAV_ICON_CLASS =
  "h-11 w-11 shrink-0 rounded-xl text-foreground/75";
const ICON_ACTION_CLASS =
  "h-11 rounded-2xl !border !border-border/60 bg-muted/35 text-foreground/75 backdrop-blur-xl";
const QUIET_DELETE_CLASS =
  "h-11 rounded-2xl border-border/60 bg-muted/28 px-3 text-foreground/68 backdrop-blur-xl hover:bg-muted/42 hover:text-foreground/86";
const FOOTER_VEIL_HEIGHT_PX = 104;

function GalleryFooterComponent({
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
  /** Как safe-area в Layout: инсет от Telegram + небольшой минимум на десктопе без inset. */
  const rootStyle = useMemo(
    () => ({
      paddingBottom: `${Math.max(12, bottomInset)}px`,
    }),
    [bottomInset],
  );

  const handleDeleteClick = useCallback(() => {
    if (isActionPending) return;
    haptic("warning");
    onDeleteRequest();
  }, [isActionPending, onDeleteRequest]);

  const prevDisabled =
    isActionPending || !canGoPrev || typeof onGoPrev !== "function";
  const nextDisabled =
    isActionPending || !canGoNext || typeof onGoNext !== "function";

  return (
    <div
      style={rootStyle}
      className="relative shrink-0 z-40 px-4 sm:px-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/82 to-transparent"
        style={{ top: -FOOTER_VEIL_HEIGHT_PX }}
      />

      <div className="relative mx-auto flex w-full max-w-4xl flex-nowrap items-center justify-between gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={NAV_ICON_CLASS}
          onClick={onGoPrev}
          disabled={prevDisabled}
          aria-label="Предыдущий стих"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-center gap-2">
          {showDelete ? (
            <Button
              type="button"
              variant="outline"
              className={cn(
                QUIET_DELETE_CLASS,
                "shrink-0 gap-2 text-foreground/62 hover:text-destructive",
              )}
              haptic={false}
              onClick={handleDeleteClick}
              disabled={isActionPending}
              aria-label="Удалить стих"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : (
            <div
              className="h-11 w-11 shrink-0"
              aria-hidden
            />
          )}

          {onToggleFocusMode ? (
            <Button
              type="button"
              variant="outline"
              className={cn(
                ICON_ACTION_CLASS,
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
          ) : null}

          <Button
            type="button"
            variant="outline"
            className={cn(ICON_ACTION_CLASS, "shrink-0 flex gap-2")}
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
          type="button"
          variant="outline"
          size="icon"
          className={NAV_ICON_CLASS}
          onClick={onGoNext}
          disabled={nextDisabled}
          aria-label="Следующий стих"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export const GalleryFooter = memo(GalleryFooterComponent);
GalleryFooter.displayName = "GalleryFooter";
