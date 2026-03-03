export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

function isAtLeastVersion(current: string | undefined, minimum: string): boolean {
  if (!current) return false;
  const currentParts = current.split('.').map((part) => Number.parseInt(part, 10));
  const minimumParts = minimum.split('.').map((part) => Number.parseInt(part, 10));
  const maxLength = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = Number.isFinite(currentParts[index]) ? currentParts[index] : 0;
    const minimumPart = Number.isFinite(minimumParts[index]) ? minimumParts[index] : 0;
    if (currentPart > minimumPart) return true;
    if (currentPart < minimumPart) return false;
  }

  return true;
}

export function haptic(style: HapticStyle) {
  try {
    const webApp = (window as any).Telegram?.WebApp;
    if (!isAtLeastVersion(webApp?.version, '6.1')) return;

    const tg = webApp?.HapticFeedback;
    if (!tg) return;
    if (style === 'success' || style === 'error' || style === 'warning') {
      tg.notificationOccurred(style);
    } else {
      tg.impactOccurred(style);
    }
  } catch {}
}
