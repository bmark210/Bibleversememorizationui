export type VerseListRowActionCandidate<TAction> = {
  index: number;
  top: number;
  left: number;
  verseId: string | null;
  getAction: (selector: string) => TAction | null;
};

function normalizeVerseId(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function compareVerseListRows<TAction>(
  a: VerseListRowActionCandidate<TAction>,
  b: VerseListRowActionCandidate<TAction>,
) {
  if (a.index !== b.index) {
    return a.index - b.index;
  }

  if (a.top !== b.top) {
    return a.top - b.top;
  }

  return a.left - b.left;
}

export function selectVerseListAction<TAction>(
  rows: ReadonlyArray<VerseListRowActionCandidate<TAction>>,
  selector: string,
  options?: { targetVerseId?: string | null },
): TAction | null {
  if (!selector || rows.length === 0) return null;

  const orderedRows = [...rows].sort(compareVerseListRows);
  const targetVerseId = normalizeVerseId(options?.targetVerseId);

  if (targetVerseId) {
    for (const row of orderedRows) {
      if (normalizeVerseId(row.verseId) !== targetVerseId) continue;
      const action = row.getAction(selector);
      if (action) return action;
    }
  }

  for (const row of orderedRows) {
    const action = row.getAction(selector);
    if (action) return action;
  }

  return null;
}
