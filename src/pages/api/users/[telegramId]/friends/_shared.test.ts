import assert from 'node:assert/strict'
import test from 'node:test'
import { VerseStatus } from '@/generated/prisma'
import { summarizeFriendMetricRows } from './_shared'

test('summarizes friend metric rows with mastered verses and weekly activity', () => {
  const now = Date.parse('2026-03-07T12:00:00.000Z')

  const summary = summarizeFriendMetricRows({
    storedStreak: 5,
    now,
    rows: [
      {
        status: VerseStatus.LEARNING,
        masteryLevel: 7,
        repetitions: 3,
        referenceScore: 80,
        incipitScore: 78,
        contextScore: 74,
        lastReviewedAt: new Date('2026-03-07T10:00:00.000Z'),
      },
      {
        status: VerseStatus.LEARNING,
        masteryLevel: 7,
        repetitions: 1,
        referenceScore: 66,
        incipitScore: 64,
        contextScore: 70,
        lastReviewedAt: new Date('2026-03-05T09:00:00.000Z'),
      },
      {
        status: VerseStatus.LEARNING,
        masteryLevel: 2,
        repetitions: 0,
        referenceScore: 55,
        incipitScore: 52,
        contextScore: 54,
        lastReviewedAt: new Date('2026-02-20T09:00:00.000Z'),
      },
      {
        status: VerseStatus.STOPPED,
        masteryLevel: 7,
        repetitions: 3,
        referenceScore: 99,
        incipitScore: 99,
        contextScore: 99,
        lastReviewedAt: null,
      },
    ],
  })

  assert.equal(summary.masteredVerses, 1)
  assert.equal(summary.weeklyRepetitions, 2)
  assert.equal(summary.dailyStreak, 5)
  assert.equal(summary.lastActiveAt, '2026-03-07T10:00:00.000Z')
  assert.equal(summary.averageProgressPercent > 0, true)
})
