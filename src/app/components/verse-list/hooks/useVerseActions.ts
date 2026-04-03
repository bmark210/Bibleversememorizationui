import { useCallback, useState } from 'react';
import { toast } from '@/app/lib/toast';
import {
  formatToastXpDelta,
  resolveVerseActionToastKind,
  showVerseActionToast,
} from '@/app/lib/semanticToast';
import { UserVersesService } from '@/api/services/UserVersesService';
import { deleteUserVerseWithXp } from '@/api/services/userVerseDelete';
import { Verse } from "@/app/domain/verse";
import { VerseStatus } from '@/shared/domain/verseStatus';
import { normalizeDisplayVerseStatus } from '@/app/types/verseStatus';
import type { VerseMutablePatch, VersePatchEvent } from '@/app/types/verseSync';
import { pickMutableVersePatchFromApiResponse, extractPromotedVerseIds } from '@/app/utils/versePatch';
import { buildVerseDeletionXpFeedback } from '@/app/utils/verseXp';
import type { VerseListStatusFilter } from '../constants';
import { haptic } from '../haptics';

type UseVerseActionsParams = {
  telegramId?: string;
  statusFilter: VerseListStatusFilter;
  matchesListFilter: (
    verse: Pick<Verse, 'status' | 'flow' | 'masteryLevel' | 'repetitions'>,
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
        verse: Pick<Verse, 'status' | 'flow' | 'masteryLevel' | 'repetitions'>,
        filter: VerseListStatusFilter
      ) => boolean;
      adjustTotalCountOnFilterExit?: boolean;
    }
  ) => { didPatch: boolean; removedFromCurrentFilter: boolean };
  onVerseMutationCommitted?: () => void;
  onLearningCapacityExceeded?: (verse: Verse) => void;
  /** Called when a learning slot is freed and queue auto-promotion may have occurred.
   *  promotedIds contains the externalVerseIds of verses moved QUEUE → LEARNING. */
  onSlotFreed?: (promotedIds: string[]) => void;
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
  onLearningCapacityExceeded,
  onSlotFreed,
}: UseVerseActionsParams) {
  const [pendingVerseKeys, setPendingVerseKeys] = useState<Set<string>>(() => new Set());
  const [deleteTargetVerse, setDeleteTargetVerse] = useState<Verse | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

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

  const patchVerseStatusOnServer = useCallback(
    async (verse: Verse, status: VerseStatus): Promise<{ patch: VerseMutablePatch; promotedVerseIds: string[] }> => {
      if (!telegramId) throw new Error('No telegramId');
      const response = await UserVersesService.patchUserVerse(telegramId, verse.externalVerseId, { status });
      const patch = pickMutableVersePatchFromApiResponse(response);
      const promotedVerseIds = extractPromotedVerseIds(response);
      return { patch: patch ?? { status }, promotedVerseIds };
    },
    [telegramId]
  );

  // PUT /api/users/:id/verses/:externalVerseId — создаёт UserVerse (статус MY) если ещё нет.
  const addVerseToCollection = useCallback(
    async (externalVerseId: string): Promise<void> => {
      if (!telegramId) throw new Error('No telegramId');
      await UserVersesService.upsertUserVerse(telegramId, { externalVerseId });
    },
    [telegramId]
  );

  const handleStatusChange = useCallback(
    async (verse: Verse, status: VerseStatus) => {
      // CATALOG-стих не имеет UserVerse — создаём перед изменением статуса
      if (normalizeDisplayVerseStatus(verse.status) === 'CATALOG') {
        await addVerseToCollection(verse.externalVerseId);
      }
      const { patch, promotedVerseIds } = await patchVerseStatusOnServer(verse, status);
      applyVersePatch(
        { target: { id: verse.id, externalVerseId: verse.externalVerseId }, patch },
        { statusFilter, matchesListFilter }
      );
      onVerseMutationCommitted?.();
      if (promotedVerseIds.length > 0) onSlotFreed?.(promotedVerseIds);
      return patch;
    },
    [
      addVerseToCollection,
      applyVersePatch,
      matchesListFilter,
      onVerseMutationCommitted,
      onSlotFreed,
      patchVerseStatusOnServer,
      statusFilter,
    ]
  );

  const updateVerseStatus = useCallback(
    async (verse: Verse, nextStatus: VerseStatus) => {
      if (!telegramId) {
        haptic('error');
        toast.error('Ошибка — попробуйте ещё раз', {
          label: 'Стихи',
        });
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
        const { patch, promotedVerseIds } = await patchVerseStatusOnServer(verse, nextStatus);
        applyVersePatch(
          { target: { id: verse.id, externalVerseId: verse.externalVerseId }, patch },
          { statusFilter, matchesListFilter }
        );
        onVerseMutationCommitted?.();
        haptic('success');
        const toastKind = resolveVerseActionToastKind(prevStatus, nextStatus);
        const message =
          toastKind === 'add-to-my'
            ? 'Добавлено в мои стихи'
            : toastKind === 'start-learning'
              ? 'Добавлено в изучение'
              : toastKind === 'resume'
                ? 'Возобновлено'
                : toastKind === 'pause'
                  ? 'Пауза включена'
                  : 'Статус обновлён';
        if (toastKind) {
          showVerseActionToast({
            kind: toastKind,
            reference: verse.reference,
          });
        } else {
          toast.info(message, {
            description: verse.reference,
            label: 'Стихи',
          });
        }
        if (promotedVerseIds.length > 0) onSlotFreed?.(promotedVerseIds);
        setAnnouncement(`${verse.reference}: ${message}`);
      } catch (err) {
        console.error('Не удалось изменить статус стиха:', err);
        const statusCode = getErrorStatusCode(err);
        if (statusCode === 422) {
          haptic('warning');
          onLearningCapacityExceeded?.(verse);
        } else {
          if (telegramId) {
            void resetAndFetchFirstPage(telegramId, statusFilter);
          }
          haptic('error');
          toast.error('Ошибка — попробуйте ещё раз', {
            label: 'Стихи',
          });
        }
      } finally {
        markVersePending(verse, false);
      }
    },
    [
      telegramId,
      markVersePending,
      matchesListFilter,
      statusFilter,
      addVerseToCollection,
      patchVerseStatusOnServer,
      setAnnouncement,
      resetAndFetchFirstPage,
      applyVersePatch,
      onVerseMutationCommitted,
      onLearningCapacityExceeded,
      onSlotFreed,
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
      let xpLoss = 0;
      let promotedVerseIds: string[] = [];
      try {
        const del = await deleteUserVerseWithXp(telegramId, verse.externalVerseId);
        if (del && del.xpDelta < 0) {
          xpLoss = -del.xpDelta;
        }
        promotedVerseIds = extractPromotedVerseIds(del as unknown);
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
              ? {
                  ...v,
                  status: 'CATALOG' as const,
                  flow: null,
                  masteryLevel: 0,
                  repetitions: 0,
                  reviewLapseStreak: 0,
                  lastReviewedAt: null,
                  nextReviewAt: null,
                }
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
      if (promotedVerseIds.length > 0) onSlotFreed?.(promotedVerseIds);
      return { xpLoss };
    },
    [statusFilter, telegramId, setVerses, isSameVerse, setTotalCount, setGalleryIndex, onVerseMutationCommitted, onSlotFreed]
  );

  const confirmDeleteVerse = useCallback((verse: Verse) => {
    haptic('warning');
    setDeleteTargetVerse(verse);
  }, []);

  const handleConfirmDeleteVerse = useCallback(async () => {
    if (!deleteTargetVerse) return;
    if (!telegramId) {
      haptic('error');
      toast.error('Ошибка — попробуйте ещё раз', {
        label: 'Стихи',
      });
      return;
    }

    setIsDeleteSubmitting(true);
    markVersePending(deleteTargetVerse, true);

    try {
      const result = await handleDeleteVerse(deleteTargetVerse);
      haptic('success');
      const xpLoss = result?.xpLoss ?? 0;
      const feedback = buildVerseDeletionXpFeedback({
        xpLoss,
        resetToCatalog: statusFilter === 'catalog',
      });
      showVerseActionToast({
        kind: 'delete',
        reference: deleteTargetVerse.reference,
        meta:
          statusFilter === 'catalog'
            ? formatToastXpDelta(-xpLoss) ?? 'Сброшено в каталог'
            : formatToastXpDelta(-xpLoss),
      });
      setAnnouncement(`${deleteTargetVerse.reference}: ${feedback.title}`);
      setDeleteTargetVerse(null);
    } catch (err) {
      console.error('Не удалось удалить стих:', err);
      haptic('error');
      toast.error('Ошибка — попробуйте ещё раз', {
        label: 'Стихи',
      });
    } finally {
      markVersePending(deleteTargetVerse, false);
      setIsDeleteSubmitting(false);
    }
  }, [
    deleteTargetVerse,
    telegramId,
    statusFilter,
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
