"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Dumbbell,
  Trash2,
} from "lucide-react";
import {
  patchVerseStatus,
  removeTextFromBox,
  replaceLearningVerseInTextBox,
} from "@/api/services/textBoxes";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/app/components/ui/utils";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { type Verse } from "@/app/domain/verse";
import { VerseGallery } from "@/app/components/VerseGallery/VerseGallery";
import { usePublicTextBoxes } from "@/app/hooks/texts/usePublicTextBoxes";
import { usePublicTextBoxVerses } from "@/app/hooks/texts/usePublicTextBoxVerses";
import { useTextBoxes } from "@/app/hooks/texts/useTextBoxes";
import { useTextBoxVerses } from "@/app/hooks/texts/useTextBoxVerses";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import type {
  PublicTextBoxOwner,
  TextBoxSummary,
  TextBoxVisibility,
  TextWorkspaceTab,
  TrainingBoxScope,
} from "@/app/types/textBox";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { toast } from "@/app/lib/toast";
import {
  VerseTagsDrawer,
  type VerseTagsDrawerTarget,
} from "@/app/components/verse-list/components/VerseTagsDrawer";
import { compareExternalVerseIdsCanonically } from "@/shared/bible/externalVerseId";
import {
  buildTextBoxStats,
  buildTextBoxSummary,
  formatRussianCount,
  TextBoxCard,
  // TextStatPills,
  TextSurfaceCard,
  TextVerseCard,
} from "./TextCards";
import { BibleCatalogView } from "./BibleCatalogView";
import { LearningReplacementDrawer } from "./LearningReplacementDrawer";
import { VerseDeleteDrawer } from "@/app/components/VerseDeleteDrawer";
import {
  getTextVerseStatusMutation,
  resolveTextVersePresentation,
} from "./resolveTextVersePresentation";

type TextsScreenProps = {
  reopenTextBoxId?: string | null;
  reopenTextBoxTitle?: string | null;
  onReopenTextBoxHandled?: () => void;
  verseListExternalSyncVersion?: number;
  onVerseMutationCommitted?: () => void;
  onNavigateToTraining?: (launch: DirectLaunchVerse) => void;
  onNavigateToTrainingBox?: (scope: TrainingBoxScope) => void;
  telegramId?: string | null;
};

type BoxEditorState =
  | { mode: "create" }
  | { mode: "rename"; box: TextBoxSummary }
  | null;

type GalleryState = {
  initialIndex: number;
  boxId: string;
  boxTitle: string;
} | null;
type LearningReplacementState = { pauseVerse: Verse } | null;
type BoxesViewMode = "mine" | "public";

function compareVersesCanonically(left: Verse, right: Verse) {
  return (
    compareExternalVerseIdsCanonically(
      left.externalVerseId,
      right.externalVerseId,
    ) || left.reference.localeCompare(right.reference, "ru")
  );
}

function sortVersesCanonically(verses: Verse[]) {
  return [...verses].sort(compareVersesCanonically);
}

function getBoxScope(
  box: Pick<TextBoxSummary, "id" | "title">,
): TrainingBoxScope {
  return { boxId: box.id, boxTitle: box.title };
}

function getOwnerDisplayName(owner?: PublicTextBoxOwner | null) {
  const nickname = String(owner?.nickname ?? "").trim();
  if (nickname) return nickname;

  const name = String(owner?.name ?? "").trim();
  if (name) return name;

  return "Автор";
}

function getOwnerInitials(owner?: PublicTextBoxOwner | null) {
  const parts = getOwnerDisplayName(owner)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "A";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function buildPublicTextBoxSummaryLabel(box: {
  stats: { totalCount: number };
}) {
  return formatRussianCount(box.stats.totalCount, ["стих", "стиха", "стихов"]);
}

function WorkspaceTabs({
  activeTab,
  onChange,
}: {
  activeTab: TextWorkspaceTab;
  onChange: (tab: TextWorkspaceTab) => void;
}) {
  return (
    <div className="flex rounded-[1.2rem] border border-border-subtle bg-bg-subtle p-1">
      {[
        { id: "catalog" as const, label: "Стихи" },
        { id: "boxes" as const, label: "Коробки" },
      ].map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "flex-1 rounded-[0.95rem] px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-bg-elevated text-text-primary shadow-[var(--shadow-soft)]"
                : "text-text-secondary",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function CompactSegmentedControl<T extends string>({
  value,
  items,
  onChange,
}: {
  value: T;
  items: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border-subtle/80 bg-bg-subtle/70 p-1 shadow-[var(--shadow-soft)]">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-bg-elevated text-text-primary shadow-[var(--shadow-soft)]"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function TextBoxEditorDrawer({
  state,
  titleValue,
  isSubmitting,
  onTitleChange,
  onSubmit,
  onOpenChange,
}: {
  state: BoxEditorState;
  titleValue: string;
  isSubmitting: boolean;
  onTitleChange: (value: string) => void;
  onSubmit: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const isOpen = state !== null;
  const mode = state?.mode ?? "create";
  const title = mode === "create" ? "Новая коробка" : "Переименовать коробку";

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4">
        <DrawerHeader className="px-0">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>

        <div className="pb-2">
          <Input
            autoFocus
            value={titleValue}
            maxLength={80}
            placeholder="Название"
            className="h-11 rounded-[1.15rem] border-border-subtle bg-bg-surface"
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </div>

        <DrawerFooter className="px-0">
          <Button
            type="button"
            className="rounded-[1.2rem]"
            disabled={isSubmitting || !titleValue.trim()}
            onClick={onSubmit}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Создать коробку" : "Сохранить"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function BoxSettingsDrawer({
  box,
  isDeleting,
  isUpdatingVisibility,
  onOpenChange,
  onRename,
  onDelete,
  onVisibilityChange,
}: {
  box: TextBoxSummary | null;
  isDeleting: boolean;
  isUpdatingVisibility: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onDelete: () => void;
  onVisibilityChange: (visibility: TextBoxVisibility) => void;
}) {
  return (
    <Drawer open={box !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4">
        <DrawerHeader className="px-0">
          <DrawerTitle>{box?.title ?? "Коробка"}</DrawerTitle>
        </DrawerHeader>

        <div className="space-y-3 pb-2">
          <div className="rounded-[1.5rem] border border-border-default/55 bg-bg-elevated px-4 py-3 shadow-[var(--shadow-soft)]">
            <div className="mb-3">
              <div className="text-sm font-medium text-text-primary">
                Видимость
              </div>
            </div>
            <CompactSegmentedControl<TextBoxVisibility>
              value={box?.visibility ?? "private"}
              items={[
                { value: "private", label: "Приватная" },
                { value: "public", label: "Публичная" },
              ]}
              onChange={(visibility) => {
                if (!box || isUpdatingVisibility) return;
                onVisibilityChange(visibility);
              }}
            />
            {isUpdatingVisibility ? (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Обновление
              </div>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!box}
            onClick={onRename}
            className={cn(
              "flex w-full items-center justify-between rounded-[1.5rem] border border-border-default/55 bg-bg-elevated px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-bg-surface",
              !box && "pointer-events-none opacity-50",
            )}
          >
            <span className="text-sm font-medium text-text-primary">
              Переименовать
            </span>
            <MoreHorizontal className="h-4 w-4 text-text-muted" />
          </button>

          <button
            type="button"
            disabled={!box || isDeleting || isUpdatingVisibility}
            onClick={onDelete}
            className={cn(
              "flex w-full items-center justify-between rounded-[1.5rem] border border-state-error/20 bg-state-error/5 px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-state-error/10",
              (!box || isDeleting || isUpdatingVisibility) &&
                "pointer-events-none opacity-50",
            )}
          >
            <span className="text-sm font-medium text-state-error">
              Удалить коробку
            </span>
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin text-state-error" />
            ) : (
              <Trash2 className="h-4 w-4 text-state-error" />
            )}
          </button>
        </div>

        <DrawerFooter className="px-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function TextsScreen({
  reopenTextBoxId = null,
  reopenTextBoxTitle = null,
  onReopenTextBoxHandled,
  verseListExternalSyncVersion = 0,
  onVerseMutationCommitted,
  onNavigateToTraining,
  onNavigateToTrainingBox,
  telegramId = null,
}: TextsScreenProps) {
  const [activeTab, setActiveTab] = useState<TextWorkspaceTab>("boxes");
  const [boxesViewMode, setBoxesViewMode] = useState<BoxesViewMode>("mine");
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [selectedPublicBoxId, setSelectedPublicBoxId] = useState<string | null>(
    null,
  );
  const [editorState, setEditorState] = useState<BoxEditorState>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [isEditorSubmitting, setIsEditorSubmitting] = useState(false);
  const [settingsBox, setSettingsBox] = useState<TextBoxSummary | null>(null);
  const [isDeletingBox, setIsDeletingBox] = useState(false);
  const [isUpdatingBoxVisibility, setIsUpdatingBoxVisibility] = useState(false);
  const [isImportingPublicBox, setIsImportingPublicBox] = useState(false);
  const [busyVerseId, setBusyVerseId] = useState<string | null>(null);
  const [removeVerseTarget, setRemoveVerseTarget] = useState<Verse | null>(null);
  const [galleryState, setGalleryState] = useState<GalleryState>(null);
  const [replacementState, setReplacementState] =
    useState<LearningReplacementState>(null);
  const [boxTagDrawerTarget, setBoxTagDrawerTarget] =
    useState<VerseTagsDrawerTarget | null>(null);
  const [pendingCatalogTagSlug, setPendingCatalogTagSlug] = useState<
    string | null
  >(null);
  const [replacementSubmittingId, setReplacementSubmittingId] = useState<
    string | null
  >(null);

  const {
    boxes,
    isLoading: isLoadingBoxes,
    error: boxesError,
    refresh: refreshBoxes,
    create: createBox,
    importPublic: importPublicBox,
    rename: renameBox,
    setVisibility: setBoxVisibility,
    remove: removeBox,
  } = useTextBoxes(telegramId);

  const {
    items: publicBoxes,
    total: publicBoxesTotal,
    isLoading: isLoadingPublicBoxes,
    isLoadingMore: isLoadingMorePublicBoxes,
    error: publicBoxesError,
    refresh: refreshPublicBoxes,
    loadMore: loadMorePublicBoxes,
    hasMore: hasMorePublicBoxes,
  } = usePublicTextBoxes();

  const selectedBox = useMemo(
    () => boxes.find((box) => box.id === selectedBoxId) ?? null,
    [boxes, selectedBoxId],
  );
  const selectedPublicBox = useMemo(
    () => publicBoxes.find((box) => box.id === selectedPublicBoxId) ?? null,
    [publicBoxes, selectedPublicBoxId],
  );

  const {
    verses: selectedBoxItems,
    box: selectedBoxFromApi,
    isLoading: isLoadingSelectedBox,
    error: selectedBoxError,
    refresh: refreshSelectedBox,
  } = useTextBoxVerses(telegramId, selectedBoxId);
  const {
    verses: publicBoxItems,
    box: selectedPublicBoxFromApi,
    isLoading: isLoadingSelectedPublicBox,
    error: selectedPublicBoxError,
    refresh: refreshSelectedPublicBox,
  } = usePublicTextBoxVerses(selectedPublicBoxId);

  const visibleBox = selectedBox ?? selectedBoxFromApi ?? null;
  const visibleBoxTitle = visibleBox?.title ?? reopenTextBoxTitle ?? "Коробка";
  const visiblePublicBox =
    selectedPublicBox ?? selectedPublicBoxFromApi ?? null;
  const sortedBoxVerses = useMemo(
    () => sortVersesCanonically(selectedBoxItems.map((item) => item.verse)),
    [selectedBoxItems],
  );
  const sortedPublicBoxVerses = useMemo(
    () => sortVersesCanonically(publicBoxItems.map((item) => item.verse)),
    [publicBoxItems],
  );
  const replacementSections = useMemo(() => {
    const queueVerses = sortedBoxVerses
      .filter(
        (verse) => resolveTextVersePresentation(verse).label === "Очередь",
      )
      .sort(
        (left, right) =>
          (left.queuePosition ?? Number.MAX_SAFE_INTEGER) -
            (right.queuePosition ?? Number.MAX_SAFE_INTEGER) ||
          compareVersesCanonically(left, right),
      );
    const pausedVerses = sortedBoxVerses
      .filter((verse) => resolveTextVersePresentation(verse).label === "Пауза")
      .sort(compareVersesCanonically);

    return [
      { key: "queue" as const, title: "Очередь", verses: queueVerses },
      { key: "paused" as const, title: "Пауза", verses: pausedVerses },
    ];
  }, [sortedBoxVerses]);
  const hasReplacementCandidates = useMemo(
    () => replacementSections.some((section) => section.verses.length > 0),
    [replacementSections],
  );
  const galleryInitialIndex = useMemo(() => {
    if (!galleryState) return 0;
    return Math.min(
      galleryState.initialIndex,
      Math.max(0, sortedBoxVerses.length - 1),
    );
  }, [galleryState, sortedBoxVerses.length]);

  useEffect(() => {
    if (!reopenTextBoxId) return;
    setActiveTab("boxes");
    setBoxesViewMode("mine");
    setSelectedPublicBoxId(null);
    setSelectedBoxId(reopenTextBoxId);
    void Promise.allSettled([refreshBoxes(), refreshSelectedBox()]);
    onReopenTextBoxHandled?.();
  }, [
    onReopenTextBoxHandled,
    refreshBoxes,
    refreshSelectedBox,
    reopenTextBoxId,
  ]);

  useEffect(() => {
    if (!selectedBoxId) return;
    if (boxes.length === 0 || boxes.some((box) => box.id === selectedBoxId))
      return;
    setSelectedBoxId(null);
  }, [boxes, selectedBoxId]);

  useEffect(() => {
    if (!selectedBoxId) return;
    void Promise.allSettled([refreshSelectedBox(), refreshBoxes()]);
  }, [refreshBoxes, refreshSelectedBox, selectedBoxId]);

  useEffect(() => {
    if (!selectedPublicBoxId) return;
    void Promise.allSettled([refreshSelectedPublicBox(), refreshPublicBoxes()]);
  }, [refreshPublicBoxes, refreshSelectedPublicBox, selectedPublicBoxId]);

  useEffect(() => {
    if (!selectedPublicBoxId) {
      setIsImportingPublicBox(false);
    }
  }, [selectedPublicBoxId]);

  useEffect(() => {
    if (!galleryState) return;
    if (galleryState.boxId !== selectedBoxId) {
      setGalleryState(null);
      return;
    }
    if (sortedBoxVerses.length === 0) {
      setGalleryState(null);
    }
  }, [galleryState, selectedBoxId, sortedBoxVerses.length]);

  useEffect(() => {
    if (!replacementState) return;
    if (!selectedBoxId) {
      setReplacementState(null);
      return;
    }
    const stillExists = sortedBoxVerses.some(
      (verse) =>
        verse.externalVerseId === replacementState.pauseVerse.externalVerseId,
    );
    if (!stillExists) {
      setReplacementState(null);
    }
  }, [replacementState, selectedBoxId, sortedBoxVerses]);

  useEffect(() => {
    if (verseListExternalSyncVersion <= 0) return;
    void Promise.allSettled([
      refreshBoxes(),
      refreshPublicBoxes(),
      selectedBoxId ? refreshSelectedBox() : Promise.resolve(null),
      selectedPublicBoxId ? refreshSelectedPublicBox() : Promise.resolve(null),
    ]);
  }, [
    refreshBoxes,
    refreshPublicBoxes,
    refreshSelectedBox,
    refreshSelectedPublicBox,
    selectedBoxId,
    selectedPublicBoxId,
    verseListExternalSyncVersion,
  ]);

  useTelegramBackButton({
    enabled: Boolean(selectedBoxId || selectedPublicBoxId),
    onBack: () => {
      if (selectedPublicBoxId) {
        setSelectedPublicBoxId(null);
        return;
      }
      setSelectedBoxId(null);
    },
    priority: 50,
  });

  const openCreateDrawer = useCallback(() => {
    setEditorTitle("");
    setEditorState({ mode: "create" });
  }, []);

  const handleWorkspaceTabChange = useCallback((tab: TextWorkspaceTab) => {
    setActiveTab(tab);
    if (tab !== "boxes") {
      setSelectedBoxId(null);
      setSelectedPublicBoxId(null);
      setSettingsBox(null);
    }
  }, []);

  const handleBoxesViewModeChange = useCallback((mode: BoxesViewMode) => {
    setBoxesViewMode(mode);
    setSelectedBoxId(null);
    setSelectedPublicBoxId(null);
    setSettingsBox(null);
  }, []);

  const openRenameDrawer = useCallback((box: TextBoxSummary) => {
    setSettingsBox(null);
    setEditorTitle(box.title);
    setEditorState({ mode: "rename", box });
  }, []);

  const handleEditorOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditorState(null);
      setEditorTitle("");
    }
  }, []);

  const handleSaveBox = useCallback(async () => {
    if (!telegramId || !editorState) return;
    const nextTitle = editorTitle.trim();
    if (!nextTitle) return;

    setIsEditorSubmitting(true);
    try {
      if (editorState.mode === "create") {
        const created = await createBox(nextTitle);
        setActiveTab("boxes");
        setBoxesViewMode("mine");
        setSelectedBoxId(created.id);
        toast.success("Коробка создана", {
          description: created.title,
          label: "Тексты",
        });
      } else {
        const updated = await renameBox(editorState.box.id, nextTitle);
        await refreshPublicBoxes();
        setSelectedBoxId((prev) => (prev === updated.id ? updated.id : prev));
        toast.success("Название обновлено", {
          description: updated.title,
          label: "Тексты",
        });
      }
      setEditorState(null);
      setEditorTitle("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось сохранить коробку",
        { label: "Тексты" },
      );
    } finally {
      setIsEditorSubmitting(false);
    }
  }, [
    createBox,
    editorState,
    editorTitle,
    refreshPublicBoxes,
    renameBox,
    telegramId,
  ]);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSettingsBox(null);
      setIsUpdatingBoxVisibility(false);
    }
  }, []);

  const handleUpdateBoxVisibility = useCallback(
    async (visibility: TextBoxVisibility) => {
      if (!settingsBox || settingsBox.visibility === visibility) return;

      setIsUpdatingBoxVisibility(true);
      try {
        const updated = await setBoxVisibility(settingsBox.id, visibility);
        setSettingsBox(updated);
        await refreshPublicBoxes();
        toast.success(
          visibility === "public"
            ? "Коробка стала публичной"
            : "Коробка стала приватной",
          {
            description: updated.title,
            label: "Тексты",
          },
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Не удалось обновить видимость коробки",
          { label: "Тексты" },
        );
      } finally {
        setIsUpdatingBoxVisibility(false);
      }
    },
    [refreshPublicBoxes, setBoxVisibility, settingsBox],
  );

  const handleDeleteBox = useCallback(async () => {
    if (!settingsBox) return;
    setIsDeletingBox(true);
    try {
      const boxId = settingsBox.id;
      const title = settingsBox.title;
      await removeBox(boxId);
      await refreshPublicBoxes();
      if (selectedBoxId === boxId) {
        setSelectedBoxId(null);
      }
      setSettingsBox(null);
      toast.success("Коробка удалена", { description: title, label: "Тексты" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось удалить коробку",
        { label: "Тексты" },
      );
    } finally {
      setIsDeletingBox(false);
    }
  }, [refreshPublicBoxes, removeBox, selectedBoxId, settingsBox]);

  const handlePatchVerse = useCallback(
    async (verse: Verse) => {
      if (!telegramId || !selectedBoxId) return;
      const mutation = getTextVerseStatusMutation(verse);
      if (!mutation) return;
      setBusyVerseId(verse.externalVerseId);
      try {
        await patchVerseStatus(
          telegramId,
          verse.externalVerseId,
          mutation.nextStatus,
        );
        await Promise.allSettled([
          refreshSelectedBox(),
          refreshBoxes(),
          refreshPublicBoxes(),
        ]);
        onVerseMutationCommitted?.();
        toast.success("Статус обновлен", {
          description: `${verse.reference} · ${mutation.label}`,
          label: "Тексты",
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось обновить статус",
          { label: "Тексты" },
        );
      } finally {
        setBusyVerseId(null);
      }
    },
    [
      onVerseMutationCommitted,
      refreshBoxes,
      refreshPublicBoxes,
      refreshSelectedBox,
      selectedBoxId,
      telegramId,
    ],
  );

  const handleRemoveVerse = useCallback(
    async (verse: Verse) => {
      if (!telegramId || !selectedBoxId) return;
      setBusyVerseId(verse.externalVerseId);
      try {
        await removeTextFromBox(
          telegramId,
          selectedBoxId,
          verse.externalVerseId,
        );
        await Promise.allSettled([
          refreshSelectedBox(),
          refreshBoxes(),
          refreshPublicBoxes(),
        ]);
        onVerseMutationCommitted?.();
        toast.success("Стих удален из коробки", {
          description: verse.reference,
          label: "Тексты",
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось удалить стих",
          { label: "Тексты" },
        );
      } finally {
        setBusyVerseId(null);
      }
    },
    [
      onVerseMutationCommitted,
      refreshBoxes,
      refreshPublicBoxes,
      refreshSelectedBox,
      selectedBoxId,
      telegramId,
    ],
  );

  const handleOpenReplacementDrawer = useCallback((verse: Verse) => {
    setReplacementState({ pauseVerse: verse });
  }, []);

  const handleReplacementDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setReplacementState(null);
      setReplacementSubmittingId(null);
    }
  }, []);

  const handleReplaceLearningVerse = useCallback(
    async (activateVerse: Verse) => {
      if (!telegramId || !selectedBoxId || !replacementState) return;
      const pauseVerse = replacementState.pauseVerse;

      setBusyVerseId(pauseVerse.externalVerseId);
      setReplacementSubmittingId(activateVerse.externalVerseId);
      try {
        await replaceLearningVerseInTextBox(telegramId, selectedBoxId, {
          activateExternalVerseId: activateVerse.externalVerseId,
          pauseExternalVerseId: pauseVerse.externalVerseId,
        });
        await Promise.allSettled([
          refreshSelectedBox(),
          refreshBoxes(),
          refreshPublicBoxes(),
        ]);
        onVerseMutationCommitted?.();
        setReplacementState(null);
        toast.success("Стих заменен", {
          description: `${activateVerse.reference} вместо ${pauseVerse.reference}`,
          label: "Тексты",
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Не удалось заменить стих",
          {
            label: "Тексты",
          },
        );
      } finally {
        setBusyVerseId(null);
        setReplacementSubmittingId(null);
      }
    },
    [
      onVerseMutationCommitted,
      refreshBoxes,
      refreshPublicBoxes,
      refreshSelectedBox,
      replacementState,
      selectedBoxId,
      telegramId,
    ],
  );

  const handleTrainBox = useCallback(() => {
    if (!visibleBox || !onNavigateToTrainingBox) return;
    onNavigateToTrainingBox(getBoxScope(visibleBox));
  }, [onNavigateToTrainingBox, visibleBox]);

  const handleOpenBoxGallery = useCallback(
    (index: number) => {
      if (!visibleBox) return;
      setGalleryState({
        initialIndex: index,
        boxId: visibleBox.id,
        boxTitle: visibleBox.title,
      });
    },
    [visibleBox],
  );

  const handleGalleryClose = useCallback(() => {
    setGalleryState(null);
  }, []);

  const handleOpenBoxVerseTagsDrawer = useCallback((verse: Verse) => {
    if (!verse.tags || verse.tags.length === 0) return;

    setBoxTagDrawerTarget({
      reference: verse.reference,
      tags: verse.tags,
    });
  }, []);

  const handleBoxTagDrawerOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setBoxTagDrawerTarget(null);
    }
  }, []);

  const handleOpenCatalogForTag = useCallback((slug: string) => {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return;

    setBoxTagDrawerTarget(null);
    setGalleryState(null);
    setActiveTab("catalog");
    setSelectedBoxId(null);
    setSelectedPublicBoxId(null);
    setPendingCatalogTagSlug(normalizedSlug);
  }, []);

  const handlePendingCatalogTagHandled = useCallback(() => {
    setPendingCatalogTagSlug(null);
  }, []);

  const handleImportPublicBox = useCallback(async () => {
    if (!telegramId || !visiblePublicBox) return;

    setIsImportingPublicBox(true);
    try {
      const created = await importPublicBox(visiblePublicBox.id);
      setActiveTab("boxes");
      setBoxesViewMode("mine");
      setSelectedPublicBoxId(null);
      setSelectedBoxId(created.id);
      toast.success("Коробка добавлена", {
        description: created.title,
        label: "Тексты",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось добавить коробку",
        { label: "Тексты" },
      );
    } finally {
      setIsImportingPublicBox(false);
    }
  }, [importPublicBox, telegramId, visiblePublicBox]);

  const handleGalleryStatusChange = useCallback(
    async (verse: Verse, status: VerseStatus) => {
      if (!telegramId || !galleryState) return;
      await patchVerseStatus(
        telegramId,
        verse.externalVerseId,
        status as "LEARNING" | "STOPPED" | "QUEUE",
      );
      await Promise.allSettled([
        refreshSelectedBox(),
        refreshBoxes(),
        refreshPublicBoxes(),
      ]);
      onVerseMutationCommitted?.();
    },
    [
      galleryState,
      onVerseMutationCommitted,
      refreshBoxes,
      refreshPublicBoxes,
      refreshSelectedBox,
      telegramId,
    ],
  );

  const handleGalleryDelete = useCallback(
    async (verse: Verse) => {
      if (!telegramId || !galleryState) return;
      await removeTextFromBox(
        telegramId,
        galleryState.boxId,
        verse.externalVerseId,
      );
      await Promise.allSettled([
        refreshSelectedBox(),
        refreshBoxes(),
        refreshPublicBoxes(),
      ]);
      onVerseMutationCommitted?.();
    },
    [
      galleryState,
      onVerseMutationCommitted,
      refreshBoxes,
      refreshPublicBoxes,
      refreshSelectedBox,
      telegramId,
    ],
  );

  const handleGalleryNavigateToTraining = useCallback(
    ({
      verse,
      preferredMode,
    }: {
      verse: Verse;
      preferredMode?: "learning" | "review" | "anchor";
    }) => {
      if (!onNavigateToTraining || !galleryState) return;
      if (!preferredMode) return;
      setGalleryState(null);
      onNavigateToTraining({
        verse,
        scope: {
          boxId: galleryState.boxId,
          boxTitle: galleryState.boxTitle,
        },
        preferredMode,
        returnTarget: {
          kind: "text-box",
          boxId: galleryState.boxId,
          boxTitle: galleryState.boxTitle,
        },
      });
    },
    [galleryState, onNavigateToTraining],
  );

  const renderBoxesList = () => {
    const isMineMode = boxesViewMode === "mine";
    const countLabel = formatRussianCount(
      isMineMode ? boxes.length : publicBoxesTotal,
      ["коробка", "коробки", "коробок"],
    );

    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full">
            <h1 className="my-2 [font-family:var(--font-heading)] text-[1.5rem] font-semibold tracking-tight text-text-primary sm:text-[2.25rem]">
              {isMineMode ? "Мои коробки" : "Публичные коробки"}
            </h1>
          </div>

          <CompactSegmentedControl<BoxesViewMode>
            value={boxesViewMode}
            items={[
              { value: "mine", label: "Мои" },
              { value: "public", label: "Публичные" },
            ]}
            onChange={handleBoxesViewModeChange}
          />
          {!selectedBoxId &&
          !selectedPublicBoxId &&
          activeTab === "boxes" &&
          boxesViewMode === "mine" ? (
            <Button
              type="button"
              className="rounded-full p-4 shadow-[var(--shadow-floating)]"
              onClick={openCreateDrawer}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <p className="my-2 px-2 text-sm text-text-muted">{countLabel}</p>

        <ScrollShadowContainer
          className="min-h-0 flex-1"
          scrollClassName="py-4"
          showShadows
          shadowSize={56}
          shadowStyle="mask"
        >
          {isMineMode ? (
            isLoadingBoxes ? (
              <div className="flex h-full items-center justify-center text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : boxesError ? (
              <TextSurfaceCard className="p-4 text-sm text-text-secondary">
                {boxesError}
              </TextSurfaceCard>
            ) : boxes.length === 0 ? (
              <TextSurfaceCard className="p-5 text-sm text-text-secondary">
                Коробок пока нет
              </TextSurfaceCard>
            ) : (
              <div className="space-y-3 !bg-transparent">
                {boxes.map((box) => (
                  <TextBoxCard
                    key={box.id}
                    box={box}
                    summary={buildTextBoxSummary(box)}
                    stats={buildTextBoxStats(box)}
                    onOpen={() => setSelectedBoxId(box.id)}
                    onOpenSettings={() => setSettingsBox(box)}
                  />
                ))}
              </div>
            )
          ) : isLoadingPublicBoxes ? (
            <div className="flex h-full items-center justify-center text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : publicBoxesError ? (
            <TextSurfaceCard className="p-4 text-sm text-text-secondary">
              {publicBoxesError}
            </TextSurfaceCard>
          ) : publicBoxes.length === 0 ? (
            <TextSurfaceCard className="p-5 text-sm text-text-secondary">
              Публичных коробок пока нет
            </TextSurfaceCard>
          ) : (
            <div className="space-y-3 !bg-transparent">
              {publicBoxes.map((box) => (
                <TextBoxCard
                  key={box.id}
                  box={box}
                  owner={box.owner}
                  summary={buildPublicTextBoxSummaryLabel(box)}
                  stats={buildTextBoxStats(box)}
                  onOpen={() => setSelectedPublicBoxId(box.id)}
                />
              ))}

              {hasMorePublicBoxes ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-full"
                    disabled={isLoadingMorePublicBoxes}
                    onClick={() => void loadMorePublicBoxes()}
                  >
                    {isLoadingMorePublicBoxes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Показать ещё
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </ScrollShadowContainer>
      </div>
    );
  };

  const renderBoxDetail = () => (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-w-0 py-4">
        <button
          type="button"
          onClick={() => setSelectedBoxId(null)}
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Коробки
        </button>

        {visibleBox ? (
          <TextSurfaceCard className="mt-3 min-w-0">
            <div className="flex min-w-0 items-start gap-3">
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    className="block min-w-0 truncate [font-family:var(--font-heading)] text-[1.4rem] font-semibold tracking-tight text-text-primary sm:text-[1.9rem]"
                    title={visibleBoxTitle}
                  >
                    {visibleBoxTitle}
                  </h2>
                  {visibleBox.visibility === "public" ? (
                    <span className="inline-flex items-center rounded-full border border-brand-primary/15 bg-brand-primary/8 px-2.5 py-1 text-[11px] font-medium text-brand-primary/88">
                      Публичная
                    </span>
                  ) : null}
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={() => setSettingsBox(visibleBox)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* <TextStatPills stats={buildTextBoxStats(visibleBox)} /> */}
              <Button
                type="button"
                className="h-11 rounded-full px-5"
                disabled={visibleBox.stats.totalCount === 0}
                onClick={handleTrainBox}
              >
                <Dumbbell className="h-4 w-4" />
                Тренировать
              </Button>
            </div>
          </TextSurfaceCard>
        ) : null}
      </div>

      <div className="">
        {isLoadingSelectedBox ? (
          <div className="flex h-full items-center justify-center text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : selectedBoxError ? (
          <TextSurfaceCard className="p-4 text-sm text-text-secondary">
            {selectedBoxError}
          </TextSurfaceCard>
        ) : sortedBoxVerses.length === 0 ? (
          <TextSurfaceCard className="p-5 text-sm text-text-secondary">
            Коробка пуста
          </TextSurfaceCard>
        ) : (
          <div className="space-y-3 mb-4">
            {sortedBoxVerses.map((verse, verseIndex) => {
              const presentation = resolveTextVersePresentation(verse);
              const mutation = getTextVerseStatusMutation(verse);
              const isBusy = busyVerseId === verse.externalVerseId;
              const canReplace =
                presentation.label === "Изучение" && hasReplacementCandidates;

              return (
                <TextVerseCard
                  key={verse.externalVerseId}
                  verse={verse}
                  stateLabel={presentation.label}
                  stateToneClassName={presentation.toneClassName}
                  textClassName="line-clamp-4"
                  tags={verse.tags}
                  onOpen={() => handleOpenBoxGallery(verseIndex)}
                  onTagsPress={() => handleOpenBoxVerseTagsDrawer(verse)}
                  footerActions={
                    <>
                      {canReplace ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3"
                          disabled={isBusy}
                          onClick={() => handleOpenReplacementDrawer(verse)}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          Заменить
                        </Button>
                      ) : null}
                      {mutation ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3"
                          disabled={isBusy}
                          onClick={() => void handlePatchVerse(verse)}
                        >
                          {mutation.nextStatus === "STOPPED" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          {mutation.label}
                        </Button>
                      ) : null}
                      <div className="flex-1 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-full px-3 text-state-error hover:text-state-error"
                          disabled={isBusy}
                          onClick={() => setRemoveVerseTarget(verse)}
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderPublicBoxDetail = () => (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col mb-4">
      <div className="min-w-0 py-4">
        <button
          type="button"
          onClick={() => setSelectedPublicBoxId(null)}
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Публичные коробки
        </button>

        {visiblePublicBox ? (
          <TextSurfaceCard className="mt-3 min-w-0">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    className="block min-w-0 truncate [font-family:var(--font-heading)] text-[1.4rem] font-semibold tracking-tight text-text-primary sm:text-[1.9rem]"
                    title={visiblePublicBox.title}
                  >
                    {visiblePublicBox.title}
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-brand-primary/15 bg-brand-primary/8 px-2.5 py-1 text-[11px] font-medium text-brand-primary/88">
                    Публичная
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3 text-sm text-text-muted">
                  <Avatar className="h-9 w-9 border border-border-subtle/70 bg-bg-surface">
                    {visiblePublicBox.owner.avatarUrl ? (
                      <AvatarImage
                        src={visiblePublicBox.owner.avatarUrl}
                        alt={getOwnerDisplayName(visiblePublicBox.owner)}
                      />
                    ) : null}
                    <AvatarFallback className="text-[11px] font-semibold">
                      {getOwnerInitials(visiblePublicBox.owner)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
                    {getOwnerDisplayName(visiblePublicBox.owner)}
                  </span>
                </div>

                <p className="mt-4 text-sm text-text-secondary">
                  {buildPublicTextBoxSummaryLabel(visiblePublicBox)}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full px-5"
                disabled={isImportingPublicBox || !telegramId}
                onClick={() => void handleImportPublicBox()}
              >
                {isImportingPublicBox ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Добавить себе
              </Button>
            </div>
          </TextSurfaceCard>
        ) : null}
      </div>

      <div>
        {isLoadingSelectedPublicBox ? (
          <div className="flex h-full items-center justify-center text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : selectedPublicBoxError ? (
          <TextSurfaceCard className="p-4 text-sm text-text-secondary">
            {selectedPublicBoxError}
          </TextSurfaceCard>
        ) : sortedPublicBoxVerses.length === 0 ? (
          <TextSurfaceCard className="p-5 text-sm text-text-secondary">
            Коробка пуста
          </TextSurfaceCard>
        ) : (
          <div className="space-y-3 pb-4">
            {sortedPublicBoxVerses.map((verse) => (
              <TextVerseCard
                key={verse.externalVerseId}
                verse={verse}
                textClassName="line-clamp-4"
                tags={verse.tags}
                onTagsPress={() => handleOpenBoxVerseTagsDrawer(verse)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-4 sm:px-6",
          !selectedBoxId && !selectedPublicBoxId && activeTab === "boxes",
        )}
      >
        {!selectedBoxId && !selectedPublicBoxId ? (
          <div className="mb-2 mt-4 shrink-0">
            <WorkspaceTabs
              activeTab={activeTab}
              onChange={handleWorkspaceTabChange}
            />
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1">
          {selectedBoxId ? (
            renderBoxDetail()
          ) : selectedPublicBoxId ? (
            renderPublicBoxDetail()
          ) : activeTab === "catalog" ? (
            <BibleCatalogView
              telegramId={telegramId}
              boxes={boxes}
              onCreateBox={createBox}
              onRefreshBoxes={refreshBoxes}
              onVerseMutationCommitted={onVerseMutationCommitted}
              requestedTagSlug={pendingCatalogTagSlug}
              onRequestedTagSlugHandled={handlePendingCatalogTagHandled}
            />
          ) : (
            renderBoxesList()
          )}
        </div>
      </div>

      <TextBoxEditorDrawer
        state={editorState}
        titleValue={editorTitle}
        isSubmitting={isEditorSubmitting}
        onTitleChange={setEditorTitle}
        onSubmit={() => void handleSaveBox()}
        onOpenChange={handleEditorOpenChange}
      />

      <BoxSettingsDrawer
        box={settingsBox}
        isDeleting={isDeletingBox}
        isUpdatingVisibility={isUpdatingBoxVisibility}
        onOpenChange={handleSettingsOpenChange}
        onRename={() => settingsBox && openRenameDrawer(settingsBox)}
        onDelete={() => void handleDeleteBox()}
        onVisibilityChange={(visibility) =>
          void handleUpdateBoxVisibility(visibility)
        }
      />

      <LearningReplacementDrawer
        open={replacementState !== null}
        currentVerse={replacementState?.pauseVerse ?? null}
        sections={replacementSections}
        submittingVerseId={replacementSubmittingId}
        onSelect={(verse) => void handleReplaceLearningVerse(verse)}
        onOpenChange={handleReplacementDrawerOpenChange}
      />

      <VerseDeleteDrawer
        open={removeVerseTarget !== null}
        isActionPending={
          removeVerseTarget !== null &&
          busyVerseId === removeVerseTarget.externalVerseId
        }
        onOpenChange={(open) => {
          if (!open) setRemoveVerseTarget(null);
        }}
        onConfirm={() => {
          if (removeVerseTarget) {
            void handleRemoveVerse(removeVerseTarget).then(() =>
              setRemoveVerseTarget(null),
            );
          }
        }}
      />

      {galleryState ? (
        <VerseGallery
          verses={sortedBoxVerses}
          initialIndex={galleryInitialIndex}
          sourceMode="my"
          onClose={handleGalleryClose}
          onStatusChange={handleGalleryStatusChange}
          onDelete={handleGalleryDelete}
          onSelectTag={handleOpenCatalogForTag}
          onNavigateToTraining={handleGalleryNavigateToTraining}
          previewTotalCount={sortedBoxVerses.length}
          previewHasMore={false}
          previewIsLoadingMore={false}
          showDeleteAction={false}
          onReplaceRequest={
            hasReplacementCandidates ? handleOpenReplacementDrawer : undefined
          }
        />
      ) : null}

      <VerseTagsDrawer
        target={boxTagDrawerTarget}
        open={boxTagDrawerTarget !== null}
        selectedTagSlugs={new Set()}
        onOpenChange={handleBoxTagDrawerOpenChange}
        onSelectTag={handleOpenCatalogForTag}
      />
    </>
  );
}
