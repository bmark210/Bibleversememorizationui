export const TOTAL_STEPS = 50
export const STEP_HEIGHT = 120   // px between step centres
export const MAP_PADDING_TOP = 90
export const MAP_PADDING_BOTTOM = 110

/** Total canvas height (without runtime safe-area insets) */
export const MAP_HEIGHT = TOTAL_STEPS * STEP_HEIGHT + MAP_PADDING_TOP + MAP_PADDING_BOTTOM

/** localStorage key for last-seen score */
export const LS_KEY = 'bm_pm_last_score'

/**
 * Maps score 0–100 to a step index 0 (bottom / beginning) … TOTAL_STEPS-1 (top / goal).
 * Step 0 is rendered near the BOTTOM of the tall canvas; step N-1 near the TOP.
 */
export function scoreToStepIndex(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)) / 100 * (TOTAL_STEPS - 1))
}

/**
 * Y coordinate (px from canvas top) for step `i`.
 * Step 0 → near bottom, step TOTAL_STEPS-1 → near top.
 */
export function stepToY(i: number): number {
  return MAP_PADDING_TOP + (TOTAL_STEPS - 1 - i) * STEP_HEIGHT + STEP_HEIGHT / 2
}

/**
 * ScrollTop value that centres step `i` vertically in the viewport.
 * Clamp to 0 at call-site if needed.
 */
export function stepToScrollY(i: number, viewportHeight: number): number {
  return stepToY(i) - viewportHeight / 2
}

// ── Decorative items ────────────────────────────────────────────────────────

export interface DecorativeItem {
  id: string
  emoji: string
  /** Which step this item is vertically aligned with */
  stepIndex: number
  side: 'left' | 'right'
  /** Font-size in px (default 28) */
  size?: number
}

export const DECORATIVE_ITEMS: DecorativeItem[] = [
  { id: 'd01', emoji: '✝️',  stepIndex: 1,  side: 'left',  size: 30 },
  { id: 'd02', emoji: '📖', stepIndex: 4,  side: 'right', size: 26 },
  { id: 'd03', emoji: '🕊️', stepIndex: 7,  side: 'left',  size: 28 },
  { id: 'd04', emoji: '⭐', stepIndex: 10, side: 'right', size: 26 },
  { id: 'd05', emoji: '🙏', stepIndex: 13, side: 'left',  size: 28 },
  { id: 'd06', emoji: '🕍', stepIndex: 16, side: 'right', size: 30 },
  { id: 'd07', emoji: '🌿', stepIndex: 19, side: 'left',  size: 28 },
  { id: 'd08', emoji: '💫', stepIndex: 22, side: 'right', size: 26 },
  { id: 'd09', emoji: '🌟', stepIndex: 25, side: 'left',  size: 28 },
  { id: 'd10', emoji: '📿', stepIndex: 28, side: 'right', size: 26 },
  { id: 'd11', emoji: '🕊️', stepIndex: 31, side: 'left',  size: 28 },
  { id: 'd12', emoji: '🌸', stepIndex: 34, side: 'right', size: 26 },
  { id: 'd13', emoji: '✨', stepIndex: 37, side: 'left',  size: 28 },
  { id: 'd14', emoji: '🔑', stepIndex: 40, side: 'right', size: 26 },
  { id: 'd15', emoji: '🌙', stepIndex: 43, side: 'left',  size: 28 },
  { id: 'd16', emoji: '👑', stepIndex: 46, side: 'right', size: 32 },
  { id: 'd17', emoji: '✝️',  stepIndex: 49, side: 'left',  size: 34 },
]
