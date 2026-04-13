import type { TextBoxVisibility } from "@/app/types/textBox";

export const DEFAULT_TEXT_BOX_VISIBILITY: TextBoxVisibility = "private";

export const TEXT_BOX_VISIBILITY_OPTIONS: Array<{
  value: TextBoxVisibility;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    value: "private",
    label: "Личная",
    shortLabel: "Личная",
    description: "Коробку видите только вы.",
  },
  {
    value: "public",
    label: "Открытая",
    shortLabel: "Открытая",
    description: "Коробку видят ваши подписчики и все пользователи приложения.",
  },
];

export function getTextBoxVisibilityLabel(
  visibility?: TextBoxVisibility | null,
): string {
  const resolvedVisibility = visibility ?? DEFAULT_TEXT_BOX_VISIBILITY;
  return (
    TEXT_BOX_VISIBILITY_OPTIONS.find(
      (option) => option.value === resolvedVisibility,
    )?.shortLabel ?? "Личная"
  );
}

export function getTextBoxVisibilityDescription(
  visibility?: TextBoxVisibility | null,
): string {
  const resolvedVisibility = visibility ?? DEFAULT_TEXT_BOX_VISIBILITY;
  return (
    TEXT_BOX_VISIBILITY_OPTIONS.find(
      (option) => option.value === resolvedVisibility,
    )?.description ?? "Коробку видите только вы."
  );
}

export function getTextBoxVisibilityToneClassName(
  visibility?: TextBoxVisibility | null,
): string {
  if ((visibility ?? DEFAULT_TEXT_BOX_VISIBILITY) === "public") {
    return "border-brand-primary/15 bg-brand-primary/8 text-brand-primary/88";
  }
  return "border-border-subtle/80 bg-bg-surface/85 text-text-secondary";
}
