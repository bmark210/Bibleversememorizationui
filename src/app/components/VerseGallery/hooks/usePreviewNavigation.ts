import { useState, useCallback } from "react";
import type { Verse } from "@/app/App";
import { haptic, getVerseIdentity } from "../utils";

type Params = {
  verses: Verse[];
  initialIndex: number;
  previewHasMore: boolean;
  previewIsLoadingMore: boolean;
  onRequestMorePreviewVerses?: () => Promise<boolean>;
};

export type UsePreviewNavigationReturn = {
  activeIndex: number;
  direction: number;
  setActiveIndex: (index: number) => void;
  setDirection: (dir: number) => void;
  navigatePreviewTo: (dir: "prev" | "next") => Promise<void>;
  syncIndexToVerseKey: (key: string) => void;
};

export function usePreviewNavigation({
  verses,
  initialIndex,
  previewHasMore,
  previewIsLoadingMore,
  onRequestMorePreviewVerses,
}: Params): UsePreviewNavigationReturn {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  const navigatePreviewTo = useCallback(
    async (dir: "prev" | "next") => {
      const newDir = dir === "next" ? 1 : -1;
      if (dir === "next") {
        if (activeIndex < verses.length - 1) {
          haptic("light");
          setDirection(newDir);
          setActiveIndex(Math.min(activeIndex + 1, Math.max(0, verses.length - 1)));
          return;
        }
        if (!previewHasMore || previewIsLoadingMore || !onRequestMorePreviewVerses) {
          if (!previewIsLoadingMore) haptic("warning");
          return;
        }
        const didLoadMore = await onRequestMorePreviewVerses();
        if (!didLoadMore) return;
        haptic("light");
        setDirection(newDir);
        setActiveIndex(Math.min(activeIndex + 1, Math.max(0, verses.length)));
        return;
      }
      const newIndex = Math.max(0, activeIndex - 1);
      if (newIndex === activeIndex) {
        haptic("warning");
        return;
      }
      haptic("light");
      setDirection(newDir);
      setActiveIndex(Math.max(0, activeIndex - 1));
    },
    [activeIndex, verses.length, previewHasMore, previewIsLoadingMore, onRequestMorePreviewVerses]
  );

  const syncIndexToVerseKey = useCallback(
    (key: string) => {
      const nextIndex = verses.findIndex((v) => getVerseIdentity(v) === key);
      if (nextIndex >= 0) setActiveIndex(nextIndex);
    },
    [verses]
  );

  return {
    activeIndex,
    direction,
    setActiveIndex,
    setDirection,
    navigatePreviewTo,
    syncIndexToVerseKey,
  };
}
