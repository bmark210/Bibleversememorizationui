import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeDashboardFriendActivityEntry,
  normalizeFriendPlayerListItem,
} from './friends'

test('normalizes friend player items with avatar and mastered-verse fallbacks', () => {
  const item = normalizeFriendPlayerListItem({
    telegramId: '42',
    name: '  John Doe  ',
    avatarUrl: '   ',
    isFriend: true,
    lastActiveAt: '2026-03-07T12:00:00.000Z',
    weeklyRepetitions: 5,
    dailyStreak: 2,
    xp: 188,
  })

  assert.deepEqual(item, {
    telegramId: '42',
    name: 'John Doe',
    avatarUrl: null,
    isFriend: true,
    lastActiveAt: '2026-03-07T12:00:00.000Z',
    masteredVerses: 0,
    weeklyRepetitions: 5,
    dailyStreak: 2,
    xp: 188,
  })
})

test('normalizes dashboard activity entries and clamps invalid mastered counts to zero', () => {
  const entry = normalizeDashboardFriendActivityEntry({
    telegramId: '77',
    name: '',
    avatarUrl: 'https://example.com/avatar.jpg',
    lastActiveAt: null,
    masteredVerses: -4,
    weeklyRepetitions: 9,
    dailyStreak: 4,
    xp: 1010,
  })

  assert.deepEqual(entry, {
    telegramId: '77',
    name: 'Участник #77',
    avatarUrl: 'https://example.com/avatar.jpg',
    lastActiveAt: null,
    masteredVerses: 0,
    weeklyRepetitions: 9,
    dailyStreak: 4,
    xp: 1010,
  })
})
