'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  PILGRIM_MILESTONE_STEPS,
  PILGRIM_WORLD_HEIGHT,
  PILGRIM_WORLD_WIDTH,
  STEPS_PER_LOCATION,
  type PilgrimLocation,
  type PilgrimWorldPoint,
} from './pilgrimConfig'
import { FriendMarker } from './FriendMarker'
import { PlayerMarker } from './PlayerMarker'
import { StepNode, type StepState } from './StepNode'
import { pointsToSvgPath } from './utils'

export interface FriendOnLocation {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  localStep: number
  emphasis: 'default' | 'ahead' | 'behind'
  seed: string
  stackIndex: number
  overflowMastered: number
}

export interface LocationSnapshot {
  location: PilgrimLocation
  locationState: 'completed' | 'current' | 'locked'
  localCompletedSteps: number
  friends: FriendOnLocation[]
}

interface LocationScreenProps {
  className?: string
  locations: LocationSnapshot[]
  currentLocationIndex: number
  playerName: string
  playerInitials: string
  playerAvatarUrl: string | null
  playerOverflowMastered: number
  masteredVerses: number
  topInset: number
  bottomInset: number
  bottomNavHeight?: number
  isJourneyComplete?: boolean
  actionTitle?: string
  onAction?: () => void
  onStepPress?: () => void
}

const CAMERA_FRAME_WIDTH = 580
const CAMERA_FRAME_HEIGHT = 760
const STACK_OFFSETS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: 0 },
  { dx: 28, dy: -8 },
  { dx: -28, dy: -8 },
  { dx: 12, dy: -24 },
  { dx: -12, dy: -24 },
  { dx: 36, dy: -18 },
  { dx: -36, dy: -18 },
  { dx: 0, dy: -32 },
]

function buildLocationBadgeCopy(params: {
  state: 'completed' | 'current' | 'locked'
  isJourneyComplete: boolean
  isFocusedCurrent: boolean
}) {
  if (params.isJourneyComplete && params.state === 'current') {
    return {
      text: 'Финиш',
      background: 'rgba(255, 246, 224, 0.78)',
      color: '#6c5125',
      border: 'rgba(130, 98, 42, 0.18)',
    }
  }
  if (params.state === 'completed') {
    return {
      text: 'Пройдено',
      background: 'rgba(245, 239, 228, 0.72)',
      color: 'rgba(61, 44, 24, 0.8)',
      border: 'rgba(88, 65, 37, 0.12)',
    }
  }
  if (params.state === 'locked') {
    return {
      text: 'Закрыто',
      background: 'rgba(246, 241, 231, 0.48)',
      color: 'rgba(73, 58, 33, 0.72)',
      border: 'rgba(112, 84, 46, 0.12)',
    }
  }
  if (!params.isFocusedCurrent) {
    return {
      text: 'Открыто',
      background: 'rgba(255, 247, 233, 0.72)',
      color: '#674d29',
      border: 'rgba(115, 84, 43, 0.16)',
    }
  }
  return {
    text: 'Текущая',
    background: 'rgba(255, 248, 236, 0.76)',
    color: '#654a26',
    border: 'rgba(115, 84, 43, 0.16)',
  }
}

function resolveStepState(
  locationState: 'completed' | 'current' | 'locked',
  localCompletedSteps: number,
  stepIndex: number,
): StepState {
  if (locationState === 'completed') return 'done'
  if (locationState === 'locked') return 'locked'
  if (localCompletedSteps >= STEPS_PER_LOCATION) return 'done'
  if (stepIndex < localCompletedSteps) return 'done'
  if (stepIndex === localCompletedSteps) return 'active'
  return 'locked'
}

function buildConnectorPath(from: PilgrimWorldPoint, to: PilgrimWorldPoint) {
  const midpoint: PilgrimWorldPoint = {
    x: (from.x + to.x) / 2 + (to.x > from.x ? 44 : -44),
    y: (from.y + to.y) / 2,
  }
  return pointsToSvgPath([from, midpoint, to])
}

function SectionCard({
  children,
  borderColor,
  background,
}: {
  children: React.ReactNode
  borderColor: string
  background: string
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background,
        border: `1px solid ${borderColor}`,
        boxShadow: '0 16px 36px rgba(61,44,24,0.1)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {children}
    </div>
  )
}

function LandmarkButton({
  location,
  state,
  isFocused,
  onClick,
}: {
  location: PilgrimLocation
  state: 'completed' | 'current' | 'locked'
  isFocused: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Этап ${location.index + 1}: ${location.nameRu}`}
      style={{
        position: 'absolute',
        left: location.map.landmark.x,
        top: location.map.landmark.y,
        transform: 'translate(-50%, -50%)',
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        padding: 4,
        background:
          state === 'locked'
            ? 'rgba(255,250,243,0.5)'
            : isFocused
              ? `linear-gradient(180deg, rgba(255,250,239,0.98) 0%, ${location.palette.accent} 100%)`
              : 'rgba(255,249,241,0.84)',
        boxShadow: isFocused
          ? `0 14px 28px ${location.palette.pathGlow}`
          : '0 10px 22px rgba(61,44,24,0.12)',
        cursor: 'pointer',
        zIndex: isFocused ? 10 : 6,
        opacity: state === 'locked' ? 0.56 : 1,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `1px solid ${isFocused ? 'rgba(255,255,255,0.72)' : location.palette.panelBorder}`,
          background: 'rgba(255,251,244,0.96)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3f2c18',
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        {location.index + 1}
      </div>
    </button>
  )
}

export function LocationScreen({
  className,
  locations,
  currentLocationIndex,
  playerName,
  playerInitials,
  playerAvatarUrl,
  playerOverflowMastered,
  masteredVerses,
  topInset,
  bottomInset,
  bottomNavHeight = 68,
  isJourneyComplete = false,
  actionTitle,
  onAction,
  onStepPress,
}: LocationScreenProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [focusedLocationIndex, setFocusedLocationIndex] = useState(currentLocationIndex)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setFocusedLocationIndex(currentLocationIndex)
  }, [currentLocationIndex])

  useEffect(() => {
    const element = rootRef.current
    if (!element) return

    const measure = () => {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize((prev) =>
          prev.width === rect.width && prev.height === rect.height
            ? prev
            : { width: rect.width, height: rect.height },
        )
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const currentSnapshot = locations[currentLocationIndex]!
  const focusedSnapshot = locations[focusedLocationIndex] ?? currentSnapshot
  const focusedLocation = focusedSnapshot.location
  const badge = buildLocationBadgeCopy({
    state: focusedSnapshot.locationState,
    isJourneyComplete,
    isFocusedCurrent: focusedLocationIndex === currentLocationIndex,
  })

  const paths = useMemo(
    () =>
      locations.map((snapshot, index) => ({
        key: snapshot.location.slug,
        state: snapshot.locationState,
        palette: snapshot.location.palette,
        segmentPath: pointsToSvgPath(snapshot.location.map.track),
        connectorPath:
          index < locations.length - 1
            ? buildConnectorPath(
                snapshot.location.map.track[STEPS_PER_LOCATION - 1]!,
                locations[index + 1]!.location.map.track[0]!,
              )
            : '',
      })),
    [locations],
  )

  const currentPlayerPoint = useMemo(() => {
    const currentTrack = currentSnapshot.location.map.track
    const localIndex =
      currentSnapshot.localCompletedSteps >= STEPS_PER_LOCATION
        ? STEPS_PER_LOCATION - 1
        : currentSnapshot.localCompletedSteps
    return currentTrack[Math.max(0, Math.min(STEPS_PER_LOCATION - 1, localIndex))] ?? null
  }, [currentSnapshot])

  const viewportTop = topInset + 104
  const viewportBottom = bottomNavHeight + bottomInset + 92
  const availableHeight = Math.max(viewportSize.height - viewportTop - viewportBottom, 280)
  const cameraTargetX = viewportSize.width / 2
  const cameraTargetY = viewportTop + availableHeight * 0.48
  const frameScaleX = viewportSize.width > 0 ? (viewportSize.width - 28) / CAMERA_FRAME_WIDTH : 0.52
  const frameScaleY = availableHeight / CAMERA_FRAME_HEIGHT
  const baseScale = Math.max(0.38, Math.min(frameScaleX, frameScaleY))
  const scale = baseScale * focusedLocation.map.camera.zoom
  const translateX = cameraTargetX - focusedLocation.map.camera.x * scale
  const translateY = cameraTargetY - focusedLocation.map.camera.y * scale
  const localProgress = Math.min(focusedSnapshot.localCompletedSteps, STEPS_PER_LOCATION)

  return (
    <section
      className={className}
      ref={rootRef}
      style={{
        height: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        background: focusedLocation.palette.background,
        transition: 'background 240ms ease',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 18% 10%, rgba(255,255,255,0.24), transparent 22%),
            radial-gradient(circle at 82% 14%, rgba(255,255,255,0.12), transparent 18%),
            linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(12,8,5,0.18) 100%)
          `,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={false}
          animate={{
            x: translateX,
            y: translateY,
            scale,
          }}
          transition={{
            type: 'spring',
            stiffness: 118,
            damping: 24,
            mass: 0.86,
          }}
          style={{
            position: 'absolute',
            width: PILGRIM_WORLD_WIDTH,
            height: PILGRIM_WORLD_HEIGHT,
            transformOrigin: '0 0',
          }}
        >
          <svg
            aria-hidden
            width={PILGRIM_WORLD_WIDTH}
            height={PILGRIM_WORLD_HEIGHT}
            viewBox={`0 0 ${PILGRIM_WORLD_WIDTH} ${PILGRIM_WORLD_HEIGHT}`}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'visible',
            }}
          >
            {paths.map((entry, index) => {
              const opacity =
                index === focusedLocationIndex ? 1 : entry.state === 'locked' ? 0.28 : 0.54

              return (
                <g key={entry.key} opacity={opacity}>
                  {entry.connectorPath ? (
                    <>
                      <path
                        d={entry.connectorPath}
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth={12}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={entry.connectorPath}
                        stroke="rgba(255,250,240,0.3)"
                        strokeWidth={3}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="3 14"
                      />
                    </>
                  ) : null}

                  <path
                    d={entry.segmentPath}
                    stroke={entry.palette.pathShadow}
                    strokeWidth={14}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={entry.segmentPath}
                    stroke={entry.palette.pathGlow}
                    strokeWidth={8}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={entry.segmentPath}
                    stroke={entry.palette.path}
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )
            })}
          </svg>

          {locations.map((snapshot, locationIndex) => (
            <LandmarkButton
              key={`${snapshot.location.slug}-landmark`}
              location={snapshot.location}
              state={snapshot.locationState}
              isFocused={locationIndex === focusedLocationIndex}
              onClick={() => setFocusedLocationIndex(locationIndex)}
            />
          ))}

          {locations.map((snapshot, locationIndex) =>
            snapshot.location.map.track.map((point, stepIndex) => {
              const stepState = resolveStepState(
                snapshot.locationState,
                snapshot.localCompletedSteps,
                stepIndex,
              )

              return (
                <StepNode
                  key={`${snapshot.location.slug}-${stepIndex}`}
                  state={stepState}
                  xPct={(point.x / PILGRIM_WORLD_WIDTH) * 100}
                  yPct={(point.y / PILGRIM_WORLD_HEIGHT) * 100}
                  palette={snapshot.location.palette}
                  isLocationMilestone={PILGRIM_MILESTONE_STEPS.includes(stepIndex)}
                  onClick={
                    locationIndex === currentLocationIndex && stepState === 'active'
                      ? onStepPress
                      : undefined
                  }
                />
              )
            }),
          )}

          {locations.flatMap((snapshot, locationIndex) =>
            snapshot.friends.map((friend) => {
              const point = snapshot.location.map.track[
                Math.max(0, Math.min(STEPS_PER_LOCATION - 1, friend.localStep))
              ]

              if (!point) return null
              const offset = STACK_OFFSETS[friend.stackIndex % STACK_OFFSETS.length] ?? {
                dx: 0,
                dy: 0,
              }

              return (
                <FriendMarker
                  key={`${locationIndex}-${friend.id}`}
                  name={friend.name}
                  initials={friend.initials}
                  avatarUrl={friend.avatarUrl}
                  xPct={(point.x / PILGRIM_WORLD_WIDTH) * 100}
                  yPct={(point.y / PILGRIM_WORLD_HEIGHT) * 100}
                  offsetX={offset.dx}
                  offsetY={offset.dy}
                  emphasis={friend.emphasis}
                  badgeLabel={friend.overflowMastered > 0 ? `+${friend.overflowMastered}` : null}
                  seed={friend.seed}
                />
              )
            }),
          )}

          {currentPlayerPoint && (playerInitials || playerAvatarUrl) ? (
            <PlayerMarker
              name={playerName}
              initials={playerInitials}
              avatarUrl={playerAvatarUrl}
              badgeLabel={playerOverflowMastered > 0 ? `+${playerOverflowMastered}` : null}
              xPct={(currentPlayerPoint.x / PILGRIM_WORLD_WIDTH) * 100}
              yPct={(currentPlayerPoint.y / PILGRIM_WORLD_HEIGHT) * 100}
            />
          ) : null}
        </motion.div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: topInset + 12,
          left: 14,
          right: 14,
          zIndex: 20,
        }}
      >
        <SectionCard
          borderColor={focusedLocation.palette.panelBorder}
          background={focusedLocation.palette.panel}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.18,
                  color: 'rgba(61, 44, 24, 0.52)',
                }}
              >
                Этап {focusedLocation.index + 1}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 30,
                  fontWeight: 900,
                  color: '#322214',
                  lineHeight: 1,
                }}
              >
                {focusedLocation.nameRu}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(57, 41, 23, 0.62)',
                }}
              >
                {localProgress}/{STEPS_PER_LOCATION} · {masteredVerses}/{STEPS_PER_LOCATION * locations.length}
              </div>
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                background: badge.background,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              {badge.text}
            </div>
          </div>
        </SectionCard>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: bottomNavHeight + bottomInset + 12,
          zIndex: 20,
        }}
      >
        <SectionCard
          borderColor={focusedLocation.palette.panelBorder}
          background={focusedLocation.palette.panel}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: 6,
            }}
          >
            {Array.from({ length: STEPS_PER_LOCATION }, (_, index) => {
              const state = resolveStepState(
                focusedSnapshot.locationState,
                focusedSnapshot.localCompletedSteps,
                index,
              )
              return (
                <div
                  key={`progress-segment-${index}`}
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background:
                      state === 'done'
                        ? focusedLocation.palette.accent
                        : state === 'active'
                          ? `linear-gradient(90deg, ${focusedLocation.palette.accent} 0%, #fff0d1 100%)`
                          : 'rgba(73,55,29,0.12)',
                    boxShadow:
                      state === 'active'
                        ? `0 0 0 3px ${focusedLocation.palette.accentSoft}`
                        : 'none',
                  }}
                />
              )
            })}
          </div>

          {focusedLocationIndex !== currentLocationIndex ? (
            <button
              type="button"
              onClick={() => setFocusedLocationIndex(currentLocationIndex)}
              style={{
                marginTop: 14,
                width: '100%',
                border: `1px solid ${focusedLocation.palette.panelBorder}`,
                borderRadius: 18,
                padding: '13px 16px',
                background: 'rgba(255,255,255,0.18)',
                color: '#3d2b18',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              К текущей локации
            </button>
          ) : null}

          {focusedLocationIndex === currentLocationIndex && onAction && actionTitle ? (
            <button
              type="button"
              onClick={onAction}
              style={{
                marginTop: 14,
                width: '100%',
                border: 'none',
                borderRadius: 18,
                padding: '14px 18px',
                background: `linear-gradient(180deg, ${focusedLocation.palette.accent} 0%, #4a331b 100%)`,
                boxShadow: `0 16px 30px ${focusedLocation.palette.pathGlow}`,
                color: '#fff7ea',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              {actionTitle}
            </button>
          ) : null}
        </SectionCard>
      </div>
    </section>
  )
}
