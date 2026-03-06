'use client'

import React, { useEffect, useState } from 'react'
import { Map } from 'lucide-react'
import {
  fetchDashboardLeaderboard,
  type DashboardLeaderboard,
} from '@/api/services/leaderboard'
import { Card } from './ui/card'

const MAP_W = 300
const MAP_H = 330

const MILESTONES = [
  { id: 0, name: 'Странник',  minScore: 0,  emoji: '🌱', x: 150, y: 298 },
  { id: 1, name: 'Поляна',    minScore: 15, emoji: '⛺', x: 68,  y: 252 },
  { id: 2, name: 'Долина',    minScore: 30, emoji: '🏕️', x: 224, y: 208 },
  { id: 3, name: 'Перевал',   minScore: 45, emoji: '🗻', x: 96,  y: 163 },
  { id: 4, name: 'Высота',    minScore: 60, emoji: '⛰️', x: 220, y: 118 },
  { id: 5, name: 'Цитадель',  minScore: 75, emoji: '🏯', x: 78,  y: 72  },
  { id: 6, name: 'Вершина',   minScore: 90, emoji: '⭐', x: 150, y: 26  },
] as const

type Milestone = (typeof MILESTONES)[number]

function getPositionForScore(score: number): { x: number; y: number } {
  const s = Math.max(0, Math.min(100, score))
  for (let i = 0; i < MILESTONES.length - 1; i++) {
    const from = MILESTONES[i]
    const to = MILESTONES[i + 1]
    if (s >= from.minScore && s < to.minScore) {
      const t = (s - from.minScore) / (to.minScore - from.minScore)
      return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
    }
  }
  return { x: MILESTONES[MILESTONES.length - 1].x, y: MILESTONES[MILESTONES.length - 1].y }
}

function getCurrentMilestone(score: number): Milestone {
  let current: Milestone = MILESTONES[0]
  for (const m of MILESTONES) {
    if (score >= m.minScore) current = m
    else break
  }
  return current
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function pluralizeFriends(n: number): string {
  const r10 = n % 10
  const r100 = n % 100
  if (r100 >= 11 && r100 <= 19) return 'друзей'
  if (r10 === 1) return 'друг'
  if (r10 >= 2 && r10 <= 4) return 'друга'
  return 'друзей'
}

interface ProgressMapProps {
  telegramId?: string | null
}

export function ProgressMap({ telegramId }: ProgressMapProps) {
  const [leaderboard, setLeaderboard] = useState<DashboardLeaderboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!telegramId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    fetchDashboardLeaderboard({ telegramId, limit: 10 })
      .then(setLeaderboard)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [telegramId])

  const currentUser = leaderboard?.currentUser
  const friends = (leaderboard?.entries ?? []).filter((e) => !e.isCurrentUser)
  const userScore = currentUser?.score ?? 0
  const currentPos = getPositionForScore(userScore)
  const currentMilestone = getCurrentMilestone(userScore)

  const pathD = MILESTONES.map((m, i) => `${i === 0 ? 'M' : 'L'} ${m.x} ${m.y}`).join(' ')

  return (
    <Card className="relative overflow-hidden rounded-3xl border-border/70 bg-gradient-to-br from-emerald-500/10 via-background to-primary/5 p-5 sm:p-6 gap-0">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-16 -left-10 h-44 w-44 rounded-full bg-emerald-500/12 blur-2xl" />
        <div className="absolute -bottom-16 right-0 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
      </div>

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-primary">
            <Map className="h-4 w-4 text-primary" />
            Карта странника
          </h3>
          {friends.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {friends.length} {pluralizeFriends(friends.length)} на карте
            </span>
          )}
        </div>

        {/* Subtitle */}
        {currentUser ? (
          <p className="text-sm text-muted-foreground">
            Ты на локации{' '}
            <span className="font-medium text-foreground/90">
              {currentMilestone.emoji} {currentMilestone.name}
            </span>
            {' · '}счёт {userScore}%
          </p>
        ) : !isLoading ? (
          <p className="text-sm text-muted-foreground">
            Войди через Telegram, чтобы увидеть свою позицию на карте.
          </p>
        ) : null}

        {/* Map */}
        {isLoading ? (
          <div className="h-[330px] animate-pulse rounded-2xl bg-background/55" />
        ) : (
          <div
            className="relative mx-auto rounded-2xl overflow-hidden"
            style={{ width: MAP_W, height: MAP_H }}
          >
            {/* Terrain gradient */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, #86efac 0%, #4ade80 14%, #22c55e 28%, #166534 44%, #6b7280 60%, #9ca3af 76%, #e2e8f0 90%, #f8fafc 100%)',
              }}
            />
            {/* Dark mode overlay */}
            <div className="absolute inset-0 dark:bg-black/55" />
            {/* Pixel grid */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(0,0,0,1) 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(0,0,0,1) 8px)',
              }}
            />

            <svg width={MAP_W} height={MAP_H} className="absolute inset-0">
              <defs>
                <filter id="pm-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="pm-glow-player" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Road shadow */}
              <path
                d={pathD}
                fill="none"
                stroke="rgba(0,0,0,0.22)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dashed road */}
              <path
                d={pathD}
                fill="none"
                stroke="#fef9c3"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="11 6"
              />

              {/* Milestones */}
              {MILESTONES.map((m) => {
                const unlocked = userScore >= m.minScore
                return (
                  <g key={m.id}>
                    {/* Outer glow ring for unlocked */}
                    {unlocked && (
                      <circle
                        cx={m.x}
                        cy={m.y}
                        r={24}
                        fill="rgba(251,191,36,0.12)"
                      />
                    )}
                    {/* Main circle */}
                    <circle
                      cx={m.x}
                      cy={m.y}
                      r={17}
                      fill={unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(20,20,20,0.5)'}
                      stroke={unlocked ? '#fbbf24' : 'rgba(255,255,255,0.25)'}
                      strokeWidth={unlocked ? 2.5 : 1.5}
                      filter={unlocked ? 'url(#pm-glow)' : undefined}
                    />
                    {/* Emoji */}
                    <text
                      x={m.x}
                      y={m.y + 6}
                      textAnchor="middle"
                      fontSize="14"
                    >
                      {unlocked ? m.emoji : '🔒'}
                    </text>
                    {/* Label pill */}
                    <rect
                      x={m.x - 28}
                      y={m.y + 22}
                      width={56}
                      height={14}
                      rx={4}
                      ry={4}
                      fill="rgba(255,255,255,0.72)"
                    />
                    <text
                      x={m.x}
                      y={m.y + 32}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontFamily="monospace"
                      fontWeight="700"
                      fill={unlocked ? '#1f2937' : '#6b7280'}
                    >
                      {m.name}
                    </text>
                  </g>
                )
              })}

              {/* Friend markers */}
              {friends.slice(0, 6).map((friend, idx) => {
                const pos = getPositionForScore(friend.score)
                const offX = (idx % 3 - 1) * 20
                const offY = -24 - Math.floor(idx / 3) * 18
                return (
                  <g key={friend.telegramId}>
                    <circle
                      cx={pos.x + offX}
                      cy={pos.y + offY}
                      r={12}
                      fill="rgba(14,165,233,0.92)"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <text
                      x={pos.x + offX}
                      y={pos.y + offY + 4.5}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="white"
                    >
                      {getInitials(friend.name)}
                    </text>
                  </g>
                )
              })}

              {/* Current user marker */}
              {currentUser && (
                <g>
                  {/* Shadow */}
                  <ellipse
                    cx={currentPos.x}
                    cy={currentPos.y + 2}
                    rx={10}
                    ry={4}
                    fill="rgba(0,0,0,0.22)"
                  />
                  {/* Pulse ring */}
                  <circle
                    cx={currentPos.x}
                    cy={currentPos.y - 15}
                    r={18}
                    fill="none"
                    stroke="rgba(251,191,36,0.55)"
                    strokeWidth={3}
                  >
                    <animate attributeName="r" values="18;26;18" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.55;0;0.55" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                  {/* Bouncing group */}
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0; 0,-5; 0,0"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                    <circle
                      cx={currentPos.x}
                      cy={currentPos.y - 15}
                      r={14}
                      fill="#fbbf24"
                      stroke="white"
                      strokeWidth={2.5}
                      filter="url(#pm-glow-player)"
                    />
                    <text
                      x={currentPos.x}
                      y={currentPos.y - 10}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="bold"
                      fill="white"
                    >
                      {getInitials(currentUser.name)}
                    </text>
                  </g>
                </g>
              )}
            </svg>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/70 bg-background/70 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Счёт</div>
            <div className="mt-0.5 font-bold text-foreground/90">{userScore}%</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Серия</div>
            <div className="mt-0.5 font-bold text-foreground/90">{currentUser?.streakDays ?? 0} дн</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Место</div>
            <div className="mt-0.5 font-bold text-foreground/90">
              {currentUser?.rank != null ? `#${currentUser.rank}` : '—'}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
            Ты
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
            Друзья
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[11px]">🔒</span>
            Не открыто
          </span>
        </div>
      </div>
    </Card>
  )
}
