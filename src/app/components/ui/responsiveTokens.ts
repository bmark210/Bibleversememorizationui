/*
 * Shared responsive class tokens for page-level surfaces and compact lists.
 * Keep these tokens generic so Dashboard, Profile, and future screens can
 * scale the same way across narrow / small / large breakpoints.
 */

export const SURFACE_PAD = "p-3.5 narrow:px-3 narrow:py-2 sm:p-4 lg:p-5";

export const SECTION_GAP = "gap-2 narrow:gap-1.5";

export const GRID_GAP = "gap-2.5 narrow:gap-2 sm:gap-3";

export const HEADING_TEXT = "px-1 text-base narrow:text-[15px] sm:text-lg";

export const HEADING_MB = "px-1 mb-2.5 narrow:mb-1.5 sm:mb-3";

export const HERO_TEXT =
  "px-1 text-[clamp(1.8rem,5.8vw,2.65rem)] narrow:text-[clamp(1.55rem,7vw,2rem)]";

export const HERO_SUBTITLE =
  "px-1 text-[13px] leading-6 narrow:text-[12px] narrow:leading-5 sm:text-sm sm:leading-relaxed";

export const AVATAR_SIZE = "h-10 w-10 narrow:h-9 narrow:w-9 sm:h-11 sm:w-11";

export const CTA_BUTTON =
  "h-11 w-full rounded-[1.2rem] px-5 narrow:h-10 narrow:px-4 sm:w-auto sm:min-w-[184px]";

export const STAT_PAD =
  "px-3.5 py-3 narrow:px-3 narrow:py-2 sm:rounded-[1.35rem] sm:px-4 sm:py-3.5";

export const STAT_LABEL = "text-[10px] narrow:text-[9px]";

export const STAT_VALUE =
  "mt-1.5 text-[clamp(1.35rem,5vw,2rem)] narrow:mt-0 narrow:text-[clamp(1.12rem,4.4vw,1.5rem)]";

export const ROW_PAD =
  "rounded-[1.2rem] px-3 py-2 narrow:gap-2.5 narrow:px-2.5 narrow:py-1.75";

export const RANK_BADGE =
  "h-7 w-7 text-[11px] narrow:h-6.5 narrow:w-6.5 narrow:text-[10px]";

export const ROW_AVATAR = "h-8 w-8 narrow:h-7 narrow:w-7";

export const ROW_NAME = "text-[13px] narrow:text-[12px]";

export const ROW_DETAIL = "text-[11px] narrow:text-[10px]";

export const SHOW_ME_BTN =
  "h-8 shrink-0 rounded-full px-3 text-[11px] narrow:h-7.5 narrow:px-2.5 narrow:text-[10px]";

export const ROW_GAP = "space-y-2 narrow:space-y-1.5";

export const PAGE_COMPACT_PADDING =
  "px-3 py-3 narrow:px-3 narrow:py-3 sm:px-4 lg:px-5";

export const SECTION_STACK = "space-y-3 narrow:space-y-2.5 sm:space-y-3";

export const SEGMENTED_TABS_TRIGGER =
  "h-10 gap-2 rounded-[1rem] px-3 text-xs narrow:h-9 narrow:gap-1.5 narrow:px-2.5 sm:text-sm";

export const COMPACT_META_TEXT =
  "text-[11px] text-text-muted narrow:text-[10px]";
