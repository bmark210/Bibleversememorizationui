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
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  patchVerseStatus,
  removeTextFromBox,
  replaceLearningVerseInTextBox,
} from "@/api/services/textBoxes";
import { Button } from "@/app/components/ui/button";
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
import { useTextBoxes } from "@/app/hooks/texts/useTextBoxes";
import { useTextBoxVerses } from "@/app/hooks/texts/useTextBoxVerses";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import type {
  TextBoxSummary,
  TextWorkspaceTab,
  TrainingBoxScope,
} from "@/app/types/textBox";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { toast } from "@/app/lib/toast";
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
        { id: "catalog" as const, label: "Библия" },
        { id: "boxes" as const, label: "Мои тексты" },
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
  onOpenChange,
  onRename,
  onDelete,
}: {
  box: TextBoxSummary | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <Drawer open={box !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4">
        <DrawerHeader className="px-0">
          <DrawerTitle>{box?.title ?? "Коробка"}</DrawerTitle>
        </DrawerHeader>

        <div className="space-y-2 pb-2">
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
            disabled={!box || isDeleting}
            onClick={onDelete}
            className={cn(
              "flex w-full items-center justify-between rounded-[1.5rem] border border-state-error/20 bg-state-error/5 px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-state-error/10",
              (!box || isDeleting) && "pointer-events-none opacity-50",
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
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<BoxEditorState>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [isEditorSubmitting, setIsEditorSubmitting] = useState(false);
  const [settingsBox, setSettingsBox] = useState<TextBoxSummary | null>(null);
  const [isDeletingBox, setIsDeletingBox] = useState(false);
  const [busyVerseId, setBusyVerseId] = useState<string | null>(null);
  const [galleryState, setGalleryState] = useState<GalleryState>(null);
  const [replacementState, setReplacementState] =
    useState<LearningReplacementState>(null);
  const [replacementSubmittingId, setReplacementSubmittingId] = useState<
    string | null
  >(null);

  const {
    boxes,
    isLoading: isLoadingBoxes,
    error: boxesError,
    refresh: refreshBoxes,
    create: createBox,
    rename: renameBox,
    remove: removeBox,
  } = useTextBoxes(telegramId);

  const selectedBox = useMemo(
    () => boxes.find((box) => box.id === selectedBoxId) ?? null,
    [boxes, selectedBoxId],
  );

  const {
    verses: selectedBoxItems,
    box: selectedBoxFromApi,
    isLoading: isLoadingSelectedBox,
    error: selectedBoxError,
    refresh: refreshSelectedBox,
  } = useTextBoxVerses(telegramId, selectedBoxId);

  const visibleBox = selectedBox ?? selectedBoxFromApi ?? null;
  const visibleBoxTitle = visibleBox?.title ?? reopenTextBoxTitle ?? "Коробка";
  const sortedBoxVerses = useMemo(
    () => sortVersesCanonically(selectedBoxItems.map((item) => item.verse)),
    [selectedBoxItems],
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
      selectedBoxId ? refreshSelectedBox() : Promise.resolve(null),
    ]);
  }, [
    refreshBoxes,
    refreshSelectedBox,
    selectedBoxId,
    verseListExternalSyncVersion,
  ]);

  useTelegramBackButton({
    enabled: Boolean(selectedBoxId),
    onBack: () => setSelectedBoxId(null),
    priority: 50,
  });

  const openCreateDrawer = useCallback(() => {
    setEditorTitle("");
    setEditorState({ mode: "create" });
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
        setSelectedBoxId(created.id);
        toast.success("Коробка создана", {
          description: created.title,
          label: "Тексты",
        });
      } else {
        const updated = await renameBox(editorState.box.id, nextTitle);
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
  }, [createBox, editorState, editorTitle, renameBox, telegramId]);

  const handleSettingsOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSettingsBox(null);
    }
  }, []);

  const handleDeleteBox = useCallback(async () => {
    if (!settingsBox) return;
    setIsDeletingBox(true);
    try {
      const boxId = settingsBox.id;
      const title = settingsBox.title;
      await removeBox(boxId);
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
  }, [removeBox, selectedBoxId, settingsBox]);

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
        await Promise.allSettled([refreshSelectedBox(), refreshBoxes()]);
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
        await Promise.allSettled([refreshSelectedBox(), refreshBoxes()]);
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
        await Promise.allSettled([refreshSelectedBox(), refreshBoxes()]);
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

  const handleGalleryStatusChange = useCallback(
    async (verse: Verse, status: VerseStatus) => {
      if (!telegramId || !galleryState) return;
      await patchVerseStatus(
        telegramId,
        verse.externalVerseId,
        status as "LEARNING" | "STOPPED" | "QUEUE",
      );
      await Promise.allSettled([refreshSelectedBox(), refreshBoxes()]);
      onVerseMutationCommitted?.();
    },
    [
      galleryState,
      onVerseMutationCommitted,
      refreshBoxes,
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
      await Promise.allSettled([refreshSelectedBox(), refreshBoxes()]);
      onVerseMutationCommitted?.();
    },
    [
      galleryState,
      onVerseMutationCommitted,
      refreshBoxes,
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

  const renderBoxesList = () => (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <h1 className="my-2 [font-family:var(--font-heading)] text-[2rem] font-semibold tracking-tight text-text-primary sm:text-[2.25rem]">
        Настройка коробок
      </h1>
      <div className="mb-4 flex items-center gap-4">
        <p className="text-sm text-text-muted">
          {formatRussianCount(boxes.length, ["коробка", "коробки", "коробок"])}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {isLoadingBoxes ? (
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
          <div className="space-y-3">
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
        )}
      </div>
    </div>
  );

  const renderBoxDetail = () => (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-w-0 py-4">
        <button
          type="button"
          onClick={() => setSelectedBoxId(null)}
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Мои тексты
        </button>

        {visibleBox ? (
          <TextSurfaceCard className="mt-3 min-w-0">
            <div className="flex min-w-0 items-start gap-3">
              <div className="min-w-0 flex-1 overflow-hidden">
                <h2
                  className="block w-full min-w-0 truncate [font-family:var(--font-heading)] text-[1.7rem] font-semibold tracking-tight text-text-primary sm:text-[1.9rem]"
                  title={visibleBoxTitle}
                >
                  {visibleBoxTitle}
                </h2>
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
                <Sparkles className="h-4 w-4" />
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
          <div className="space-y-3">
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
                          onClick={() => void handleRemoveVerse(verse)}
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

  return (
    <>
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-4 sm:px-6",
          !selectedBoxId &&
            activeTab === "boxes" &&
            "pb-[calc(var(--app-bottom-nav-clearance,0px)+5.25rem)]",
        )}
      >
        {!selectedBoxId ? (
          <div className="mb-5 mt-4 shrink-0">
            <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1">
          {selectedBoxId ? (
            renderBoxDetail()
          ) : activeTab === "catalog" ? (
            <BibleCatalogView
              telegramId={telegramId}
              boxes={boxes}
              onRefreshBoxes={refreshBoxes}
              onVerseMutationCommitted={onVerseMutationCommitted}
            />
          ) : (
            renderBoxesList()
          )}
        </div>
      </div>

      {!selectedBoxId && activeTab === "boxes" ? (
        <Button
          type="button"
          className="fixed left-1/2 z-40 h-12 min-w-[13rem] -translate-x-1/2 rounded-full px-7 shadow-[var(--shadow-floating)]"
          style={{
            bottom: "calc(var(--app-bottom-nav-clearance, 0px) + 0.75rem)",
          }}
          onClick={openCreateDrawer}
        >
          <Plus className="h-4 w-4" />
          Новая коробка
        </Button>
      ) : null}

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
        onOpenChange={handleSettingsOpenChange}
        onRename={() => settingsBox && openRenameDrawer(settingsBox)}
        onDelete={() => void handleDeleteBox()}
      />

      <LearningReplacementDrawer
        open={replacementState !== null}
        currentVerse={replacementState?.pauseVerse ?? null}
        sections={replacementSections}
        submittingVerseId={replacementSubmittingId}
        onSelect={(verse) => void handleReplaceLearningVerse(verse)}
        onOpenChange={handleReplacementDrawerOpenChange}
      />

      {galleryState ? (
        <VerseGallery
          verses={sortedBoxVerses}
          initialIndex={galleryInitialIndex}
          sourceMode="my"
          onClose={handleGalleryClose}
          onStatusChange={handleGalleryStatusChange}
          onDelete={handleGalleryDelete}
          onSelectTag={() => undefined}
          onNavigateToTraining={handleGalleryNavigateToTraining}
          previewTotalCount={sortedBoxVerses.length}
          previewHasMore={false}
          previewIsLoadingMore={false}
          showDeleteAction={false}
        />
      ) : null}
    </>
  );
}
