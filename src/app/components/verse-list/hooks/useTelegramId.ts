import { useEffect, useState } from 'react';

function resolveTelegramIdFromEnv(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ??
    process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
    localStorage.getItem('telegramId') ??
    undefined
  );
}

export function useTelegramId() {
  const [telegramId, setTelegramId] = useState<string | undefined>();

  useEffect(() => {
    const id = resolveTelegramIdFromEnv();
    setTelegramId(id);
    if (id) {
      localStorage.setItem('telegramId', id);
    }
  }, []);

  return { telegramId, setTelegramId };
}

