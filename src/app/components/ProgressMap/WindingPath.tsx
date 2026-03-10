'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { PilgrimLocationPalette, PilgrimLocationBackgroundImage } from './pilgrimConfig'
import type { PathPoint } from './utils'
import { generateRelativePathPoints } from './utils'
import { PathBackgroundImage } from './PathBackgroundImage'
import { PathContent } from './PathContent'

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
  telegramId?: string | null
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
  onOpenPlayerProfile?: (player: {
    telegramId: string
    name: string
    avatarUrl: string | null
  }) => void
  /** Фоновая картинка с дорогой (обязательная) */
  backgroundImage: PilgrimLocationBackgroundImage
}

export function WindingPath({
  totalSteps,
  activeStepIndex,
  stepOffset = 0,
  palette,
  playerMarker = null,
  friendMarkers = [],
  milestoneSteps = [],
  onActiveStepPress,
  onOpenPlayerProfile,
  backgroundImage,
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

  // Генерируем относительные точки пути (0-1) - авто-волна если нет кастомных
  const relativePathPoints = useMemo(() => {
    // Если в конфиге есть кастомные точки - используем их
    if (backgroundImage.pathPoints && backgroundImage.pathPoints.length > 0) {
      return backgroundImage.pathPoints
    }
    // Иначе генерируем авто-волну в относительных координатах
    return generateRelativePathPoints(totalSteps, {
      startY: 0.15,
      endY: 0.85,
      stepOffset,
    })
  }, [backgroundImage.pathPoints, totalSteps, stepOffset])

  const playerStepIndex =
    activeStepIndex == null ? Math.max(totalSteps - 1, 0) : activeStepIndex

  if (!size) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <PathBackgroundImage
        imageUrl={backgroundImage.url}
        pathPoints={relativePathPoints}
        width={size.width}
        height={size.height}
        fitMode={backgroundImage.fitMode ?? 'cover'}
        focalPoint={backgroundImage.focalPoint}
        padding={backgroundImage.padding}
        opacity={backgroundImage.opacity ?? 1}
      >
        {(canvasPoints: PathPoint[]) => (
          <PathContent
            points={canvasPoints}
            width={size.width}
            height={size.height}
            palette={palette}
            totalSteps={totalSteps}
            activeStepIndex={activeStepIndex}
            milestoneSteps={milestoneSteps}
            playerMarker={playerMarker}
            friendMarkers={friendMarkers}
            playerStepIndex={playerStepIndex}
            hasBackgroundImage={true}
            onActiveStepPress={onActiveStepPress}
            onOpenPlayerProfile={onOpenPlayerProfile}
          />
        )}
      </PathBackgroundImage>
    </div>
  )
}
