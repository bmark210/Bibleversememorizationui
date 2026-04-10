import { THEME_PALETTES } from "@/app/lib/themePalette";

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
  exitFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  lockOrientation?: () => void;
  unlockOrientation?: () => void;
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
  isClosingConfirmationEnabled?: boolean;
  isOrientationLocked?: boolean;
  isVerticalSwipesEnabled?: boolean;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: Partial<TelegramSafeAreaInsets>;
  contentSafeAreaInset?: Partial<TelegramSafeAreaInsets>;
  __isDevMock?: boolean;
};

type TelegramEventCallback = (...args: unknown[]) => void;
type TelegramWebAppWithDevFlag = TelegramWebApp & { __isDevMock?: boolean };

const DEV_TELEGRAM_THEME_PARAMS: Record<TelegramColorScheme, TelegramThemeParams> = {
  light: { ...THEME_PALETTES.light.telegramThemeParams },
  dark: { ...THEME_PALETTES.dark.telegramThemeParams },
};

const DEV_TELEGRAM_SAFE_AREA: TelegramSafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

const DEV_TELEGRAM_FULLSCREEN_SAFE_AREA: TelegramSafeAreaInsets = {
  top: 54,
  bottom: 34,
  left: 0,
  right: 0,
};

const DEV_TELEGRAM_FULLSCREEN_CONTENT_SAFE_AREA: TelegramSafeAreaInsets = {
  top: 88,
  bottom: 0,
  left: 0,
  right: 0,
};

let telegramDevMock: TelegramWebAppWithDevFlag | null = null;
let emitTelegramDevMockEvent: ((eventType: string) => void) | null = null;

/** Inline-проверка dev fullscreen emulation (без импорта, чтобы избежать circular deps) */
function isDevFullscreenEmulationActive(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const fromEnv = process.env.NEXT_PUBLIC_DEV_EMULATE_TELEGRAM_FULLSCREEN;
  if (fromEnv === "1" || fromEnv === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("bible-memory.devTelegramFullscreen") === "1";
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    } | undefined;
  }
}

function isTelegramDevMockEnabled() {
  return process.env.NODE_ENV === "development";
}

function cloneThemeParams(themeParams: TelegramThemeParams): TelegramThemeParams {
  return { ...themeParams };
}

function cloneInsets(insets: TelegramSafeAreaInsets): TelegramSafeAreaInsets {
  return { ...insets };
}

function createTelegramDevMock(): TelegramWebAppWithDevFlag {
  const eventListeners = new Map<string, Set<TelegramEventCallback>>();
  const backButtonListeners = new Set<TelegramEventCallback>();

  const emitEvent = (eventType: string) => {
    eventListeners.get(eventType)?.forEach((callback) => callback());
  };

  emitTelegramDevMockEvent = emitEvent;

  const updateViewport = (webApp: TelegramWebAppWithDevFlag) => {
    webApp.viewportHeight = window.innerHeight;
    webApp.viewportStableHeight = window.innerHeight;
    emitEvent("viewportChanged");
  };

  const backButton = {
    isVisible: false,
    show: () => {
      backButton.isVisible = true;
    },
    hide: () => {
      backButton.isVisible = false;
    },
    onClick: (callback: TelegramEventCallback) => {
      backButtonListeners.add(callback);
    },
    offClick: (callback: TelegramEventCallback) => {
      backButtonListeners.delete(callback);
    },
  };

  const startFullscreen = isDevFullscreenEmulationActive();

  const webApp: TelegramWebAppWithDevFlag = {
    __isDevMock: true,
    platform: "web",
    colorScheme: "light",
    version: "8.0",
    isFullscreen: startFullscreen,
    isClosingConfirmationEnabled: false,
    isOrientationLocked: false,
    isVerticalSwipesEnabled: true,
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,
    safeAreaInset: cloneInsets(startFullscreen ? DEV_TELEGRAM_FULLSCREEN_SAFE_AREA : DEV_TELEGRAM_SAFE_AREA),
    contentSafeAreaInset: cloneInsets(startFullscreen ? DEV_TELEGRAM_FULLSCREEN_CONTENT_SAFE_AREA : DEV_TELEGRAM_SAFE_AREA),
    initDataUnsafe: {
      user: {
        id: process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID?.trim() || "0",
        first_name: "Dev",
        last_name: "User",
        username: "telegram_dev_mock",
        language_code: "ru",
      },
    },
    themeParams: cloneThemeParams(DEV_TELEGRAM_THEME_PARAMS.light),
    ready: () => undefined,
    expand: () => {
      webApp.isExpanded = true;
      updateViewport(webApp);
    },
    requestFullscreen: () => {
      webApp.isFullscreen = true;
      webApp.safeAreaInset = cloneInsets(DEV_TELEGRAM_FULLSCREEN_SAFE_AREA);
      webApp.contentSafeAreaInset = cloneInsets(DEV_TELEGRAM_FULLSCREEN_CONTENT_SAFE_AREA);
      emitEvent("fullscreenChanged");
      emitEvent("safeAreaChanged");
      emitEvent("contentSafeAreaChanged");
      updateViewport(webApp);
    },
    exitFullscreen: () => {
      webApp.isFullscreen = false;
      webApp.safeAreaInset = cloneInsets(DEV_TELEGRAM_SAFE_AREA);
      webApp.contentSafeAreaInset = cloneInsets(DEV_TELEGRAM_SAFE_AREA);
      emitEvent("fullscreenChanged");
      emitEvent("safeAreaChanged");
      emitEvent("contentSafeAreaChanged");
      updateViewport(webApp);
    },
    disableVerticalSwipes: () => {
      webApp.isVerticalSwipesEnabled = false;
    },
    enableClosingConfirmation: () => {
      webApp.isClosingConfirmationEnabled = true;
    },
    disableClosingConfirmation: () => {
      webApp.isClosingConfirmationEnabled = false;
    },
    lockOrientation: () => {
      webApp.isOrientationLocked = true;
    },
    unlockOrientation: () => {
      webApp.isOrientationLocked = false;
    },
    disableFocusOutside: () => undefined,
    showAlert: (message: string) => {
      window.alert(message);
    },
    showConfirm: (message: string, callback: (confirmed: boolean) => void) => {
      callback(window.confirm(message));
    },
    showPopup: (params: TelegramPopupParams, callback?: (buttonId?: string) => void) => {
      const message = params.title ? `${params.title}\n\n${params.message}` : params.message;
      window.alert(message);
      callback?.(params.buttons?.[0]?.id ?? params.buttons?.[0]?.type ?? "ok");
    },
    close: () => undefined,
    openLink: (url: string) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    setBackgroundColor: (color: string) => {
      webApp.themeParams = { ...(webApp.themeParams ?? {}), bg_color: color };
      emitEvent("themeChanged");
    },
    setHeaderColor: (color: string) => {
      webApp.themeParams = { ...(webApp.themeParams ?? {}), header_bg_color: color };
      emitEvent("themeChanged");
    },
    setBottomBarColor: (color: string) => {
      webApp.themeParams = { ...(webApp.themeParams ?? {}), bottom_bar_bg_color: color };
      emitEvent("themeChanged");
    },
    onEvent: (eventType: string, callback: TelegramEventCallback) => {
      const listeners = eventListeners.get(eventType) ?? new Set<TelegramEventCallback>();
      listeners.add(callback);
      eventListeners.set(eventType, listeners);
    },
    offEvent: (eventType: string, callback: TelegramEventCallback) => {
      const listeners = eventListeners.get(eventType);
      if (!listeners) return;
      listeners.delete(callback);
      if (listeners.size === 0) {
        eventListeners.delete(eventType);
      }
    },
    BackButton: backButton,
    HapticFeedback: {
      impactOccurred: () => undefined,
      notificationOccurred: () => undefined,
    },
  };

  window.addEventListener("resize", () => updateViewport(webApp));

  return webApp;
}

function ensureTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.Telegram?.WebApp as TelegramWebAppWithDevFlag | undefined;

  if (existing && !existing.__isDevMock) {
    // В dev-режиме с эмуляцией fullscreen: если реальный WebApp не поддерживает
    // fullscreen (старая версия), заменяем на dev mock.
    if (
      isTelegramDevMockEnabled() &&
      isDevFullscreenEmulationActive() &&
      typeof existing.requestFullscreen !== "function"
    ) {
      // Реальный WebApp без fullscreen — заменяем на mock
    } else {
      return existing;
    }
  } else if (existing) {
    return existing;
  }

  if (!isTelegramDevMockEnabled()) {
    return null;
  }

  telegramDevMock ??= createTelegramDevMock();
  window.Telegram = {
    ...(window.Telegram ?? {}),
    WebApp: telegramDevMock,
  };

  return telegramDevMock;
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return ensureTelegramWebApp();
}

export function isTelegramDevMock(webApp: TelegramWebApp | null | undefined): boolean {
  return Boolean((webApp as TelegramWebAppWithDevFlag | null | undefined)?.__isDevMock);
}

export function setTelegramDevMockTheme(colorScheme: TelegramColorScheme): boolean {
  const webApp = ensureTelegramWebApp() as TelegramWebAppWithDevFlag | null;
  if (!webApp || !isTelegramDevMock(webApp)) {
    return false;
  }

  webApp.colorScheme = colorScheme;
  webApp.themeParams = cloneThemeParams(DEV_TELEGRAM_THEME_PARAMS[colorScheme]);
  emitTelegramDevMockEvent?.("themeChanged");
  return true;
}

export function getTelegramWebAppUser(): TelegramWebAppUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function getTelegramUserId(): string | null {
  const telegramUserId = getTelegramWebAppUser()?.id;
  return telegramUserId == null ? null : String(telegramUserId);
}
