import { useCallback, useState } from 'react';
import { toast } from 'sonner';
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
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
    if (prevStatus === VerseStatus.NEW && nextStatus === VerseStatus.LEARNING) {
      return 'Добавлено в изучение';
    }
    if (prevStatus === VerseStatus.STOPPED && nextStatus === VerseStatus.LEARNING) {
      return 'Возобновлено';
    }
    if (
      (
        prevStatus === VerseStatus.LEARNING ||
        prevStatus === 'WAITING' ||
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

  const handleStatusChange = useCallback(
    async (verse: Verse, status: VerseStatus) => {
      const patch = await patchVerseStatusOnServer(verse, status);
      applyVersePatch(
        { target: { id: verse.id, externalVerseId: verse.externalVerseId }, patch },
        { statusFilter, matchesListFilter }
      );
      onVerseMutationCommitted?.();
      return patch;
    },
    [
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
      await UserVersesService.deleteApiUsersVerses(telegramId, verse.externalVerseId);
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
      onVerseMutationCommitted?.();
    },
    [telegramId, setVerses, isSameVerse, setTotalCount, setGalleryIndex, onVerseMutationCommitted]
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

    setDeleteSubmitting(true);
    markVersePending(deleteTargetVerse, true);

    try {
      await handleDeleteVerse(deleteTargetVerse);
      haptic('success');
      pushToast('Удалено', 'success');
      setAnnouncement(`${deleteTargetVerse.reference}: Удалено`);
      setDeleteTargetVerse(null);
    } catch (err) {
      console.error('Не удалось удалить стих:', err);
      haptic('error');
      pushToast('Ошибка — попробуйте ещё раз', 'error');
    } finally {
      markVersePending(deleteTargetVerse, false);
      setDeleteSubmitting(false);
    }
  }, [
    deleteTargetVerse,
    telegramId,
    pushToast,
    markVersePending,
    handleDeleteVerse,
    setAnnouncement,
  ]);

  return {
    pendingVerseKeys,
    deleteTargetVerse,
    setDeleteTargetVerse,
    deleteSubmitting,
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
