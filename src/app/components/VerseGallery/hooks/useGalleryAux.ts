import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { Verse } from "@/app/App";
import type { TrainingCompletionToastCardPayload } from "@/app/components/verse-gallery/TrainingCompletionToastCard";
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
  showFeedback: (message: string, type?: "success" | "error") => void;
  trainingCompletionToast: TrainingCompletionToastCardPayload | null;
  showTrainingCompletionToast: (payload: TrainingCompletionToastCardPayload) => void;
  dismissTrainingCompletionToast: () => void;
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
  const [trainingCompletionToast, setTrainingCompletionToast] =
    useState<TrainingCompletionToastCardPayload | null>(null);
  const [slideAnnouncement, setSlideAnnouncement] = useState("");

  const setPreviewOverride = useCallback((verse: Verse, patch: VersePreviewOverride) => {
    const key = getVerseIdentity(verse);
    setPreviewOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, { ...(next.get(key) ?? {}), ...patch });
      return next;
    });
  }, []);

  const showFeedback = useCallback((message: string, type: "success" | "error" = "success") => {
    setFeedbackMessage(message);
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
    setTimeout(() => setFeedbackMessage(""), 2000);
  }, []);

  const showTrainingCompletionToast = useCallback(
    (payload: TrainingCompletionToastCardPayload) => {
      setTrainingCompletionToast(payload);
    },
    []
  );

  const dismissTrainingCompletionToast = useCallback(() => {
    setTrainingCompletionToast(null);
  }, []);

  return {
    actionPending,
    setActionPending,
    previewOverrides,
    setPreviewOverride,
    deleteDialogOpen,
    setDeleteDialogOpen,
    feedbackMessage,
    showFeedback,
    trainingCompletionToast,
    showTrainingCompletionToast,
    dismissTrainingCompletionToast,
    slideAnnouncement,
    setSlideAnnouncement,
  };
}
