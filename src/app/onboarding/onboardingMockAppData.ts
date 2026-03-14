import type { DashboardFriendsActivity, FriendPlayerListItem, FriendPlayersPageResponse } from "@/api/services/friends";
import type { DashboardLeaderboard } from "@/api/services/leaderboard";
import type { UserDashboardStats } from "@/api/services/userStats";
import type { Verse } from "@/app/App";
import {
  createOnboardingMockVerses,
  reduceOnboardingMockVerses,
  ONBOARDING_PRIMARY_VERSE_ID,
} from "./onboardingMockVerseFlow";

function nowIso() {
  return new Date().toISOString();
}

function minutesAgoIso(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buildMockFriend(
  overrides: Partial<FriendPlayerListItem> & {
    telegramId: string;
    name: string;
  },
): FriendPlayerListItem {
  return {
    telegramId: overrides.telegramId,
    name: overrides.name,
    avatarUrl: overrides.avatarUrl ?? null,
    isFriend: overrides.isFriend ?? false,
    lastActiveAt: overrides.lastActiveAt ?? minutesAgoIso(18),
    masteredVerses: overrides.masteredVerses ?? 0,
    weeklyRepetitions: overrides.weeklyRepetitions ?? 0,
    dailyStreak: overrides.dailyStreak ?? 0,
    xp: overrides.xp ?? 0,
  };
}

function buildProfilePage(items: FriendPlayerListItem[]): FriendPlayersPageResponse {
  return {
    items,
    totalCount: items.length,
    limit: Math.max(8, items.length),
    startWith: 0,
  };
}

export const ONBOARDING_MOCK_DASHBOARD_STATS: UserDashboardStats = {
  totalVerses: 18,
  learningStatusVerses: 4,
  learningVerses: 3,
  reviewVerses: 4,
  masteredVerses: 2,
  stoppedVerses: 1,
  dueReviewVerses: 2,
  totalRepetitions: 19,
  xp: 1240,
  bestVerseReference: "От Иоанна 14:6",
  dailyStreak: 5,
};

export const ONBOARDING_MOCK_DASHBOARD_LEADERBOARD: DashboardLeaderboard = {
  generatedAt: nowIso(),
  totalParticipants: 24,
  entries: [
    {
      rank: 1,
      telegramId: "mock-leader-1",
      name: "Марк",
      avatarUrl: null,
      xp: 1820,
      streakDays: 14,
      weeklyRepetitions: 31,
      isCurrentUser: false,
    },
    {
      rank: 2,
      telegramId: "mock-leader-2",
      name: "Анна",
      avatarUrl: null,
      xp: 1540,
      streakDays: 11,
      weeklyRepetitions: 26,
      isCurrentUser: false,
    },
    {
      rank: 3,
      telegramId: "mock-current-user",
      name: "Вы",
      avatarUrl: null,
      xp: 1240,
      streakDays: 5,
      weeklyRepetitions: 18,
      isCurrentUser: true,
    },
    {
      rank: 4,
      telegramId: "mock-leader-4",
      name: "Иван",
      avatarUrl: null,
      xp: 1180,
      streakDays: 4,
      weeklyRepetitions: 16,
      isCurrentUser: false,
    },
  ],
  currentUser: {
    telegramId: "mock-current-user",
    name: "Вы",
    avatarUrl: null,
    rank: 3,
    xp: 1240,
    streakDays: 5,
    weeklyRepetitions: 18,
  },
};

export const ONBOARDING_MOCK_DASHBOARD_FRIENDS_ACTIVITY: DashboardFriendsActivity = {
  generatedAt: nowIso(),
  summary: {
    friendsTotal: 6,
    activeLast7Days: 5,
    avgWeeklyRepetitions: 17,
    avgStreakDays: 4,
    avgXp: 980,
  },
  entries: [
    {
      telegramId: "mock-friend-1",
      name: "Анна",
      avatarUrl: null,
      lastActiveAt: minutesAgoIso(8),
      masteredVerses: 4,
      weeklyRepetitions: 22,
      dailyStreak: 7,
      xp: 1310,
    },
    {
      telegramId: "mock-friend-2",
      name: "Илья",
      avatarUrl: null,
      lastActiveAt: hoursAgoIso(2),
      masteredVerses: 2,
      weeklyRepetitions: 16,
      dailyStreak: 4,
      xp: 960,
    },
    {
      telegramId: "mock-friend-3",
      name: "Нина",
      avatarUrl: null,
      lastActiveAt: hoursAgoIso(6),
      masteredVerses: 1,
      weeklyRepetitions: 13,
      dailyStreak: 3,
      xp: 870,
    },
  ],
};

function buildOnboardingMasteredVerse(): Verse {
  const createdAt = nowIso();

  return {
    id: "onboarding-mastered-verse",
    externalVerseId: "onboarding-mastered-verse",
    difficultyLevel: "MEDIUM",
    status: "MASTERED",
    masteryLevel: 7,
    repetitions: 7,
    reviewLapseStreak: 0,
    referenceScore: 0,
    incipitScore: 0,
    contextScore: 0,
    lastTrainingModeId: null,
    lastReviewedAt: hoursAgoIso(12),
    createdAt,
    updatedAt: createdAt,
    translation: "RST",
    nextReview: null,
    nextReviewAt: null,
    tags: [{ id: "onboarding-tag-faith", slug: "faith", title: "Вера" }],
    popularityScope: "self",
    popularityValue: 0,
    popularityPreviewUsers: [],
    reference: "Евреям 11:1",
    text: "Вера же есть осуществление ожидаемого и уверенность в невидимом.",
  };
}

export function buildOnboardingMockTrainingVerses(
  mockVerses: ReadonlyArray<Verse>,
): Verse[] {
  const sourceVerses =
    mockVerses.length > 0 ? [...mockVerses] : createOnboardingMockVerses();

  const trainingVerses = sourceVerses.filter((verse) => verse.status !== "CATALOG");
  const masteredVerse = buildOnboardingMasteredVerse();

  return [...trainingVerses, masteredVerse];
}

export function createOnboardingMockTrainingVerses(): Verse[] {
  const [primaryCatalogVerse, reviewVerse] = createOnboardingMockVerses();
  const [learningVerse] = reduceOnboardingMockVerses(
    [primaryCatalogVerse],
    ONBOARDING_PRIMARY_VERSE_ID,
    "add-to-learning",
  );

  return buildOnboardingMockTrainingVerses([learningVerse, reviewVerse]);
}

export function createOnboardingMockProfilePlayersPage(): FriendPlayersPageResponse {
  return buildProfilePage([
    buildMockFriend({
      telegramId: "mock-player-1",
      name: "Павел",
      isFriend: false,
      xp: 1180,
      dailyStreak: 6,
      weeklyRepetitions: 18,
      masteredVerses: 3,
      lastActiveAt: minutesAgoIso(14),
    }),
    buildMockFriend({
      telegramId: "mock-player-2",
      name: "Лев",
      isFriend: true,
      xp: 980,
      dailyStreak: 4,
      weeklyRepetitions: 15,
      masteredVerses: 2,
      lastActiveAt: hoursAgoIso(3),
    }),
    buildMockFriend({
      telegramId: "mock-player-3",
      name: "Мария",
      isFriend: false,
      xp: 910,
      dailyStreak: 3,
      weeklyRepetitions: 13,
      masteredVerses: 1,
      lastActiveAt: hoursAgoIso(5),
    }),
  ]);
}

export function createOnboardingMockProfileFriendsPage(): FriendPlayersPageResponse {
  return buildProfilePage([
    buildMockFriend({
      telegramId: "mock-friend-1",
      name: "Анна",
      isFriend: true,
      xp: 1310,
      dailyStreak: 7,
      weeklyRepetitions: 22,
      masteredVerses: 4,
      lastActiveAt: minutesAgoIso(8),
    }),
    buildMockFriend({
      telegramId: "mock-friend-2",
      name: "Илья",
      isFriend: true,
      xp: 960,
      dailyStreak: 4,
      weeklyRepetitions: 16,
      masteredVerses: 2,
      lastActiveAt: hoursAgoIso(2),
    }),
  ]);
}
