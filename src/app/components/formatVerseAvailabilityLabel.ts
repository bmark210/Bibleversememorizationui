type FormatVerseAvailabilityLabelOptions = {
  now?: Date;
  timeZone?: string;
};

function getDateKey(date: Date, timeZone?: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  });
  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");

  return `${year}-${month}-${day}`;
}

function getTimeLabel(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

function getDayLabel(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone,
  })
    .format(date)
    .replaceAll(".", "");
}

export function formatVerseAvailabilityLabel(
  date: Date | null,
  options?: FormatVerseAvailabilityLabelOptions,
): string | null {
  if (!date) return null;

  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return null;

  const now = options?.now ?? new Date();
  const diffMs = timestamp - now.getTime();
  if (diffMs <= 0) return "Доступен сейчас";

  const timeZone = options?.timeZone;
  const timeLabel = getTimeLabel(date, timeZone);
  const currentDayKey = getDateKey(now, timeZone);
  const targetDayKey = getDateKey(date, timeZone);

  if (targetDayKey === currentDayKey) {
    return `Доступно сегодня в ${timeLabel}`;
  }

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDayKey = getDateKey(tomorrow, timeZone);
  if (targetDayKey === tomorrowDayKey) {
    return `Доступно завтра в ${timeLabel}`;
  }

  const dayLabel = getDayLabel(date, timeZone);
  return `Доступно ${dayLabel} в ${timeLabel}`;
}
