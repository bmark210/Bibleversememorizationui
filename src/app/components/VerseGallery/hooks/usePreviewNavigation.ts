import { useState, useCallback, useRef } from "react";
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

  // Use refs for values accessed inside navigatePreviewTo to avoid
  // recreating the callback on every index / list change.
  const versesLengthRef = useRef(verses.length);
  versesLengthRef.current = verses.length;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const previewHasMoreRef = useRef(previewHasMore);
  previewHasMoreRef.current = previewHasMore;
  const previewIsLoadingMoreRef = useRef(previewIsLoadingMore);
  previewIsLoadingMoreRef.current = previewIsLoadingMore;
  const onRequestMoreRef = useRef(onRequestMorePreviewVerses);
  onRequestMoreRef.current = onRequestMorePreviewVerses;

  const navigatePreviewTo = useCallback(
    async (dir: "prev" | "next") => {
      const idx = activeIndexRef.current;
      const len = versesLengthRef.current;
      const newDir = dir === "next" ? 1 : -1;

      if (dir === "next") {
        if (idx < len - 1) {
          haptic("light");
          setDirection(newDir);
          setActiveIndex(Math.min(idx + 1, Math.max(0, len - 1)));
          return;
        }
        const hasMore = previewHasMoreRef.current;
        const isLoading = previewIsLoadingMoreRef.current;
        const requestMore = onRequestMoreRef.current;
        if (!hasMore || isLoading || !requestMore) {
          if (!isLoading) haptic("warning");
          return;
        }
        const didLoadMore = await requestMore();
        if (!didLoadMore) return;
        haptic("light");
        setDirection(newDir);
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, versesLengthRef.current)));
        return;
      }

      if (idx === 0) {
        haptic("warning");
        return;
      }
      haptic("light");
      setDirection(newDir);
      setActiveIndex((prev) => Math.max(0, prev - 1));
    },
    [] // stable — all mutable state accessed via refs
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
