'use client'

const HINT_BUDGET_KEY = 'bible-memory.hint-budget.v1';
const DAILY_HINT_BUDGET = 5;

interface HintBudgetData {
  date: string;
  used: number;
}

function getLocalDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function readRaw(): HintBudgetData {
  if (typeof window === 'undefined') return { date: getLocalDateString(), used: 0 };

  try {
    const raw = window.localStorage.getItem(HINT_BUDGET_KEY);
    if (!raw) return { date: getLocalDateString(), used: 0 };

    const parsed = JSON.parse(raw) as Partial<HintBudgetData>;
    if (
      typeof parsed?.date !== 'string' ||
      typeof parsed?.used !== 'number'
    ) {
      return { date: getLocalDateString(), used: 0 };
    }

    return { date: parsed.date, used: parsed.used };
  } catch {
    return { date: getLocalDateString(), used: 0 };
  }
}

function writeRaw(data: HintBudgetData): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(HINT_BUDGET_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

function ensureToday(data: HintBudgetData): HintBudgetData {
  const today = getLocalDateString();
  if (data.date !== today) {
    return { date: today, used: 0 };
  }
  return data;
}

/** Total daily hint budget. */
export function getHintBudgetTotal(): number {
  return DAILY_HINT_BUDGET;
}

/** Read the current hint budget state, auto-resetting if a new day. */
export function readHintBudget(): { remaining: number; total: number } {
  const data = ensureToday(readRaw());
  const remaining = Math.max(0, DAILY_HINT_BUDGET - data.used);
  return { remaining, total: DAILY_HINT_BUDGET };
}

/**
 * Consume one hint token from the daily budget.
 * Returns `true` if a token was available and consumed, `false` if budget exhausted.
 */
export function consumeHintToken(): boolean {
  const data = ensureToday(readRaw());
  if (data.used >= DAILY_HINT_BUDGET) return false;

  const updated: HintBudgetData = { date: data.date, used: data.used + 1 };
  writeRaw(updated);
  return true;
}
