export type ThemeId = "light" | "dark";

type ThemeChromePalette = {
  background: string;
  header: string;
  bottomBar: string;
  foreground: string;
};

type ThemePalette = {
  chrome: ThemeChromePalette;
  telegramThemeParams: Record<string, string>;
};

export const THEME_PALETTES: Record<ThemeId, ThemePalette> = {
  light: {
    chrome: {
      background: "#F7F1E3",
      header: "#FFFAF0",
      bottomBar: "#FFFDF8",
      foreground: "#3B2F24",
    },
    telegramThemeParams: {
      bg_color: "#F7F1E3",
      secondary_bg_color: "#FFFAF0",
      section_bg_color: "#FFFDF8",
      header_bg_color: "#FFFAF0",
      bottom_bar_bg_color: "#FFFDF8",
      text_color: "#3B2F24",
      hint_color: "#8B7A67",
      subtitle_text_color: "#6B5A46",
      link_color: "#8C6A3B",
      button_color: "#8C6A3B",
      button_text_color: "#FFF8EC",
      accent_text_color: "#C8A96B",
      destructive_text_color: "#A94F4F",
      section_header_text_color: "#8C6A3B",
      section_separator_color: "#D8C7A3",
    },
  },
  dark: {
    chrome: {
      background: "#17120F",
      header: "#1E1814",
      bottomBar: "#261F1A",
      foreground: "#F4E6C7",
    },
    telegramThemeParams: {
      bg_color: "#17120F",
      secondary_bg_color: "#1E1814",
      section_bg_color: "#261F1A",
      header_bg_color: "#1E1814",
      bottom_bar_bg_color: "#261F1A",
      text_color: "#F4E6C7",
      hint_color: "#AD9473",
      subtitle_text_color: "#D7C19A",
      link_color: "#C8A96B",
      button_color: "#C8A96B",
      button_text_color: "#1A1814",
      accent_text_color: "#C8A96B",
      destructive_text_color: "#CD7A6C",
      section_header_text_color: "#C8A96B",
      section_separator_color: "#493B31",
    },
  },
};

export function getThemePalette(theme: ThemeId): ThemePalette {
  return THEME_PALETTES[theme];
}
