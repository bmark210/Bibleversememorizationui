export type VerseCardTone =
  | "my"
  | "queue"
  | "catalog"
  | "catalogPreview"
  | "learning"
  | "review"
  | "mastered"
  | "stopped";

export type VerseCardStatusToneKey =
  | "learning"
  | "review"
  | "reviewWaiting"
  | "mastered"
  | "stopped";

export type VerseCardTonePalette = {
  frameClassName: string;
  surfaceClassName: string;
  surfaceTintClassName: string;
  glowClassName: string;
  lineClassName: string;
  accentBorderClassName: string;
  accentTextClassName: string;
  progressClassName: string;
};

export type VerseCardStatusPillPalette = {
  pillClassName: string;
  iconClassName: string;
  titleClassName: string;
};

export type VerseCardPreviewChromePalette = {
  referenceClassName: string;
  dividerClassName: string;
};

export type VerseCardColorConfig = {
  surfaceBorderClassName: string;
  actionButtonClassName: string;
  actionButtonHoverClassName: string;
  summaryPanelClassName: string;
  summaryCompactPanelClassName: string;
  waitingPillClassName: string;
  tagClassName: string;
  tagInteractiveClassName: string;
  avatarFallbackClassName: string;
  avatarRingClassName: string;
  tones: Record<VerseCardTone, VerseCardTonePalette>;
  previewChrome: Record<VerseCardTone, VerseCardPreviewChromePalette>;
  statusPills: Record<VerseCardStatusToneKey, VerseCardStatusPillPalette>;
};

const DEFAULT_PREVIEW_CHROME: VerseCardPreviewChromePalette = {
  referenceClassName: "",
  dividerClassName: "",
};

const CATALOG_PREVIEW_CHROME: VerseCardPreviewChromePalette = {
  referenceClassName:
    "!text-[#f1d6a7] [text-shadow:0_1px_0_rgba(0,0,0,0.16)]",
  dividerClassName: "via-[#d3a66d]/72",
};

export const VERSE_CARD_COLOR_CONFIG: VerseCardColorConfig = {
  surfaceBorderClassName: "border-border-subtle/80",
  actionButtonClassName:
    "border bg-bg-overlay/92 text-text-primary shadow-[var(--shadow-soft)] backdrop-blur-sm",
  actionButtonHoverClassName:
    "hover:border-border-default hover:bg-bg-surface/96",
  summaryPanelClassName:
    "w-full justify-between rounded-[1.7rem] border border-border-subtle/85 bg-bg-overlay/92 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-sm",
  summaryCompactPanelClassName:
    "rounded-full border border-border-subtle/85 bg-bg-overlay/92 px-3 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur-sm",
  waitingPillClassName: "border-border-subtle/85 bg-bg-overlay/92",
  tagClassName:
    "border-border-subtle bg-bg-elevated/95 text-text-secondary shadow-[var(--shadow-soft)]",
  tagInteractiveClassName:
    "hover:border-border-default hover:bg-bg-surface hover:text-text-primary",
  avatarFallbackClassName: "bg-bg-subtle text-text-secondary",
  avatarRingClassName: "border-bg-overlay",
  tones: {
    catalog: {
      frameClassName: "bg-border-default",
      surfaceClassName: "",
      surfaceTintClassName: "bg-bg-subtle/55",
      glowClassName: "bg-bg-subtle",
      lineClassName: "from-transparent via-border-default to-transparent",
      accentBorderClassName: "border-border-default/70",
      accentTextClassName: "text-brand-primary",
      progressClassName: "text-brand-primary",
    },
    catalogPreview: {
      frameClassName: "bg-[#765942]/78",
      surfaceClassName: "bg-[#31251c]",
      surfaceTintClassName: "bg-[#684d36]/12",
      glowClassName: "bg-[#8f6a45]/16",
      lineClassName: "from-transparent via-[#c69a63]/78 to-transparent",
      accentBorderClassName: "border-[#c69a63]/44",
      accentTextClassName: "text-[#f0d8ae]",
      progressClassName: "text-[#f0d8ae]",
    },
    queue: {
      frameClassName: "bg-status-queue",
      surfaceClassName: "",
      surfaceTintClassName: "bg-status-queue-tint",
      glowClassName: "bg-status-queue-soft",
      lineClassName: "from-transparent via-status-queue to-transparent",
      accentBorderClassName: "border-status-queue/28",
      accentTextClassName: "text-status-queue",
      progressClassName: "text-status-queue",
    },
    my: {
      frameClassName: "bg-status-collection",
      surfaceClassName: "",
      surfaceTintClassName: "bg-status-collection-tint",
      glowClassName: "bg-status-collection-soft",
      lineClassName: "from-transparent via-status-collection to-transparent",
      accentBorderClassName: "border-status-collection/28",
      accentTextClassName: "text-status-collection",
      progressClassName: "text-status-collection",
    },
    learning: {
      frameClassName: "bg-status-learning",
      surfaceClassName: "",
      surfaceTintClassName: "bg-status-learning-tint",
      glowClassName: "bg-status-learning-soft",
      lineClassName: "from-transparent via-status-learning to-transparent",
      accentBorderClassName: "border-status-learning/30",
      accentTextClassName: "text-status-learning",
      progressClassName: "text-status-learning",
    },
    review: {
      frameClassName: "bg-status-review",
      surfaceClassName: "",
      surfaceTintClassName: "bg-status-review-tint",
      glowClassName: "bg-status-review-soft",
      lineClassName: "from-transparent via-status-review to-transparent",
      accentBorderClassName: "border-status-review/30",
      accentTextClassName: "text-status-review",
      progressClassName: "text-status-review",
    },
    mastered: {
      frameClassName: "bg-status-mastered",
      surfaceClassName: "",
      surfaceTintClassName: "bg-status-mastered-tint",
      glowClassName: "bg-status-mastered-soft",
      lineClassName: "from-transparent via-status-mastered to-transparent",
      accentBorderClassName: "border-status-mastered/30",
      accentTextClassName: "text-status-mastered",
      progressClassName: "text-status-mastered",
    },
    stopped: {
      frameClassName: "bg-status-paused",
      surfaceClassName: "",
      surfaceTintClassName: "bg-status-paused-tint",
      glowClassName: "bg-status-paused-soft",
      lineClassName: "from-transparent via-status-paused to-transparent",
      accentBorderClassName: "border-status-paused/30",
      accentTextClassName: "text-status-paused",
      progressClassName: "text-status-paused",
    },
  },
  previewChrome: {
    catalog: CATALOG_PREVIEW_CHROME,
    catalogPreview: CATALOG_PREVIEW_CHROME,
    queue: DEFAULT_PREVIEW_CHROME,
    my: DEFAULT_PREVIEW_CHROME,
    learning: DEFAULT_PREVIEW_CHROME,
    review: DEFAULT_PREVIEW_CHROME,
    mastered: DEFAULT_PREVIEW_CHROME,
    stopped: DEFAULT_PREVIEW_CHROME,
  },
  statusPills: {
    learning: {
      pillClassName: "border-status-learning/25 bg-status-learning-soft",
      iconClassName: "text-status-learning",
      titleClassName: "text-status-learning/85",
    },
    review: {
      pillClassName: "border-status-review/25 bg-status-review-soft",
      iconClassName: "text-status-review",
      titleClassName: "text-status-review/85",
    },
    reviewWaiting: {
      pillClassName: "border-status-review/25 bg-status-review-soft",
      iconClassName: "text-status-review",
      titleClassName: "text-status-review/85",
    },
    mastered: {
      pillClassName: "border-status-mastered/25 bg-status-mastered-soft",
      iconClassName: "text-status-mastered",
      titleClassName: "text-status-mastered/85",
    },
    stopped: {
      pillClassName: "border-status-paused/25 bg-status-paused-soft",
      iconClassName: "text-status-paused",
      titleClassName: "text-status-paused/85",
    },
  },
};
