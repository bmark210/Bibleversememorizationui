export type TelegramColorScheme = "light" | "dark";

export type TelegramPopupButton = {
  id?: string;
  type?: "default" | "ok" | "close" | "cancel" | "destructive";
  text: string;
};

export type TelegramPopupParams = {
  title?: string;
  message: string;
  buttons?: TelegramPopupButton[];
};

export type TelegramWebAppUser = {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type TelegramThemeParams = Record<string, unknown>;

export type TelegramInitDataUnsafe = {
  user?: TelegramWebAppUser;
  [key: string]: unknown;
};

export type TelegramSafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type TelegramHapticFeedback = {
  impactOccurred: (style: "light" | "medium" | "heavy") => void;
  notificationOccurred: (
    style: "success" | "error" | "warning"
  ) => void;
};

export type TelegramBackButton = {
  isVisible?: boolean;
  show?: () => void;
  hide?: () => void;
  onClick?: (callback: () => void) => void;
  offClick?: (callback: () => void) => void;
};

export type TelegramWebApp = {
  expand?: () => void;
  ready?: () => void;
  requestFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  disableRotation?: () => void;
  disableFocusOutside?: () => void;
  showAlert?: (message: string) => void;
  showConfirm?: (
    message: string,
    callback: (confirmed: boolean) => void
  ) => void;
  showPopup?: (
    params: TelegramPopupParams,
    callback?: (buttonId?: string) => void
  ) => void;
  close?: () => void;
  openLink?: (url: string) => void;
  setBackgroundColor?: (color: string) => void;
  setHeaderColor?: (color: string) => void;
  setBottomBarColor?: (color: string) => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
  BackButton?: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
  initDataUnsafe?: TelegramInitDataUnsafe;
  themeParams?: TelegramThemeParams;
  platform?: string;
  colorScheme?: TelegramColorScheme;
  version?: string;
  isFullscreen?: boolean;
  isVerticalSwipesEnabled?: boolean;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: Partial<TelegramSafeAreaInsets>;
  contentSafeAreaInset?: Partial<TelegramSafeAreaInsets>;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.Telegram?.WebApp ?? null;
}

export function getTelegramWebAppUser(): TelegramWebAppUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function getTelegramUserId(): string | null {
  const telegramUserId = getTelegramWebAppUser()?.id;
  return telegramUserId == null ? null : String(telegramUserId);
}
