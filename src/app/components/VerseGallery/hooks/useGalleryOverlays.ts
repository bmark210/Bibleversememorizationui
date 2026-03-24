import { useCallback, useMemo, useState } from "react";
import type { Verse } from "@/app/App";
import type { PlayerProfilePreview } from "../types";

type VerseTagsTarget = Pick<Verse, "reference" | "tags"> | null;
type VerseOwnersTarget = {
  externalVerseId: string;
  reference: string;
  scope: "friends" | "players";
  totalCount: number;
} | null;

type Params = {
  onSelectTag: (slug: string) => void;
};

export function useGalleryOverlays({ onSelectTag }: Params) {
  const [isVerseTagsDrawerOpen, setIsVerseTagsDrawerOpen] = useState(false);
  const [verseTagsTarget, setVerseTagsTarget] = useState<VerseTagsTarget>(null);
  const [isVerseOwnersDrawerOpen, setIsVerseOwnersDrawerOpen] = useState(false);
  const [verseOwnersTarget, setVerseOwnersTarget] =
    useState<VerseOwnersTarget>(null);
  const [isPlayerProfileDrawerOpen, setIsPlayerProfileDrawerOpen] =
    useState(false);
  const [activePlayerProfile, setActivePlayerProfile] =
    useState<PlayerProfilePreview | null>(null);
  const [isVerseProgressDrawerOpen, setIsVerseProgressDrawerOpen] =
    useState(false);

  const closeVerseTagsDrawer = useCallback(() => {
    setIsVerseTagsDrawerOpen(false);
    setVerseTagsTarget(null);
  }, []);

  const closeVerseOwnersDrawer = useCallback(() => {
    setIsVerseOwnersDrawerOpen(false);
    setVerseOwnersTarget(null);
  }, []);

  const closePlayerProfileDrawer = useCallback(() => {
    setIsPlayerProfileDrawerOpen(false);
    setActivePlayerProfile(null);
  }, []);

  const handleOpenTagsDrawer = useCallback((verse: Verse) => {
    if (!verse.tags || verse.tags.length === 0) return;

    setVerseTagsTarget({
      reference: verse.reference,
      tags: verse.tags,
    });
    setIsVerseTagsDrawerOpen(true);
  }, []);

  const handleOpenOwnersDrawer = useCallback((verse: Verse) => {
    if (
      !verse.popularityScope ||
      verse.popularityScope === "self" ||
      !verse.popularityValue
    ) {
      return;
    }

    setVerseOwnersTarget({
      externalVerseId: verse.externalVerseId,
      reference: verse.reference,
      scope: verse.popularityScope,
      totalCount: Math.max(0, Math.round(verse.popularityValue)),
    });
    setIsVerseOwnersDrawerOpen(true);
  }, []);

  const handleVerseTagSelect = useCallback(
    (slug: string) => {
      onSelectTag(slug);
      closeVerseTagsDrawer();
    },
    [closeVerseTagsDrawer, onSelectTag]
  );

  const handleOpenPlayerProfile = useCallback(
    (player: PlayerProfilePreview) => {
      if (!player.telegramId) return;

      setActivePlayerProfile({
        telegramId: player.telegramId,
        name: player.name,
        avatarUrl: player.avatarUrl ?? null,
      });
      setIsPlayerProfileDrawerOpen(true);
    },
    []
  );

  const handleOpenProgress = useCallback(() => {
    setIsVerseProgressDrawerOpen(true);
  }, []);

  const handleVerseTagsOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeVerseTagsDrawer();
        return;
      }
      setIsVerseTagsDrawerOpen(true);
    },
    [closeVerseTagsDrawer]
  );

  const handleVerseOwnersOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeVerseOwnersDrawer();
        return;
      }
      setIsVerseOwnersDrawerOpen(true);
    },
    [closeVerseOwnersDrawer]
  );

  const handlePlayerProfileOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closePlayerProfileDrawer();
        return;
      }
      setIsPlayerProfileDrawerOpen(true);
    },
    [closePlayerProfileDrawer]
  );

  const isOverlayOpen = useMemo(
    () =>
      isVerseTagsDrawerOpen ||
      isVerseOwnersDrawerOpen ||
      isPlayerProfileDrawerOpen ||
      isVerseProgressDrawerOpen,
    [
      isPlayerProfileDrawerOpen,
      isVerseOwnersDrawerOpen,
      isVerseProgressDrawerOpen,
      isVerseTagsDrawerOpen,
    ]
  );

  const closeActiveOverlay = useCallback(() => {
    if (isPlayerProfileDrawerOpen) {
      closePlayerProfileDrawer();
      return true;
    }
    if (isVerseOwnersDrawerOpen) {
      closeVerseOwnersDrawer();
      return true;
    }
    if (isVerseTagsDrawerOpen) {
      closeVerseTagsDrawer();
      return true;
    }
    if (isVerseProgressDrawerOpen) {
      setIsVerseProgressDrawerOpen(false);
      return true;
    }
    return false;
  }, [
    closePlayerProfileDrawer,
    closeVerseOwnersDrawer,
    closeVerseTagsDrawer,
    isPlayerProfileDrawerOpen,
    isVerseOwnersDrawerOpen,
    isVerseProgressDrawerOpen,
    isVerseTagsDrawerOpen,
  ]);

  return {
    isOverlayOpen,
    isVerseTagsDrawerOpen,
    verseTagsTarget,
    isVerseOwnersDrawerOpen,
    verseOwnersTarget,
    isPlayerProfileDrawerOpen,
    activePlayerProfile,
    isVerseProgressDrawerOpen,
    setIsVerseProgressDrawerOpen,
    closeActiveOverlay,
    handleOpenTagsDrawer,
    handleOpenOwnersDrawer,
    handleVerseTagSelect,
    handleOpenPlayerProfile,
    handleOpenProgress,
    handleVerseTagsOpenChange,
    handleVerseOwnersOpenChange,
    handlePlayerProfileOpenChange,
  };
}
