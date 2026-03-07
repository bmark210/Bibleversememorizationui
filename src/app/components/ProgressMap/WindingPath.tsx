'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { PilgrimLocationPalette } from './pilgrimConfig'
import { generatePathPoints, pointsToSvgPath } from './utils'
import { StepNode } from './StepNode'
import { PlayerMarker } from './PlayerMarker'
import { FriendMarker } from './FriendMarker'

export interface RaceTrackMarker {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  stepIndex: number
  emphasis: 'default' | 'ahead' | 'behind'
  stackIndex: number
  seed: string
  badgeLabel?: string | null
}

interface PlayerTrackMarker {
  name: string
  initials: string
  avatarUrl: string | null
  badgeLabel?: string | null
}

interface WindingPathProps {
  totalSteps: number
  activeStepIndex: number | null
  stepOffset?: number
  palette: PilgrimLocationPalette
  playerMarker?: PlayerTrackMarker | null
  friendMarkers?: RaceTrackMarker[]
  milestoneSteps?: number[]
  onActiveStepPress?: () => void
}

const PAD_TOP = 34
const PAD_BOTTOM = 48

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

export function WindingPath({
  totalSteps,
  activeStepIndex,
  stepOffset = 0,
  palette,
  playerMarker = null,
  friendMarkers = [],
  milestoneSteps = [],
  onActiveStepPress,
}: WindingPathProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = () => {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setSize((prev) =>
          prev && prev.width === rect.width && prev.height === rect.height
            ? prev
            : { width: rect.width, height: rect.height },
        )
      }
    }

    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [])

  const milestoneSet = useMemo(() => new Set(milestoneSteps), [milestoneSteps])
  const points = size
    ? generatePathPoints(totalSteps, size.width, size.height, {
        paddingTop: PAD_TOP,
        paddingBottom: PAD_BOTTOM,
        stepOffset,
      })
    : []
  const svgPath = points.length > 1 ? pointsToSvgPath(points) : ''
  const playerStepIndex =
    activeStepIndex == null ? Math.max(totalSteps - 1, 0) : activeStepIndex

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {size && svgPath ? (
        <svg
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
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
      ) : null}

      {points.map((point, index) => {
        if (!size) return null
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
            xPct={(point.x / size.width) * 100}
            yPct={(point.y / size.height) * 100}
            palette={palette}
            isLocationMilestone={milestoneSet.has(index)}
            onClick={state === 'active' ? onActiveStepPress : undefined}
          />
        )
      })}

      {points.length > 0 &&
        friendMarkers.map((marker) => {
          const point = points[Math.max(0, Math.min(totalSteps - 1, marker.stepIndex))]
          if (!point || !size) return null
          const offset = STACK_OFFSETS[marker.stackIndex % STACK_OFFSETS.length] ?? { dx: 0, dy: 0 }

          return (
            <FriendMarker
              key={marker.id}
              name={marker.name}
              initials={marker.initials}
              avatarUrl={marker.avatarUrl}
              xPct={(point.x / size.width) * 100}
              yPct={(point.y / size.height) * 100}
              offsetX={offset.dx}
              offsetY={offset.dy}
              emphasis={marker.emphasis}
              badgeLabel={marker.badgeLabel}
              seed={marker.seed}
            />
          )
        })}

      {playerMarker && points.length > 0 && size ? (
        <PlayerMarker
          name={playerMarker.name}
          initials={playerMarker.initials}
          avatarUrl={playerMarker.avatarUrl}
          badgeLabel={playerMarker.badgeLabel}
          xPct={(points[playerStepIndex]!.x / size.width) * 100}
          yPct={(points[playerStepIndex]!.y / size.height) * 100}
        />
      ) : null}
    </div>
  )
}
