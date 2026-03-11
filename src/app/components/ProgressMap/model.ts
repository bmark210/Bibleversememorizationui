import type { DashboardLeaderboard } from '@/api/services/leaderboard'
import type { FriendPlayerListItem } from '@/api/services/friends'
import type { UserDashboardStats } from '@/api/services/userStats'
import {
  MAP_MAX_MASTERED,
  STEPS_PER_LOCATION,
  clampMasteredVerses,
  getCurrentLocation,
  getLocationStateByMastered,
  getOverflowMastered,
  getPlayerGlobalStepIndex,
  getPlayerLocalCompletedSteps,
  masteredToLocationIndex,
} from './pilgrimConfig'
import { getInitials } from './utils'
import type { FriendOnLocation } from './LocationScreen'

export type ProgressMapAction = 'open-verses' | 'start-learning' | 'start-review'

type ProgressMapVerse = {
  status: string
  nextReviewAt: string | null
}

interface BuildProgressMapViewModelParams {
  dashboardStats: UserDashboardStats | null
  dashboardLeaderboard: DashboardLeaderboard | null
  trainingVerses: ProgressMapVerse[]
  friendsOnMap: FriendPlayerListItem[]
  currentUserStats?: {
    xp: number | null
    dailyStreak: number | null
    masteredVerses: number | null
  } | null
}

export interface ProgressMapViewModel {
  masteredVerses: number
  cappedMasteredVerses: number
  overflowMastered: number
  totalVerses: number
  learningVerses: number
  reviewVerses: number
  dueReviewVerses: number
  weeklyRepetitions: number
  streakDays: number
  xp: number
  rank: number | null
  currentLocationIndex: number
  currentLocationName: string
  playerStepIndex: number
  playerLocalCompletedSteps: number
  isJourneyComplete: boolean
  playerName: string
  playerInitials: string
  playerAvatarUrl: string | null
  primaryAction: ProgressMapAction
  actionTitle: string
  actionHint: string
  friendsByLocation: Map<number, FriendOnLocation[]>
}

function formatRepetitionWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'повторение'
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
    return 'повторения'
  }
  return 'повторений'
}

function formatVerseWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return 'стих'
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
    return 'стиха'
  }
  return 'стихов'
}

function isReviewVerse(verse: Pick<ProgressMapVerse, 'status'>) {
  return String(verse.status).toUpperCase() === 'REVIEW'
}

function isLearningVerse(verse: Pick<ProgressMapVerse, 'status'>) {
  return String(verse.status).toUpperCase() === 'LEARNING'
}

function isDueReviewVerse(verse: Pick<ProgressMapVerse, 'status' | 'nextReviewAt'>) {
  if (!isReviewVerse(verse)) return false
  if (!verse.nextReviewAt) return true
  const timestamp = new Date(verse.nextReviewAt).getTime()
  return Number.isNaN(timestamp) || timestamp <= Date.now()
}

function resolvePrimaryAction(params: {
  totalVerses: number
  dueReviewVerses: number
  learningVerses: number
  reviewVerses: number
}): ProgressMapAction {
  if (params.totalVerses === 0) return 'open-verses'
  if (params.dueReviewVerses > 0) return 'start-review'
  if (params.learningVerses > 0) return 'start-learning'
  if (params.reviewVerses > 0) return 'start-review'
  return 'open-verses'
}

function getActionCopy(
  action: ProgressMapAction,
  params: {
    totalVerses: number
    dueReviewVerses: number
    learningVerses: number
    reviewVerses: number
  },
) {
  if (action === 'start-review') {
    return {
      title: 'Повторить сейчас',
      hint:
        params.dueReviewVerses > 0
          ? `${params.dueReviewVerses} ${formatRepetitionWord(params.dueReviewVerses)} ждут вас`
          : `${params.reviewVerses} ${formatVerseWord(params.reviewVerses)} готовы к повторению`,
    }
  }

  if (action === 'start-learning') {
    return {
      title: 'Продолжить тренировку',
      hint: `${params.learningVerses} ${formatVerseWord(params.learningVerses)} сейчас в изучении`,
    }
  }

  return {
    title: params.totalVerses === 0 ? 'Добавить первый стих' : 'Открыть стихи',
    hint:
      params.totalVerses === 0
        ? 'Начните путь, чтобы открыть первую точку маршрута'
        : 'Соберите новую подборку для продвижения по карте',
  }
}

function compareFriends(left: FriendPlayerListItem, right: FriendPlayerListItem) {
  if (right.masteredVerses !== left.masteredVerses) {
    return right.masteredVerses - left.masteredVerses
  }
  if (right.weeklyRepetitions !== left.weeklyRepetitions) {
    return right.weeklyRepetitions - left.weeklyRepetitions
  }
  return left.telegramId.localeCompare(right.telegramId)
}

export function buildProgressMapViewModel({
  dashboardStats,
  dashboardLeaderboard,
  trainingVerses,
  friendsOnMap,
  currentUserStats = null,
}: BuildProgressMapViewModelParams): ProgressMapViewModel {
  const currentUser = dashboardLeaderboard?.currentUser
  const totalVerses = dashboardStats?.totalVerses ?? trainingVerses.length
  const learningVerses = dashboardStats?.learningVerses ?? trainingVerses.filter(isLearningVerse).length
  const reviewVerses = dashboardStats?.reviewVerses ?? trainingVerses.filter(isReviewVerse).length
  const dueReviewVerses = dashboardStats?.dueReviewVerses ?? trainingVerses.filter(isDueReviewVerse).length
  const masteredVerses = currentUserStats?.masteredVerses ?? dashboardStats?.masteredVerses ?? 0
  const cappedMasteredVerses = clampMasteredVerses(masteredVerses)
  const overflowMastered = getOverflowMastered(masteredVerses)
  const currentLocationIndex = masteredToLocationIndex(masteredVerses)
  const currentLocation = getCurrentLocation(masteredVerses)
  const playerLocalCompletedSteps = getPlayerLocalCompletedSteps(currentLocationIndex, masteredVerses)
  const primaryAction = resolvePrimaryAction({
    totalVerses,
    dueReviewVerses,
    learningVerses,
    reviewVerses,
  })
  const actionCopy = getActionCopy(primaryAction, {
    totalVerses,
    dueReviewVerses,
    learningVerses,
    reviewVerses,
  })
  const playerName = currentUser?.name?.trim() || 'Вы'
  const playerInitials = getInitials(playerName) || 'Я'
  const weeklyRepetitions = Math.max(0, Math.floor(currentUser?.weeklyRepetitions ?? 0))
  const xp = Math.max(
    0,
    Math.round(currentUserStats?.xp ?? currentUser?.xp ?? dashboardStats?.xp ?? 0),
  )
  const streakDays = Math.max(
    0,
    Math.floor(
      currentUserStats?.dailyStreak ??
        dashboardStats?.dailyStreak ??
        currentUser?.streakDays ??
        0,
    ),
  )
  const sortedFriends = [...friendsOnMap].sort(compareFriends)

  const nearestAhead =
    [...sortedFriends]
      .filter((friend) => friend.masteredVerses > masteredVerses)
      .sort((left, right) => {
        if (left.masteredVerses !== right.masteredVerses) {
          return left.masteredVerses - right.masteredVerses
        }
        if (right.weeklyRepetitions !== left.weeklyRepetitions) {
          return right.weeklyRepetitions - left.weeklyRepetitions
        }
        return left.telegramId.localeCompare(right.telegramId)
      })[0] ?? null

  const nearestBehind =
    [...sortedFriends]
      .filter((friend) => friend.masteredVerses < masteredVerses)
      .sort((left, right) => {
        if (left.masteredVerses !== right.masteredVerses) {
          return right.masteredVerses - left.masteredVerses
        }
        if (right.weeklyRepetitions !== left.weeklyRepetitions) {
          return right.weeklyRepetitions - left.weeklyRepetitions
        }
        return left.telegramId.localeCompare(right.telegramId)
      })[0] ?? null

  const stepStacks = new Map<string, number>()
  const friendsByLocation = new Map<number, FriendOnLocation[]>()

  for (const friend of sortedFriends) {
    const globalStepIndex = getPlayerGlobalStepIndex(friend.masteredVerses)
    const locationIndex = Math.floor(globalStepIndex / STEPS_PER_LOCATION)
    const localStep = globalStepIndex % STEPS_PER_LOCATION
    const stackKey = `${locationIndex}:${localStep}`
    const stackIndex = stepStacks.get(stackKey) ?? 0
    stepStacks.set(stackKey, stackIndex + 1)

    const entry: FriendOnLocation = {
      id: friend.telegramId,
      name: friend.name,
      initials: getInitials(friend.name) || 'F',
      avatarUrl: friend.avatarUrl,
      localStep,
      emphasis:
        nearestAhead?.telegramId === friend.telegramId
          ? 'ahead'
          : nearestBehind?.telegramId === friend.telegramId
            ? 'behind'
            : 'default',
      seed: friend.telegramId,
      stackIndex,
      overflowMastered: getOverflowMastered(friend.masteredVerses),
    }

    const bucket = friendsByLocation.get(locationIndex) ?? []
    bucket.push(entry)
    friendsByLocation.set(locationIndex, bucket)
  }

  return {
    masteredVerses,
    cappedMasteredVerses,
    overflowMastered,
    totalVerses,
    learningVerses,
    reviewVerses,
    dueReviewVerses,
    weeklyRepetitions,
    streakDays,
    xp,
    rank: currentUser?.rank ?? null,
    currentLocationIndex,
    currentLocationName: currentLocation.nameRu,
    playerStepIndex: getPlayerGlobalStepIndex(masteredVerses),
    playerLocalCompletedSteps,
    isJourneyComplete: cappedMasteredVerses >= MAP_MAX_MASTERED,
    playerName,
    playerInitials,
    playerAvatarUrl: currentUser?.avatarUrl ?? null,
    primaryAction,
    actionTitle: actionCopy.title,
    actionHint: actionCopy.hint,
    friendsByLocation,
  }
}

export function countPassedFriends(params: {
  previousMasteredVerses: number
  currentMasteredVerses: number
  friendsOnMap: FriendPlayerListItem[]
}) {
  return params.friendsOnMap.filter(
    (friend) =>
      friend.masteredVerses > params.previousMasteredVerses &&
      friend.masteredVerses <= params.currentMasteredVerses,
  ).length
}

export function getLocationStateSnapshot(locIndex: number, masteredVerses: number) {
  return {
    state: getLocationStateByMastered(locIndex, masteredVerses),
    localCompletedSteps: getPlayerLocalCompletedSteps(locIndex, masteredVerses),
  }
}
