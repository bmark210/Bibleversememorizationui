const xpNumberFormatter = new Intl.NumberFormat("ru-RU");

export function formatXp(value: number | null | undefined): string {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  return `${xpNumberFormatter.format(safeValue)} XP`;
}
