'use client'

import React from 'react'
import type { PilgrimLocation } from './pilgrimConfig'
import {
  PILGRIM_MILESTONE_STEPS,
  STEPS_PER_LOCATION,
} from './pilgrimConfig'
import { WindingPath, type RaceTrackMarker } from './WindingPath'

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

interface LocationScreenProps {
  location: PilgrimLocation
  locationState: 'completed' | 'current' | 'locked'
  localCompletedSteps: number
  playerName: string
  playerInitials: string
  playerAvatarUrl: string | null
  playerOverflowMastered: number
  friends: FriendOnLocation[]
  streakDays?: number
  weeklyRepetitions: number
  ratingPercent: number
  rank: number | null
  masteredVerses: number
  totalVerses: number
  topInset: number
  bottomInset: number
  bottomNavHeight?: number
  isJourneyComplete?: boolean
  actionTitle?: string
  actionHint?: string
  onAction?: () => void
  onStepPress?: () => void
}

function buildLocationBadgeCopy(params: {
  state: 'completed' | 'current' | 'locked'
  isJourneyComplete: boolean
}) {
  if (params.isJourneyComplete && params.state === 'current') {
    return {
      text: 'Финиш',
      background: 'rgba(255, 245, 222, 0.64)',
      color: '#6d5127',
      border: 'rgba(130, 98, 42, 0.18)',
    }
  }
  if (params.state === 'completed') {
    return {
      text: 'Пройдено',
      background: 'rgba(246, 240, 228, 0.44)',
      color: 'rgba(61, 44, 24, 0.78)',
      border: 'rgba(88, 65, 37, 0.12)',
    }
  }
  if (params.state === 'locked') {
    return {
      text: 'Закрыто',
      background: 'rgba(249, 243, 233, 0.18)',
      color: 'rgba(255, 247, 236, 0.75)',
      border: 'rgba(255, 247, 236, 0.12)',
    }
  }
  return {
    text: 'Текущая',
    background: 'rgba(255, 248, 236, 0.56)',
    color: '#654a26',
    border: 'rgba(115, 84, 43, 0.16)',
  }
}

function LockOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    />
  )
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
        boxShadow: '0 18px 38px rgba(73,52,28,0.12)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {children}
    </div>
  )
}

export function LocationScreen({
  location,
  locationState,
  localCompletedSteps,
  playerName,
  playerInitials,
  playerAvatarUrl,
  playerOverflowMastered,
  friends,
  // streakDays = 0,
  // weeklyRepetitions,
  // ratingPercent,
  // rank,
  masteredVerses: _masteredVerses,
  totalVerses: _totalVerses,
  topInset,
  bottomInset,
  bottomNavHeight = 68,
  isJourneyComplete = false,
  actionTitle,
  actionHint,
  onAction,
  onStepPress,
}: LocationScreenProps) {
  const isLocked = locationState === 'locked'
  const isCurrent = locationState === 'current'
  const activeStepIndex = localCompletedSteps >= STEPS_PER_LOCATION ? null : localCompletedSteps
  const badge = buildLocationBadgeCopy({
    state: locationState,
    isJourneyComplete,
  })

  const friendMarkers: RaceTrackMarker[] = friends.map((friend) => ({
    id: friend.id,
    name: friend.name,
    initials: friend.initials,
    avatarUrl: friend.avatarUrl,
    stepIndex: Math.max(0, Math.min(STEPS_PER_LOCATION - 1, friend.localStep)),
    emphasis: friend.emphasis,
    stackIndex: friend.stackIndex,
    seed: friend.seed,
    badgeLabel: friend.overflowMastered > 0 ? `+${friend.overflowMastered}` : null,
  }))

  return (
    <section
      style={{
        height: '100dvh',
        zIndex: 0,
        position: 'relative',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        flexShrink: 0,
        background: location.palette.background,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 15% 18%, rgba(255,255,255,0.26), transparent 26%),
            radial-gradient(circle at 82% 10%, rgba(255,255,255,0.16), transparent 24%),
            radial-gradient(circle at 50% 100%, rgba(58,39,19,0.16), transparent 42%),
            linear-gradient(180deg, rgba(18,12,8,0.06) 0%, rgba(18,12,8,0.18) 58%, rgba(18,12,8,0.34) 100%)
          `,
        }}
      />

      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: -40,
          right: -40,
          bottom: -120,
          height: 240,
          background:
            'radial-gradient(circle at 50% 20%, rgba(71, 49, 23, 0.22), rgba(71, 49, 23, 0) 68%)',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: topInset + 12,
          left: 14,
          right: 14,
          zIndex: 12,
          display: 'grid',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <SectionCard
            borderColor={location.palette.panelBorder}
            background={location.palette.panel}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.18,
                        color: 'rgba(61, 44, 24, 0.54)',
                      }}
                    >
                      Этап {location.index + 1}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 24,
                        fontWeight: 800,
                        color: '#322214',
                      }}
                    >
                      {location.nameRu}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: badge.background,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {badge.text}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 10,
              }}
            />
          </SectionCard>
        </div>

        {/* {isCurrent ? (
          <div style={{ pointerEvents: 'auto' }}>
            <SectionCard
              borderColor={location.palette.panelBorder}
              background={location.palette.panel}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: location.palette.badgeBg,
                    border: `1px solid ${location.palette.badgeBorder}`,
                    color: '#4d371d',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Рейтинг {ratingPercent}%
                </div>
                {rank != null ? (
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: location.palette.badgeBg,
                      border: `1px solid ${location.palette.badgeBorder}`,
                      color: '#4d371d',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Место #{rank}
                  </div>
                ) : null}
                {streakDays > 0 ? (
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: location.palette.badgeBg,
                      border: `1px solid ${location.palette.badgeBorder}`,
                      color: '#4d371d',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Серия {streakDays} дн
                  </div>
                ) : null}
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: location.palette.badgeBg,
                    border: `1px solid ${location.palette.badgeBorder}`,
                    color: '#4d371d',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Повторений за 7 дн {weeklyRepetitions}
                </div>
                {playerOverflowMastered > 0 ? (
                  <div
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: location.palette.badgeBg,
                      border: `1px solid ${location.palette.badgeBorder}`,
                      color: '#4d371d',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Сверх финиша +{playerOverflowMastered}
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>
        ) : null} */}
      </div>

      <div
        style={{
          position: 'absolute',
          top: topInset,
          left: 0,
          right: 0,
          bottom: bottomNavHeight + bottomInset,
          zIndex: 1,
          opacity: isLocked ? 0.46 : 1,
          transition: 'opacity 0.25s ease',
        }}
      >
        <WindingPath
          totalSteps={STEPS_PER_LOCATION}
          activeStepIndex={activeStepIndex}
          stepOffset={location.index * STEPS_PER_LOCATION}
          palette={location.palette}
          backgroundImage={location.backgroundImage!}
          playerMarker={
            isLocked || (!playerInitials && !playerAvatarUrl)
              ? null
              : {
                  name: playerName,
                  initials: playerInitials,
                  avatarUrl: playerAvatarUrl,
                  badgeLabel: playerOverflowMastered > 0 ? `+${playerOverflowMastered}` : null,
                }
          }
          friendMarkers={friendMarkers}
          milestoneSteps={PILGRIM_MILESTONE_STEPS}
          onActiveStepPress={onStepPress}
        />
      </div>

      {isLocked ? <LockOverlay /> : null}

      {/* Нижняя панель поверх картинки */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: bottomNavHeight + bottomInset + 12,
          zIndex: 12,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <SectionCard
            borderColor={location.palette.panelBorder}
            background={location.palette.panel}
          >
            {/* <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              {friends.length > 0 ? (
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: location.palette.badgeBg,
                    border: `1px solid ${location.palette.badgeBorder}`,
                    color: '#4d371d',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Попутчики {friends.length}
                </div>
              ) : null}
            </div> */}

            {isCurrent && onAction && actionTitle ? (
              <button
                type="button"
                onClick={onAction}
                style={{
                  marginTop: 14,
                  width: '100%',
                  border: 'none',
                  borderRadius: 18,
                  padding: '14px 18px',
                  background: `linear-gradient(180deg, ${location.palette.accent} 0%, #4c3318 100%)`,
                  boxShadow: `0 18px 28px ${location.palette.pathGlow}`,
                  color: '#fff7ea',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                  }}
                >
                  {actionTitle}
                </div>
                {actionHint ? (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: 'rgba(255, 244, 227, 0.78)',
                    }}
                  >
                    {actionHint}
                  </div>
                ) : null}
              </button>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </section>
  )
}
