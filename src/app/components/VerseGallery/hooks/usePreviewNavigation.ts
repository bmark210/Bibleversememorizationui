import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Verse } from "@/app/domain/verse";
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
  navigatePreviewTo: (dir: "prev" | "next") => Promise<boolean>;
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
  const backgroundPrefetchLengthRef = useRef<number | null>(null);

  // Refs for values accessed inside navigatePreviewTo to keep the
  // callback identity stable.  Assigned directly in render (not via
  // useEffect) so they are never stale when navigatePreviewTo fires.
  const versesLengthRef = useRef(verses.length);
  const activeIndexRef = useRef(activeIndex);
  const previewHasMoreRef = useRef(previewHasMore);
  const previewIsLoadingMoreRef = useRef(previewIsLoadingMore);
  const onRequestMoreRef = useRef(onRequestMorePreviewVerses);

  versesLengthRef.current = verses.length;
  activeIndexRef.current = activeIndex;
  previewHasMoreRef.current = previewHasMore;
  previewIsLoadingMoreRef.current = previewIsLoadingMore;
  onRequestMoreRef.current = onRequestMorePreviewVerses;

  useEffect(() => {
    const maxIndex = Math.max(0, verses.length - 1);
    const clampedInitialIndex = Math.min(Math.max(0, initialIndex), maxIndex);
    if (clampedInitialIndex === activeIndexRef.current) return;

    startTransition(() => {
      setDirection(0);
      setActiveIndex(clampedInitialIndex);
    });
  }, [initialIndex, verses.length]);

  useEffect(() => {
    if (!previewHasMore || previewIsLoadingMore || !onRequestMorePreviewVerses) {
      return;
    }

    const prefetchTriggerIndex = Math.max(0, verses.length - 2);
    if (activeIndex < prefetchTriggerIndex) {
      return;
    }

    if (backgroundPrefetchLengthRef.current === verses.length) {
      return;
    }

    backgroundPrefetchLengthRef.current = verses.length;
    void onRequestMorePreviewVerses();
  }, [
    activeIndex,
    onRequestMorePreviewVerses,
    previewHasMore,
    previewIsLoadingMore,
    verses.length,
  ]);
  const commitNavigation = useCallback(
    (nextDirection: number, nextIndex: number | ((prev: number) => number)) => {
      startTransition(() => {
        setDirection(nextDirection);
        if (typeof nextIndex === "function") {
          setActiveIndex(nextIndex as (prev: number) => number);
          return;
        }
        setActiveIndex(nextIndex);
      });
    },
    []
  );

  const navigatePreviewTo = useCallback(
    async (dir: "prev" | "next") => {
      const idx = activeIndexRef.current;
      const len = versesLengthRef.current;
      const newDir = dir === "next" ? 1 : -1;

      if (dir === "next") {
        if (idx < len - 1) {
          haptic("light");
          commitNavigation(newDir, Math.min(idx + 1, Math.max(0, len - 1)));
          return true;
        }
        const hasMore = previewHasMoreRef.current;
        const isLoading = previewIsLoadingMoreRef.current;
        const requestMore = onRequestMoreRef.current;
        if (!hasMore || isLoading || !requestMore) {
          if (!isLoading) haptic("warning");
          return false;
        }
        const didLoadMore = await requestMore();
        if (!didLoadMore) return false;
        haptic("light");
        commitNavigation(newDir, (prev) =>
          Math.min(prev + 1, Math.max(0, versesLengthRef.current))
        );
        return true;
      }

      if (idx === 0) {
        haptic("warning");
        return false;
      }
      haptic("light");
      commitNavigation(newDir, (prev) => Math.max(0, prev - 1));
      return true;
    },
    [commitNavigation] // stable — all mutable state accessed via refs
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
