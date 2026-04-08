"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { addVerseToTextBox } from "@/api/services/textBoxes";
import { Button } from "@/app/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/app/components/ui/utils";
import { toast } from "@/app/lib/toast";
import { getAllBibleBooks } from "@/app/types/bible";
import type { TextBoxSummary } from "@/app/types/textBox";
import { useBibleChapterCatalog } from "@/app/hooks/texts/useBibleChapterCatalog";
import { TextSurfaceCard, formatRussianCount } from "./TextCards";

type BibleCatalogViewProps = {
  telegramId: string | null;
  boxes: TextBoxSummary[];
  onRefreshBoxes: () => Promise<unknown>;
  onVerseMutationCommitted?: () => void;
};

async function addVersesBatch(params: {
  telegramId: string;
  boxId: string;
  externalVerseIds: string[];
}) {
  const verseIds = Array.from(new Set(params.externalVerseIds));
  const results: Array<{ addedCount: number; skippedCount: number }> = [];

  for (const externalVerseId of verseIds) {
    const result = await addVerseToTextBox(params.telegramId, params.boxId, { externalVerseId });
    results.push(result);
  }

  return results.reduce(
    (accumulator, current) => ({
      addedCount: accumulator.addedCount + (current.addedCount ?? 0),
      skippedCount: accumulator.skippedCount + (current.skippedCount ?? 0),
    }),
    { addedCount: 0, skippedCount: 0 },
  );
}

export function BibleCatalogView({
  telegramId,
  boxes,
  onRefreshBoxes,
  onVerseMutationCommitted,
}: BibleCatalogViewProps) {
  const books = useMemo(() => getAllBibleBooks(), []);
  const {
    bookId,
    chapter,
    chapterCount,
    chapterTitle,
    verses,
    isLoading,
    error,
    setBookId,
    setChapter,
    goToPrevChapter,
    goToNextChapter,
  } = useBibleChapterCatalog();

  const [selectedVerseIds, setSelectedVerseIds] = useState<string[]>([]);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [busyBoxId, setBusyBoxId] = useState<string | null>(null);

  const chapterOptions = useMemo(
    () => Array.from({ length: chapterCount }, (_, index) => String(index + 1)),
    [chapterCount],
  );

  const selectedIdSet = useMemo(() => new Set(selectedVerseIds), [selectedVerseIds]);
  const selectedVerses = useMemo(
    () => verses.filter((verse) => selectedIdSet.has(verse.externalVerseId)),
    [selectedIdSet, verses],
  );
  const selectedCount = selectedVerses.length;
  const selectedCountLabel = formatRussianCount(selectedCount, ["стих", "стиха", "стихов"]);

  useEffect(() => {
    setSelectedVerseIds([]);
    setIsAddDrawerOpen(false);
  }, [bookId, chapter]);

  const toggleVerse = useCallback((externalVerseId: string) => {
    setSelectedVerseIds((current) => (
      current.includes(externalVerseId)
        ? current.filter((id) => id !== externalVerseId)
        : [...current, externalVerseId]
    ));
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedVerseIds((current) => (
      current.length === verses.length ? [] : verses.map((verse) => verse.externalVerseId)
    ));
  }, [verses]);

  const handleAddSelectionToBox = useCallback(
    async (boxId: string) => {
      if (!telegramId || selectedVerses.length === 0) return;

      setBusyBoxId(boxId);
      try {
        const result = await addVersesBatch({
          telegramId,
          boxId,
          externalVerseIds: selectedVerses.map((verse) => verse.externalVerseId),
        });
        const targetBox = boxes.find((box) => box.id === boxId);
        const title = targetBox?.title ?? "Коробка";

        if (result.addedCount > 0) {
          toast.success("Стихи добавлены", {
            description: `${formatRussianCount(result.addedCount, ["стих", "стиха", "стихов"])} · ${title}`,
            label: "Тексты",
          });
        } else {
          toast.info("Стихи уже в коробке", {
            description: title,
            label: "Тексты",
          });
        }

        setSelectedVerseIds([]);
        setIsAddDrawerOpen(false);
        await onRefreshBoxes();
        onVerseMutationCommitted?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось добавить стихи в коробку", {
          label: "Тексты",
        });
      } finally {
        setBusyBoxId(null);
      }
    },
    [boxes, onRefreshBoxes, onVerseMutationCommitted, selectedVerses, telegramId],
  );

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <TextSurfaceCard className="shrink-0 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.7fr)_minmax(0,0.95fr)]">
            <Select value={String(bookId)} onValueChange={(value) => setBookId(Number(value))}>
              <SelectTrigger className="h-11 rounded-[1.15rem] border-border-subtle bg-bg-surface">
                <SelectValue placeholder="Книга" />
              </SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={book.id} value={String(book.id)}>
                    {book.nameRu}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-[1.15rem]"
                onClick={goToPrevChapter}
                disabled={isLoading || chapter <= 1}
                aria-label="Предыдущая глава"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Select value={String(chapter)} onValueChange={(value) => setChapter(Number(value))}>
                <SelectTrigger className="h-11 rounded-[1.15rem] border-border-subtle bg-bg-surface">
                  <SelectValue placeholder="Глава" />
                </SelectTrigger>
                <SelectContent>
                  {chapterOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      Глава {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-[1.15rem]"
                onClick={goToNextChapter}
                disabled={isLoading || chapter >= chapterCount}
                aria-label="Следующая глава"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="mt-2 truncate [font-family:var(--font-heading)] text-[1.55rem] font-semibold tracking-tight text-text-primary sm:text-[1.8rem]">
                {chapterTitle}
              </h2>
            </div>
            <div className="rounded-full border border-border-subtle bg-bg-surface/80 px-3 py-1.5 text-xs font-medium text-text-secondary shadow-[var(--shadow-soft)]">
              {chapter} / {chapterCount}
            </div>
          </div> */}
        </TextSurfaceCard>

        <div className="mt-4 min-h-0 flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <TextSurfaceCard className="p-4 text-sm text-text-secondary">{error}</TextSurfaceCard>
          ) : verses.length === 0 ? (
            <TextSurfaceCard className="p-5 text-sm text-text-secondary">Глава пуста</TextSurfaceCard>
          ) : (
            <TextSurfaceCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/70 px-5 py-4">
                <div className="min-w-0">
                  <p className="mt-1 text-sm text-text-secondary">
                    {selectedCount > 0
                      ? `${selectedCountLabel} выбрано`
                      : formatRussianCount(verses.length, ["стих", "стиха", "стихов"])}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3"
                    onClick={handleToggleAll}
                  >
                    {selectedCount === verses.length ? "Снять" : "Все"}
                  </Button>

                  {selectedCount > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full px-3"
                      onClick={() => setSelectedVerseIds([])}
                    >
                      Сбросить
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full px-4 shadow-[var(--shadow-soft)]"
                    disabled={selectedCount === 0 || boxes.length === 0 || !telegramId}
                    onClick={() => setIsAddDrawerOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    В коробку
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
                <div className="divide-y divide-border-subtle/60">
                {verses.map((verse) => {
                  const isSelected = selectedIdSet.has(verse.externalVerseId);
                  return (
                    <button
                      key={verse.externalVerseId}
                      type="button"
                      onClick={() => toggleVerse(verse.externalVerseId)}
                      aria-pressed={isSelected}
                      className={cn(
                        "group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors",
                        isSelected
                          ? "bg-brand-primary/10"
                          : "bg-transparent hover:bg-bg-surface/70",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold shadow-[var(--shadow-soft)] transition-colors",
                          isSelected
                            ? "border-brand-primary/35 bg-brand-primary/15 text-brand-primary"
                            : "border-border-subtle bg-bg-surface/80 text-text-muted",
                        )}
                      >
                        {verse.verse}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={cn(
                              "text-[1rem] leading-8 sm:text-[1.05rem]",
                              isSelected ? "text-text-primary" : "text-text-secondary",
                            )}
                          >
                            {verse.text}
                          </p>

                          <span
                            className={cn(
                              "mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all",
                              isSelected
                                ? "border-brand-primary/35 bg-brand-primary text-[color:#241b14]"
                                : "border-transparent bg-transparent text-transparent",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
              </div>
            </TextSurfaceCard>
          )}
        </div>
      </div>

      <Drawer open={isAddDrawerOpen} onOpenChange={setIsAddDrawerOpen}>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Добавить в коробку</DrawerTitle>
          </DrawerHeader>

          <div className="pb-3 text-sm text-text-secondary">
            {chapterTitle} · {selectedCountLabel}
          </div>

          <div className="space-y-2 pb-2">
            {boxes.map((box) => (
              <button
                key={box.id}
                type="button"
                onClick={() => void handleAddSelectionToBox(box.id)}
                disabled={busyBoxId !== null}
                className={cn(
                  "flex w-full items-center justify-between rounded-[1.5rem] border border-border-default/55 bg-bg-elevated px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-bg-surface",
                  busyBoxId !== null && "pointer-events-none opacity-60",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{box.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {box.stats.totalCount} стихов
                    {box.isDefault ? " · основная" : ""}
                  </p>
                </div>
                {busyBoxId === box.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                ) : (
                  <Plus className="h-4 w-4 text-text-muted" />
                )}
              </button>
            ))}
          </div>

          <DrawerFooter className="px-0">
            <Button type="button" variant="ghost" onClick={() => setIsAddDrawerOpen(false)}>
              Закрыть
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
