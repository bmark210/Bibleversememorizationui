import { useCallback, useMemo, useState } from "react";
import type { Verse } from "@/app/App";
import { getVerseIdentity } from "../utils";
import type { VersePreviewOverride } from "../types";

export type UseGalleryAuxReturn = {
  isActionPending: boolean;
  setIsActionPending: (value: boolean) => void;
  previewOverrides: Map<string, VersePreviewOverride>;
  setPreviewOverride: (verse: Verse, patch: VersePreviewOverride) => void;
  prunePreviewOverrides: (verses: Verse[]) => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (value: boolean) => void;
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

  const setPreviewOverride = useCallback((verse: Verse, patch: VersePreviewOverride) => {
    const key = getVerseIdentity(verse);
    setPreviewOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, { ...(next.get(key) ?? {}), ...patch });
      return next;
    });
  }, []);

  const prunePreviewOverrides = useCallback((verses: Verse[]) => {
    const allowedKeys = new Set(verses.map(getVerseIdentity));
    setPreviewOverrides((prev) => {
      let didChange = false;
      const next = new Map<string, VersePreviewOverride>();

      for (const [key, value] of prev) {
        if (!allowedKeys.has(key)) {
          didChange = true;
          continue;
        }
        next.set(key, value);
      }

      return didChange ? next : prev;
    });
  }, []);

  const core = useMemo(
    () => ({
      isActionPending,
      setIsActionPending,
      previewOverrides,
      setPreviewOverride,
      prunePreviewOverrides,
      isDeleteDialogOpen,
      setIsDeleteDialogOpen,
    }),
    [
      isActionPending,
      isDeleteDialogOpen,
      previewOverrides,
      prunePreviewOverrides,
      setPreviewOverride,
    ]
  );

  return useMemo(
    () => ({
      ...core,
      slideAnnouncement,
      setSlideAnnouncement,
    }),
    [core, slideAnnouncement]
  );
}
