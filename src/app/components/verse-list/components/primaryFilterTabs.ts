import type { VerseListStatusFilter } from "../constants";

export type VerseListPrimaryFilterKey = "catalog" | "friends" | "my";

export type VerseListPrimaryFilterOption = {
  key: VerseListPrimaryFilterKey;
  label: string;
};

const PRIMARY_FILTER_OPTIONS: readonly VerseListPrimaryFilterOption[] = [
  { key: "catalog", label: "Каталог" },
  { key: "friends", label: "Друзья" },
  { key: "my", label: "Мои стихи" },
];

export function getVerseListPrimaryFilterKey(
  statusFilter: VerseListStatusFilter,
): VerseListPrimaryFilterKey {
  if (statusFilter === "catalog") return "catalog";
  if (statusFilter === "friends") return "friends";
  return "my";
}

export function getVisibleVerseListPrimaryFilterOptions(hasFriends = false) {
  return hasFriends
    ? PRIMARY_FILTER_OPTIONS
    : PRIMARY_FILTER_OPTIONS.filter((option) => option.key !== "friends");
}
