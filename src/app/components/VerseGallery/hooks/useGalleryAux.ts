import { useState, useCallback, useRef, useEffect } from "react";
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
  showTrainingMilestonePopup: (payload: TrainingCompletionToastCardPayload) => Promise<void>;
  trainingMilestonePopup: TrainingCompletionToastCardPayload | null;
  confirmTrainingMilestonePopup: () => void;
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
  const [trainingMilestonePopup, setTrainingMilestonePopup] =
    useState<TrainingCompletionToastCardPayload | null>(null);
  const trainingMilestoneResolveRef = useRef<(() => void) | null>(null);

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
    (payload: TrainingCompletionToastCardPayload) =>
      new Promise<void>((resolve) => {
        showTrainingMilestoneHotToast(payload, {
          durationMs: 5000,
          toasterId: GALLERY_TOASTER_ID,
        });
        // Resolve previous pending promise defensively to avoid dangling await chains.
        trainingMilestoneResolveRef.current?.();
        trainingMilestoneResolveRef.current = resolve;
        setTrainingMilestonePopup(payload);
      }),
    []
  );

  const confirmTrainingMilestonePopup = useCallback(() => {
    setTrainingMilestonePopup(null);
    const resolve = trainingMilestoneResolveRef.current;
    trainingMilestoneResolveRef.current = null;
    resolve?.();
  }, []);

  useEffect(
    () => () => {
      // Resolve pending promise during unmount to prevent hanging awaits.
      trainingMilestoneResolveRef.current?.();
      trainingMilestoneResolveRef.current = null;
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
    trainingMilestonePopup,
    confirmTrainingMilestonePopup,
    slideAnnouncement,
    setSlideAnnouncement,
  };
}
