import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { UserVersesService } from '@/api/services/UserVersesService';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
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
    async (verse: Verse, status: VerseStatus) => {
      if (!telegramId) throw new Error('No telegramId');
      await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, { status });
    },
    [telegramId]
  );

  const handleStatusChange = useCallback(
    async (verse: Verse, status: VerseStatus) => {
      await patchVerseStatusOnServer(verse, status);
      let removedFromCurrentFilter = false;
      setVerses((prev) =>
        prev
          .map((v) => {
            if (!isSameVerse(v, verse)) return v;
            return { ...v, status };
          })
          .filter((v) => {
            const keep = matchesListFilter(v, statusFilter);
            if (!keep && isSameVerse(v, verse)) removedFromCurrentFilter = true;
            return keep;
          })
      );
      if (removedFromCurrentFilter) {
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    },
    [isSameVerse, matchesListFilter, patchVerseStatusOnServer, setTotalCount, setVerses, statusFilter]
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
      let removedFromCurrentFilter = false;
      setVerses((prev) => {
        const next = prev
          .map((v) => (isSameVerse(v, verse) ? { ...v, status: nextStatus } : v))
          .filter((v) => {
            const keep = matchesListFilter(v, statusFilter);
            if (!keep && isSameVerse(v, verse)) removedFromCurrentFilter = true;
            return keep;
          });
        return next;
      });

      if (removedFromCurrentFilter) {
        setTotalCount((prev) => Math.max(0, prev - 1));
      }

      try {
        await patchVerseStatusOnServer(verse, nextStatus);
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
    ]
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
    },
    [telegramId, setVerses, isSameVerse, setTotalCount, setGalleryIndex]
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
    updateVerseStatus,
    handleDeleteVerse,
    confirmDeleteVerse,
    handleConfirmDeleteVerse,
  };
}
