import type { VerseListStatusFilter } from "../constants";

export type VerseListPrimaryFilterKey = "catalog" | "my";

export type VerseListPrimaryFilterOption = {
  key: VerseListPrimaryFilterKey;
  label: string;
};

const PRIMARY_FILTER_OPTIONS: readonly VerseListPrimaryFilterOption[] = [
  { key: "catalog", label: "Каталог" },
  { key: "my", label: "Мои стихи" },
];

export function getVerseListPrimaryFilterKey(
  statusFilter: VerseListStatusFilter,
): VerseListPrimaryFilterKey {
  if (statusFilter === "catalog") return "catalog";
  return "my";
}

export function getVisibleVerseListPrimaryFilterOptions() {
  return PRIMARY_FILTER_OPTIONS;
}
