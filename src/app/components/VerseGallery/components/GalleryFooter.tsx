import type { Ref } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { haptic } from "../utils";
import type { GalleryStatusAction } from "../types";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";

type Props = {
  isActionPending: boolean;
  previewStatusAction: GalleryStatusAction | null;
  onClose: () => void;
  onPreviewStatusAction: () => void;
  onDeleteRequest: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
};

export function GalleryFooter({
  isActionPending,
  previewStatusAction,
  onClose,
  onPreviewStatusAction,
  onDeleteRequest,
  closeButtonRef,
}: Props) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const bottomInset = contentSafeAreaInset.bottom;

  return (
    <div style={{ paddingBottom: `${Math.max(25, bottomInset)}px` }} className="shrink-0 px-4 sm:px-6 z-40">
      <div className="mx-auto w-full flex flex-wrap items-center justify-center max-w-2xl gap-3">
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

        {previewStatusAction ? (
          <Button
            variant="outline"
            className="flex gap-2 backdrop-blur-xl rounded-2xl text-foreground/75 !border !border-border/60 bg-muted/35"
            onClick={onPreviewStatusAction}
            disabled={isActionPending}
            aria-label={previewStatusAction.label}
          >
            <previewStatusAction.icon className="h-4 w-4" />
          </Button>
        ) : null}

        <Button
          variant="outline"
          className="w-fit gap-2 text-destructive backdrop-blur-xl rounded-2xl !border !border-border/60 bg-muted/35"
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
      </div>
    </div>
  );
}
