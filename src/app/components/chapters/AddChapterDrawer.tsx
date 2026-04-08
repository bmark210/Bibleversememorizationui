'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';
import { getBibleBookNameRu } from '@/app/types/bible';
import { getHelloaoChapter } from '@/app/services/helloaoBibleApi';
import { UserVersesService } from '@/api/services/UserVersesService';
import { toast } from '@/app/lib/toast';

type AddChapterDrawerProps = {
  bookId: number;
  chapterNo: number;
  telegramId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

type DrawerState =
  | { phase: 'loading' }
  | { phase: 'confirm'; verseCount: number }
  | { phase: 'adding'; added: number; total: number }
  | { phase: 'done'; added: number; total: number }
  | { phase: 'error'; message: string };

export function AddChapterDrawer({
  bookId,
  chapterNo,
  telegramId,
  open,
  onClose,
  onDone,
}: AddChapterDrawerProps) {
  const [state, setState] = useState<DrawerState>({ phase: 'loading' });
  const [verseNumbers, setVerseNumbers] = useState<number[]>([]);

  const bookName = getBibleBookNameRu(bookId);

  // Load chapter verse list when drawer opens
  useEffect(() => {
    if (!open) return;
    setState({ phase: 'loading' });

    getHelloaoChapter({ book: bookId as never, chapter: chapterNo })
      .then((verses) => {
        const nums = verses
          .map((v) => Number(v.verse))
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => a - b);
        setVerseNumbers(nums);
        setState({ phase: 'confirm', verseCount: nums.length });
      })
      .catch((err) => {
        setState({
          phase: 'error',
          message: err instanceof Error ? err.message : 'Не удалось загрузить стихи',
        });
      });
  }, [open, bookId, chapterNo]);

  const handleAdd = async () => {
    if (verseNumbers.length === 0) return;
    const total = verseNumbers.length;
    setState({ phase: 'adding', added: 0, total });

    let added = 0;
    const BATCH = 3;

    for (let i = 0; i < verseNumbers.length; i += BATCH) {
      const batch = verseNumbers.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (verseNum) => {
          const externalVerseId = `${bookId}-${chapterNo}-${verseNum}`;
          try {
            await UserVersesService.upsertUserVerse(telegramId, {
              externalVerseId,
            });
          } catch {
            // Ignore individual failures (e.g. already exists)
          }
        }),
      );
      added += batch.length;
      setState({ phase: 'adding', added, total });
    }

    setState({ phase: 'done', added, total });
    toast.success(`Добавлено ${added} стихов из главы ${chapterNo}`);
  };

  const handleClose = () => {
    if (state.phase === 'done') {
      onDone();
    }
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleClose()}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="pb-0">
          <DrawerTitle>
            {bookName} — глава {chapterNo}
          </DrawerTitle>
          <DrawerDescription>
            {state.phase === 'loading' && 'Загружаем стихи...'}
            {state.phase === 'confirm' &&
              `${state.verseCount} стихов будут добавлены в вашу коллекцию`}
            {state.phase === 'adding' &&
              `Добавление: ${state.added} из ${state.total}`}
            {state.phase === 'done' &&
              `Готово! Добавлено ${state.added} стихов`}
            {state.phase === 'error' && state.message}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 p-4 pt-2">
          {/* Progress bar */}
          {(state.phase === 'adding' || state.phase === 'done') && (
            <div className="overflow-hidden rounded-full bg-foreground/[0.07]">
              <div
                className="h-2 rounded-full bg-brand-primary transition-all duration-300"
                style={{
                  width: `${
                    state.phase === 'done'
                      ? 100
                      : Math.round((state.added / state.total) * 100)
                  }%`,
                }}
              />
            </div>
          )}

          {/* Action buttons */}
          {state.phase === 'loading' && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {state.phase === 'confirm' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl"
                onClick={handleClose}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 rounded-2xl bg-brand-primary text-white"
                onClick={handleAdd}
              >
                Добавить {state.verseCount} стихов
              </Button>
            </div>
          )}

          {state.phase === 'adding' && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                Добавлено {state.added} из {state.total}...
              </span>
            </div>
          )}

          {state.phase === 'done' && (
            <Button
              className="w-full rounded-2xl bg-brand-primary text-white"
              onClick={handleClose}
            >
              Готово
            </Button>
          )}

          {state.phase === 'error' && (
            <Button
              variant="outline"
              className="w-full rounded-2xl"
              onClick={handleClose}
            >
              Закрыть
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
