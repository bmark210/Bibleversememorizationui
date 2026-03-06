import { useCallback, useState } from 'react';
import { toast } from '@/app/lib/toast';
import { UserVersesService } from '@/api/services/UserVersesService';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import type { VerseMutablePatch, VersePatchEvent } from '@/app/types/verseSync';
import { pickMutableVersePatchFromApiResponse } from '@/app/utils/versePatch';
import type { VerseListStatusFilter } from '../constants';
import { haptic } from '../haptics';

type UseVerseActionsParams = {
  telegramId?: string;
  statusFilter: VerseListStatusFilter;
  matchesListFilter: (
    verse: Pick<Verse, 'status' | 'masteryLevel'>,
    filter: VerseListStatusFilter
  ) => boolean;
  resetAndFetchFirstPage: (telegramId: string, filter: VerseListStatusFilter) => Promise<void>;
  setVerses: React.Dispatch<React.SetStateAction<Array<Verse>>>;
  setTotalCount: React.Dispatch<React.SetStateAction<number>>;
  setGalleryIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setAnnouncement: React.Dispatch<React.SetStateAction<string>>;
  applyVersePatch: (
    event: VersePatchEvent,
    options: {
      statusFilter: VerseListStatusFilter;
      matchesListFilter: (
        verse: Pick<Verse, 'status' | 'masteryLevel'>,
        filter: VerseListStatusFilter
      ) => boolean;
      adjustTotalCountOnFilterExit?: boolean;
    }
  ) => { didPatch: boolean; removedFromCurrentFilter: boolean };
  onVerseMutationCommitted?: () => void;
};

function getErrorStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const maybeStatus =
    'status' in error
      ? error.status
      : 'statusCode' in error
        ? error.statusCode
        : null;

  if (typeof maybeStatus === 'number' && Number.isFinite(maybeStatus)) {
    return maybeStatus;
  }

  const parsedStatus = Number(maybeStatus);
  return Number.isFinite(parsedStatus) ? parsedStatus : null;
}

export function useVerseActions({
  telegramId,
  statusFilter,
  matchesListFilter,
  resetAndFetchFirstPage,
  setVerses,
  setTotalCount,
  setGalleryIndex,
  setAnnouncement,
  applyVersePatch,
  onVerseMutationCommitted,
}: UseVerseActionsParams) {
  const [pendingVerseKeys, setPendingVerseKeys] = useState<Set<string>>(() => new Set());
  const [deleteTargetVerse, setDeleteTargetVerse] = useState<Verse | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const pushToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    if (type === 'success') {
      toast.success(message);
      return;
    }
    if (type === 'error') {
      toast.error(message);
      return;
    }
    toast.info(message);
  }, []);

  const getVerseKey = useCallback((verse: Pick<Verse, 'id' | 'externalVerseId'>) => {
    return String(verse.externalVerseId ?? verse.id);
  }, []);

  const isSameVerse = useCallback(
    (a: Pick<Verse, 'id' | 'externalVerseId'>, b: Pick<Verse, 'id' | 'externalVerseId'>) =>
      getVerseKey(a) === getVerseKey(b),
    [getVerseKey]
  );

  const markVersePending = useCallback(
    (verse: Pick<Verse, 'id' | 'externalVerseId'>, pending: boolean) => {
      const key = getVerseKey(verse);
      setPendingVerseKeys((prev) => {
        const next = new Set(prev);
        if (pending) next.add(key);
        else next.delete(key);
        return next;
      });
    },
    [getVerseKey]
  );

  const getStatusSuccessMessage = (prevStatusInput: Verse['status'], nextStatus: VerseStatus) => {
    const prevStatus = normalizeDisplayVerseStatus(prevStatusInput);
    if (prevStatus === VerseStatus.MY && nextStatus === VerseStatus.LEARNING) {
      return 'Добавлено в изучение';
    }
    if (prevStatus === VerseStatus.STOPPED && nextStatus === VerseStatus.LEARNING) {
      return 'Возобновлено';
    }
    if (
      (
        prevStatus === VerseStatus.LEARNING ||
        prevStatus === 'REVIEW' ||
        prevStatus === 'MASTERED'
      ) &&
      nextStatus === VerseStatus.STOPPED
    ) {
      return 'Пауза включена';
    }
    return 'Статус обновлён';
  };

  const patchVerseStatusOnServer = useCallback(
    async (verse: Verse, status: VerseStatus): Promise<VerseMutablePatch> => {
      if (!telegramId) throw new Error('No telegramId');
      const response = await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, { status });
      const patch = pickMutableVersePatchFromApiResponse(response);
      return patch ?? { status };
    },
    [telegramId]
  );

  // PUT /api/users/:id/verses/:externalVerseId — создаёт UserVerse (статус MY) если ещё нет.
  const addVerseToCollection = useCallback(
    async (externalVerseId: string): Promise<void> => {
      if (!telegramId) throw new Error('No telegramId');
      const response = await fetch(
        `/api/users/${encodeURIComponent(telegramId)}/verses/${encodeURIComponent(externalVerseId)}`,
        { method: 'PUT' }
      );
      if (!response.ok) {
        throw new Error(`Failed to add verse to collection: ${response.status}`);
      }
    },
    [telegramId]
  );

  const handleStatusChange = useCallback(
    async (verse: Verse, status: VerseStatus) => {
      // CATALOG-стих не имеет UserVerse — создаём перед изменением статуса
      if (normalizeDisplayVerseStatus(verse.status) === 'CATALOG') {
        await addVerseToCollection(verse.externalVerseId);
      }
      const patch = await patchVerseStatusOnServer(verse, status);
      applyVersePatch(
        { target: { id: verse.id, externalVerseId: verse.externalVerseId }, patch },
        { statusFilter, matchesListFilter }
      );
      onVerseMutationCommitted?.();
      return patch;
    },
    [
      addVerseToCollection,
      applyVersePatch,
      matchesListFilter,
      onVerseMutationCommitted,
      patchVerseStatusOnServer,
      statusFilter,
    ]
  );

  const updateVerseStatus = useCallback(
    async (verse: Verse, nextStatus: VerseStatus) => {
      if (!telegramId) {
        haptic('error');
        pushToast('Ошибка — попробуйте ещё раз', 'error');
        return;
      }

      const prevStatus = verse.status;
      if (prevStatus === nextStatus) return;

      markVersePending(verse, true);
      try {
        // CATALOG-стих не имеет UserVerse — создаём перед изменением статуса
        if (normalizeDisplayVerseStatus(verse.status) === 'CATALOG') {
          await addVerseToCollection(verse.externalVerseId);
        }
        const patch = await patchVerseStatusOnServer(verse, nextStatus);
        applyVersePatch(
          { target: { id: verse.id, externalVerseId: verse.externalVerseId }, patch },
          { statusFilter, matchesListFilter }
        );
        onVerseMutationCommitted?.();
        haptic('success');
        const message = getStatusSuccessMessage(prevStatus, nextStatus);
        pushToast(message, 'success');
        setAnnouncement(`${verse.reference}: ${message}`);
      } catch (err) {
        console.error('Не удалось изменить статус стиха:', err);
        if (telegramId) {
          void resetAndFetchFirstPage(telegramId, statusFilter);
        }
        haptic('error');
        pushToast('Ошибка — попробуйте ещё раз', 'error');
      } finally {
        markVersePending(verse, false);
      }
    },
    [
      telegramId,
      pushToast,
      markVersePending,
      setVerses,
      isSameVerse,
      matchesListFilter,
      statusFilter,
      setTotalCount,
      addVerseToCollection,
      patchVerseStatusOnServer,
      setAnnouncement,
      resetAndFetchFirstPage,
      applyVersePatch,
    ]
  );

  const applyVersePatchedFromGallery = useCallback(
    (event: VersePatchEvent) => {
      applyVersePatch(event, { statusFilter, matchesListFilter });
      onVerseMutationCommitted?.();
    },
    [applyVersePatch, matchesListFilter, onVerseMutationCommitted, statusFilter]
  );

  const handleDeleteVerse = useCallback(
    async (verse: Verse) => {
      if (!telegramId) return;
      try {
        await UserVersesService.deleteApiUsersVerses(telegramId, verse.externalVerseId);
      } catch (err: unknown) {
        // 404 = стих не был добавлен пользователем (каталог) — просто убираем из UI
        const statusCode = getErrorStatusCode(err);
        if (statusCode !== 404) throw err;
      }
      if (statusFilter === 'catalog') {
        // В фильтре "catalog" карточка остаётся видимой — сбрасываем статус в CATALOG, очищаем прогресс
        setVerses((prev) =>
          prev.map((v) =>
            isSameVerse(v, verse)
              ? { ...v, status: 'CATALOG' as const, masteryLevel: 0, repetitions: 0, lastReviewedAt: null, nextReviewAt: null }
              : v
          )
        );
      } else {
        setVerses((prev) => {
          const hadVerse = prev.some((v) => isSameVerse(v, verse));
          const updated = prev.filter((v) => !isSameVerse(v, verse));
          if (hadVerse) {
            setTotalCount((count) => Math.max(0, count - 1));
          }
          setGalleryIndex((cur) => {
            if (updated.length === 0 || cur === null) return null;
            return cur >= updated.length ? updated.length - 1 : cur;
          });
          return updated;
        });
      }
      onVerseMutationCommitted?.();
    },
    [statusFilter, telegramId, setVerses, isSameVerse, setTotalCount, setGalleryIndex, onVerseMutationCommitted]
  );

  const confirmDeleteVerse = useCallback((verse: Verse) => {
    haptic('warning');
    setDeleteTargetVerse(verse);
  }, []);

  const handleConfirmDeleteVerse = useCallback(async () => {
    if (!deleteTargetVerse) return;
    if (!telegramId) {
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
      return;
    }

    setIsDeleteSubmitting(true);
    markVersePending(deleteTargetVerse, true);

    try {
      await handleDeleteVerse(deleteTargetVerse);
      haptic('success');
      const deleteMessage = statusFilter === 'catalog' ? 'Сброшено в каталог' : 'Удалено';
      pushToast(deleteMessage, 'success');
      setAnnouncement(`${deleteTargetVerse.reference}: ${deleteMessage}`);
      setDeleteTargetVerse(null);
    } catch (err) {
      console.error('Не удалось удалить стих:', err);
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
    } finally {
      markVersePending(deleteTargetVerse, false);
      setIsDeleteSubmitting(false);
    }
  }, [
    deleteTargetVerse,
    telegramId,
    statusFilter,
    pushToast,
    markVersePending,
    handleDeleteVerse,
    setAnnouncement,
  ]);

  return {
    pendingVerseKeys,
    deleteTargetVerse,
    setDeleteTargetVerse,
    isDeleteSubmitting,
    getVerseKey,
    isSameVerse,
    markVersePending,
    handleStatusChange,
    applyVersePatchedFromGallery,
    updateVerseStatus,
    handleDeleteVerse,
    confirmDeleteVerse,
    handleConfirmDeleteVerse,
  };
}
