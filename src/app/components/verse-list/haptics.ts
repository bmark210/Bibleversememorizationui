export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

export function haptic(style: HapticStyle) {
  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (!tg) return;
    if (style === 'success' || style === 'error' || style === 'warning') {
      tg.notificationOccurred(style);
    } else {
      tg.impactOccurred(style);
    }
  } catch {}
}

