import type { VerseListStatusFilter } from "@/app/components/verse-list/constants";

export type AppRootPage =
  | "dashboard"
  | "verses"
  | "training"
  | "admin"
  | "profile";

export type PendingVerseListReturn = {
  statusFilter: VerseListStatusFilter;
};

export type PlayerProfilePreview = {
  telegramId: string;
  name: string;
  avatarUrl: string | null;
};

export type AppThemeId = "light" | "dark";
