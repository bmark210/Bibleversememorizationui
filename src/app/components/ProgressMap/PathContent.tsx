'use client'

import React, { useMemo } from 'react'
import type { PathPoint } from './utils'
import { pointsToSvgPath } from './utils'
import type { PilgrimLocationPalette } from './pilgrimConfig'
import { StepNode } from './StepNode'
import { PlayerMarker } from './PlayerMarker'
import { FriendMarker } from './FriendMarker'
import type { RaceTrackMarker } from './WindingPath'

interface PlayerTrackMarker {
  telegramId?: string | null
  name: string
  initials: string
  avatarUrl: string | null
  badgeLabel?: string | null
}

const STACK_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: 26, dy: -4 },
  { dx: -26, dy: -4 },
  { dx: 14, dy: -20 },
  { dx: -14, dy: -20 },
  { dx: 34, dy: -18 },
  { dx: -34, dy: -18 },
  { dx: 0, dy: -32 },
]

interface PathContentProps {
  /** Точки пути (из PathBackgroundImage или авто-генерации) */
  points: PathPoint[]
  width: number
  height: number
  palette: PilgrimLocationPalette
  totalSteps: number
  activeStepIndex: number | null
  milestoneSteps: number[]
  playerMarker: PlayerTrackMarker | null
  friendMarkers: RaceTrackMarker[]
  playerStepIndex: number
  hasBackgroundImage: boolean
  onActiveStepPress?: () => void
  onOpenPlayerProfile?: (player: {
    telegramId: string
    name: string
    avatarUrl: string | null
  }) => void
}

/**
 * Компонент рендерит SVG path, ноды и маркеры.
 * Получает points извне (может быть авто-сгенерированными или из картинки).
 */
export function PathContent({
  points,
  width,
  height,
  palette,
  totalSteps,
  activeStepIndex,
  milestoneSteps,
  playerMarker,
  friendMarkers,
  playerStepIndex,
  hasBackgroundImage,
  onActiveStepPress,
  onOpenPlayerProfile,
}: PathContentProps) {
  const milestoneSet = useMemo(() => new Set(milestoneSteps), [milestoneSteps])
  
  // Конвертируем points в SVG path
  const svgPath = useMemo(() => {
    if (points.length < 2) return ''
    return pointsToSvgPath(points)
  }, [points])

  if (points.length === 0) return null

  return (
    <>
      {svgPath && (
        <svg
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            opacity: hasBackgroundImage ? 0.7 : 1,
          }}
        >
          <path
            d={svgPath}
            stroke={palette.pathShadow}
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={svgPath}
            stroke={palette.pathGlow}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={svgPath}
            stroke={palette.path}
            strokeWidth={4.4}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={svgPath}
            stroke="rgba(255,255,255,0.26)"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="2.5 10"
          />
        </svg>
      )}

      {points.map((point, index) => {
        const state =
          activeStepIndex == null
            ? 'done'
            : index < activeStepIndex
              ? 'done'
              : index === activeStepIndex
                ? 'active'
                : 'locked'
        return (
          <StepNode
            key={index}
            state={state}
            xPct={(point.x / width) * 100}
            yPct={(point.y / height) * 100}
            palette={palette}
            isLocationMilestone={milestoneSet.has(index)}
            onClick={state === 'active' ? onActiveStepPress : undefined}
          />
        )
      })}

      {points.length > 0 &&
        friendMarkers.map((marker) => {
          const point = points[Math.max(0, Math.min(totalSteps - 1, marker.stepIndex))]
          if (!point) return null
          const offset = STACK_OFFSETS[marker.stackIndex % STACK_OFFSETS.length] ?? { dx: 0, dy: 0 }

          return (
            <FriendMarker
              key={marker.id}
              name={marker.name}
              initials={marker.initials}
              avatarUrl={marker.avatarUrl}
              xPct={(point.x / width) * 100}
              yPct={(point.y / height) * 100}
              offsetX={offset.dx}
              offsetY={offset.dy}
              emphasis={marker.emphasis}
              badgeLabel={marker.badgeLabel}
              seed={marker.seed}
              onClick={
                onOpenPlayerProfile
                  ? () =>
                      onOpenPlayerProfile({
                        telegramId: marker.id,
                        name: marker.name,
                        avatarUrl: marker.avatarUrl,
                      })
                  : undefined
              }
            />
          )
        })}

      {playerMarker && points.length > 0 && (
        <PlayerMarker
          name={playerMarker.name}
          initials={playerMarker.initials}
          avatarUrl={playerMarker.avatarUrl}
          badgeLabel={playerMarker.badgeLabel}
          xPct={(points[playerStepIndex]!.x / width) * 100}
          yPct={(points[playerStepIndex]!.y / height) * 100}
          onClick={
            playerMarker.telegramId && onOpenPlayerProfile
              ? () =>
                  onOpenPlayerProfile({
                    telegramId: playerMarker.telegramId,
                    name: playerMarker.name,
                    avatarUrl: playerMarker.avatarUrl,
                  })
              : undefined
          }
        />
      )}
    </>
  )
}

// Re-export типов для обратной совместимости (из WindingPath)
export type { RaceTrackMarker } from './WindingPath'
