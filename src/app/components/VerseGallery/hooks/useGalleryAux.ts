import { useState, useCallback } from "react";
import type { Verse } from "@/app/App";
import { GALLERY_TOASTER_ID } from "@/app/lib/toast";
import {
  showTrainingContactToast as showTrainingContactHotToast,
  showTrainingMilestoneToast as showTrainingMilestoneHotToast,
  type TrainingContactToastPayload,
  type TrainingCompletionToastCardPayload,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
import { getVerseIdentity } from "../utils";
import type { VersePreviewOverride } from "../types";

export type UseGalleryAuxReturn = {
  actionPending: boolean;
  setActionPending: (v: boolean) => void;
  previewOverrides: Map<string, VersePreviewOverride>;
  setPreviewOverride: (verse: Verse, patch: VersePreviewOverride) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (v: boolean) => void;
  feedbackMessage: string;
  showFeedback: (message: string, type?: "success" | "error" | "info") => void;
  showTrainingContactToast: (payload: TrainingContactToastPayload) => void;
  showTrainingMilestonePopup: (payload: TrainingCompletionToastCardPayload) => void;
  slideAnnouncement: string;
  setSlideAnnouncement: (text: string) => void;
};

export function useGalleryAux(): UseGalleryAuxReturn {
  const [actionPending, setActionPending] = useState(false);
  const [previewOverrides, setPreviewOverrides] = useState<Map<string, VersePreviewOverride>>(
    () => new Map()
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [slideAnnouncement, setSlideAnnouncement] = useState("");

  const setPreviewOverride = useCallback((verse: Verse, patch: VersePreviewOverride) => {
    const key = getVerseIdentity(verse);
    setPreviewOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, { ...(next.get(key) ?? {}), ...patch });
      return next;
    });
  }, []);

  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
    setTimeout(() => setFeedbackMessage(""), 2000);
  }, []);

  const showTrainingContactToast = useCallback(
    (payload: TrainingContactToastPayload) => {
      showTrainingContactHotToast(payload, {
        durationMs: 3200,
        toasterId: GALLERY_TOASTER_ID,
      });
    },
    []
  );

  const showTrainingMilestonePopup = useCallback(
    (payload: TrainingCompletionToastCardPayload) => {
      showTrainingMilestoneHotToast(payload, {
        durationMs: 10000,
        toasterId: GALLERY_TOASTER_ID,
      });
    },
    []
  );

  return {
    actionPending,
    setActionPending,
    previewOverrides,
    setPreviewOverride,
    deleteDialogOpen,
    setDeleteDialogOpen,
    feedbackMessage,
    showFeedback,
    showTrainingContactToast,
    showTrainingMilestonePopup,
    slideAnnouncement,
    setSlideAnnouncement,
  };
}
