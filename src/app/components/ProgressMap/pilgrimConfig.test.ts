import assert from 'node:assert/strict'
import test from 'node:test'
import type { CurrentUserLeaderboardSnapshot } from '@/api/services/leaderboard'
import type { UserDashboardStats } from '@/api/services/userStats'
import { buildProgressMapViewModel } from './model'
import {
  getOverflowMastered,
  getPlayerGlobalStepIndex,
  getPlayerLocalCompletedSteps,
  masteredToLocationIndex,
} from './pilgrimConfig'

test('maps mastered verses to stable location, local progress, and overflow', () => {
  const cases = [
    { mastered: 0, locationIndex: 0, localCompleted: 0, overflow: 0, stepIndex: 0 },
    { mastered: 1, locationIndex: 0, localCompleted: 1, overflow: 0, stepIndex: 1 },
    { mastered: 11, locationIndex: 0, localCompleted: 11, overflow: 0, stepIndex: 11 },
    { mastered: 12, locationIndex: 1, localCompleted: 0, overflow: 0, stepIndex: 12 },
    { mastered: 95, locationIndex: 7, localCompleted: 11, overflow: 0, stepIndex: 95 },
    { mastered: 96, locationIndex: 7, localCompleted: 12, overflow: 0, stepIndex: 95 },
    { mastered: 120, locationIndex: 7, localCompleted: 12, overflow: 24, stepIndex: 95 },
  ]

  for (const item of cases) {
    assert.equal(masteredToLocationIndex(item.mastered), item.locationIndex)
    assert.equal(
      getPlayerLocalCompletedSteps(item.locationIndex, item.mastered),
      item.localCompleted,
    )
    assert.equal(getOverflowMastered(item.mastered), item.overflow)
    assert.equal(getPlayerGlobalStepIndex(item.mastered), item.stepIndex)
  }
})

test('adding new verses does not roll back map position when mastered count stays the same', () => {
  const leaderboardUser: CurrentUserLeaderboardSnapshot = {
    telegramId: '1',
    name: 'Mark Brown',
    avatarUrl: null,
    rank: 3,
    score: 74,
    streakDays: 6,
    weeklyRepetitions: 11,
  }

  const baseStats: UserDashboardStats = {
    totalVerses: 20,
    learningStatusVerses: 0,
    learningVerses: 2,
    reviewVerses: 3,
    masteredVerses: 18,
    stoppedVerses: 0,
    dueReviewVerses: 1,
    totalRepetitions: 40,
    averageProgressPercent: 61,
    bestVerseReference: null,
    dailyStreak: 6,
  }

  const before = buildProgressMapViewModel({
    dashboardStats: baseStats,
    dashboardLeaderboard: {
      generatedAt: new Date(0).toISOString(),
      totalParticipants: 1,
      entries: [],
      currentUser: leaderboardUser,
    },
    trainingVerses: [],
    friendsOnMap: [],
  })

  const after = buildProgressMapViewModel({
    dashboardStats: {
      ...baseStats,
      totalVerses: 45,
    },
    dashboardLeaderboard: {
      generatedAt: new Date(0).toISOString(),
      totalParticipants: 1,
      entries: [],
      currentUser: leaderboardUser,
    },
    trainingVerses: [],
    friendsOnMap: [],
  })

  assert.equal(after.currentLocationIndex, before.currentLocationIndex)
  assert.equal(after.playerLocalCompletedSteps, before.playerLocalCompletedSteps)
  assert.equal(after.overflowMastered, before.overflowMastered)
})
