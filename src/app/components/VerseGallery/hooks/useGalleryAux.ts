import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Verse } from "@/app/App";
import { GALLERY_TOASTER_ID } from "@/app/lib/toast";
import {
  showTrainingContactToast as showTrainingContactHotToast,
  type TrainingContactToastPayload,
  type TrainingCompletionToastCardPayload,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
import { getVerseIdentity } from "../utils";
import type { VersePreviewOverride } from "../types";

export type UseGalleryAuxReturn = {
  isActionPending: boolean;
  setIsActionPending: (value: boolean) => void;
  previewOverrides: Map<string, VersePreviewOverride>;
  setPreviewOverride: (verse: Verse, patch: VersePreviewOverride) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (value: boolean) => void;
  showTrainingContactToast: (payload: TrainingContactToastPayload) => void;
  showTrainingMilestonePopup: (payload: TrainingCompletionToastCardPayload) => Promise<void>;
  trainingMilestonePopup: TrainingCompletionToastCardPayload | null;
  confirmTrainingMilestonePopup: () => void;
  /** Kept outside the memoized core so changes don't trigger re-render cascades */
  slideAnnouncement: string;
  setSlideAnnouncement: (text: string) => void;
};

export function useGalleryAux(): UseGalleryAuxReturn {
  const [isActionPending, setIsActionPending] = useState(false);
  const [previewOverrides, setPreviewOverrides] = useState<Map<string, VersePreviewOverride>>(
    () => new Map()
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  // Stabilize the core object — slideAnnouncement is split out so frequent
  // accessibility updates don't trigger re-render cascades through aux deps.
  const core = useMemo(
    () => ({
      isActionPending,
      setIsActionPending,
      previewOverrides,
      setPreviewOverride,
      isDeleteDialogOpen,
      setIsDeleteDialogOpen,
      showTrainingContactToast,
      showTrainingMilestonePopup,
      trainingMilestonePopup,
      confirmTrainingMilestonePopup,
    }),
    [
      isActionPending,
      previewOverrides,
      isDeleteDialogOpen,
      showTrainingContactToast,
      showTrainingMilestonePopup,
      trainingMilestonePopup,
      confirmTrainingMilestonePopup,
      setPreviewOverride,
    ]
  );

  // Merge core + announcement into a single return — the reference changes
  // only when core OR announcement actually changes.
  return useMemo(
    () => ({
      ...core,
      slideAnnouncement,
      setSlideAnnouncement,
    }),
    [core, slideAnnouncement]
  );
}
