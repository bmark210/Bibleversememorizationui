'use client'

import { useMemo } from 'react';
import { useTelegramSafeArea } from '@/app/hooks/useTelegramSafeArea';
import { useTrainingFontStore } from '@/app/stores/trainingFontStore';
import { useMeasuredElementSize } from './useMeasuredElementSize';

/**
 * Параметры для расчёта, сколько элементов помещается без скролла.
 * Все размеры в пикселях (px).
 */
interface FittedBatchSizeOptions {
  /** Высота одного элемента (кнопки). Зависит от размера шрифта — берите из useTrainingFontSize(). */
  itemHeight: number;
  /** Вертикальный зазор между рядами. В упражнениях: 4 (буквы) или 6 (слова). */
  rowGap: number;
  /** Минимальная ширина одного элемента. Зависит от шрифта, см. формулы в упражнениях. */
  itemMinWidth: number;
  /** Горизонтальный зазор между элементами. Совпадает с rowGap (один gap для flex). */
  columnGap: number;
  /** Минимум элементов: хотя бы столько показываем (по умолчанию 4). */
  minItems?: number;
  /** Максимум элементов: больше не показываем (по умолчанию 40). */
  maxItems?: number;
  /** Выключает расчёт, если false — вернёт maxItems. */
  enabled?: boolean;
  /**
   * Сколько px вычесть из высоты контейнера.
   * Для обёртки с py-1 = 8px. Если обрезает снизу — увеличьте до 12–16.
   */
  reduceHeightBy?: number;
  /**
   * Сколько рядов «выкинуть» про запас, чтобы последний ряд не ушёл под футер.
   * 0 = не вычитать, 1 = вычесть один ряд. При обрезке снизу ставьте 1.
   */
  safetyRows?: number;
}

const DEFAULT_MIN = 4;
const DEFAULT_MAX = 40;

/**
 * Хук считает, сколько flex-wrap элементов помещается в контейнер без скролла.
 *
 * Подписывается на trainingFontSize — при смене размера шрифта пересчитает batchSize.
 *
 * Использование:
 * 1. Передайте ref на контейнер с flex-wrap (банк слов/букв).
 * 2. itemHeight и itemMinWidth берите из useTrainingFontSize() через формулы в упражнениях.
 * 3. Если контент обрезается снизу — увеличьте safetyRows до 1 и/или reduceHeightBy.
 * 4. Если много пустого места — уменьшите safetyRows до 0 или слегка уменьшите itemHeight.
 *
 * Возвращает: { ref, batchSize } — ref вешать на div, batchSize режет массив вариантов.
 */
export function useFittedBatchSize<T extends HTMLElement = HTMLDivElement>(
  options: FittedBatchSizeOptions
) {
  const {
    itemHeight,
    rowGap,
    itemMinWidth,
    columnGap,
    minItems = DEFAULT_MIN,
    maxItems = DEFAULT_MAX,
    enabled = true,
    reduceHeightBy = 0,
    safetyRows = 0,
  } = options;

  const { ref, size } = useMeasuredElementSize<T>(enabled);
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const bottomSafeArea = contentSafeAreaInset.bottom ?? 0;
  const trainingFontSize = useTrainingFontStore((s) => s.trainingFontSize);

  const batchSize = useMemo(() => {
    if (!enabled) return maxItems;
    if (size.height <= 0 || size.width <= 0) return minItems;

    const availableWidth = size.width;
    const availableHeight = Math.max(
      0,
      size.height - reduceHeightBy - bottomSafeArea
    );

    // Сколько элементов влезает в один ряд
    const itemsPerRow = Math.max(
      1,
      Math.floor((availableWidth + columnGap) / (itemMinWidth + columnGap))
    );

    // Сколько рядов помещается по высоте
    const rows = Math.max(
      1,
      Math.floor((availableHeight + rowGap) / (itemHeight + rowGap))
    );

    // Убираем safetyRows рядов — чтобы последний ряд не уехал под футер
    const effectiveRows = Math.max(1, rows - safetyRows);
    const fitted = effectiveRows * itemsPerRow;
    return Math.max(minItems, Math.min(maxItems, fitted));
  }, [
    enabled,
    size.height,
    size.width,
    itemHeight,
    rowGap,
    itemMinWidth,
    columnGap,
    minItems,
    maxItems,
    reduceHeightBy,
    safetyRows,
    bottomSafeArea,
    trainingFontSize, // при смене шрифта в профиле — пересчёт
  ]);

  return { ref, batchSize };
}
