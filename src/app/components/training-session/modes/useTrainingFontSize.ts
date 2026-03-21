'use client'

import {
  type TrainingFontSize,
  useTrainingFontStore,
} from '@/app/stores/trainingFontStore';

export interface TrainingFontSizes {
  /** text-sm equivalent: 14 / 16 / 18 */
  sm: number;
  /** text-base equivalent: 16 / 18 / 20 */
  base: number;
  /** letter button font: 15 / 17 / 19 */
  letter: number;
  /** mask dots font: 11 / 12 / 13 */
  mask: number;
  /** mask grid column width: 10 / 11 / 12 */
  maskGridCol: number;
  /** mask char container height: 16 / 18 / 20 */
  maskCharHeight: number;
  /** serif prompt card in anchor training (px) */
  anchorPrompt: number;
  /** current level */
  level: TrainingFontSize;
}

const FONT_SIZE_MAP: Record<TrainingFontSize, TrainingFontSizes> = {
  small: { sm: 14, base: 16, letter: 15, mask: 11, maskGridCol: 10, maskCharHeight: 16, anchorPrompt: 17, level: 'small' },
  medium: { sm: 16, base: 18, letter: 17, mask: 12, maskGridCol: 11, maskCharHeight: 18, anchorPrompt: 19, level: 'medium' },
  large: { sm: 18, base: 20, letter: 19, mask: 13, maskGridCol: 12, maskCharHeight: 20, anchorPrompt: 21, level: 'large' },
};

export function useTrainingFontSize(): TrainingFontSizes {
  const level = useTrainingFontStore((state) => state.trainingFontSize);
  return FONT_SIZE_MAP[level];
}
