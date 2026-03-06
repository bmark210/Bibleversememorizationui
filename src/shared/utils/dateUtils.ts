export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

export function toUtcDayIndex(value: Date): number {
  return Math.floor(startOfUtcDay(value).getTime() / MS_PER_DAY);
}

export function getUtcDayDifference(later: Date, earlier: Date): number {
  return toUtcDayIndex(later) - toUtcDayIndex(earlier);
}

export function isSameUtcDay(left: Date, right: Date): boolean {
  return toUtcDayIndex(left) === toUtcDayIndex(right);
}
