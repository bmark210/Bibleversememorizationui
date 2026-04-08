export type AppRootPage =
  | "dashboard"
  | "verses"
  | "training"
  | "community"
  | "profile";

export type PendingTextBoxReturn = {
  boxId: string;
  boxTitle: string;
};

export type PlayerProfilePreview = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
};

export type AppThemeId = "light" | "dark";
