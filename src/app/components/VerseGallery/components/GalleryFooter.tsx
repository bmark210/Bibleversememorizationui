import type { Ref } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { TrainingSubsetSelect } from "@/app/components/verse-gallery/TrainingSubsetSelect";
import { haptic } from "../utils";
import type { PanelMode, TrainingSubsetFilter, GalleryStatusAction } from "../types";

type Props = {
  panelMode: PanelMode;
  isTrainingAutoStartOverlayVisible: boolean;
  actionPending: boolean;
  closeTrainingGoesToPreview: boolean;
  trainingSubsetFilter: TrainingSubsetFilter;
  previewStatusAction: GalleryStatusAction | null;
  onClose: () => void;
  onPreviewStatusAction: () => void;
  onDeleteRequest: () => void;
  onTrainingBack: () => void;
  onTrainingSubsetChange: (filter: TrainingSubsetFilter) => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
};

export function GalleryFooter({
  panelMode,
  isTrainingAutoStartOverlayVisible,
  actionPending,
  closeTrainingGoesToPreview,
  trainingSubsetFilter,
  previewStatusAction,
  onClose,
  onPreviewStatusAction,
  onDeleteRequest,
  onTrainingBack,
  onTrainingSubsetChange,
  closeButtonRef,
}: Props) {
  if (isTrainingAutoStartOverlayVisible) return null;

  if (panelMode === "preview") {
    return (
      <div className="shrink-0 px-4 sm:px-6 z-40">
        <div className="mx-auto w-full flex flex-wrap items-center justify-center max-w-2xl gap-3">
          <Button
            variant="outline"
            className="flex gap-2 backdrop-blur-xl rounded-2xl"
            ref={closeButtonRef}
            onClick={onClose}
            disabled={actionPending}
            aria-label="Завершить тренировку"
          >
            Завершить
          </Button>

          {previewStatusAction ? (
            <Button
              variant="outline"
              className="flex gap-2 backdrop-blur-xl rounded-2xl"
              onClick={onPreviewStatusAction}
              disabled={actionPending}
              aria-label={previewStatusAction.label}
            >
              <previewStatusAction.icon className="h-4 w-4" />
            </Button>
          ) : null}

          <Button
            variant="outline"
            className="w-fit gap-2 text-destructive hover:text-destructive backdrop-blur-xl rounded-2xl"
            onClick={() => {
              if (actionPending) return;
              haptic("warning");
              onDeleteRequest();
            }}
            disabled={actionPending}
            aria-label="Удалить стих"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-4 sm:px-6 pt-3 z-40">
      <div className="mx-auto w-full flex flex-wrap items-center justify-center max-w-2xl gap-3">
        <Button
          type="button"
          variant="secondary"
          className="w-fit gap-2 rounded-2xl backdrop-blur-xl"
          onClick={() => {
            haptic("light");
            onTrainingBack();
          }}
          aria-label={closeTrainingGoesToPreview ? "Вернуться к превью" : "Закрыть галерею"}
        >
          <ChevronLeft className="h-4 w-4" />
          {closeTrainingGoesToPreview ? "К превью" : "Закрыть"}
        </Button>

        <TrainingSubsetSelect
          value={trainingSubsetFilter}
          onValueChange={(value) => {
            const nextFilter = value as TrainingSubsetFilter;
            if (trainingSubsetFilter === nextFilter) return;
            haptic("light");
            onTrainingSubsetChange(nextFilter);
          }}
        />
      </div>
    </div>
  );
}
