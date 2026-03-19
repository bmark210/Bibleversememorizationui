export function formatVerseAvailabilityLabel(date: Date | null): string | null {
  if (!date) return null;

  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return null;

  const now = new Date();
  const diffMs = timestamp - now.getTime();
  if (diffMs <= 0) return "доступно сейчас";

  const timeLabel = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isSameDay) {
    return `до ${timeLabel}`;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();
  if (isTomorrow) {
    return `до завтра, ${timeLabel}`;
  }

  const dayLabel = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

  return `до ${dayLabel}, ${timeLabel}`;
}
