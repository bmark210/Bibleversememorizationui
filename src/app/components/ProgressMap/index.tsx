'use client'

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import type { DashboardLeaderboard } from '@/api/services/leaderboard'
import type { FriendPlayerListItem } from '@/api/services/friends'
import type { UserDashboardStats } from '@/api/services/userStats'
import { useTelegramSafeArea } from '@/app/hooks/useTelegramSafeArea'
import { triggerHaptic } from '@/app/lib/haptics'
import { toast } from '@/app/lib/toast'
import {
  PILGRIM_LOCATIONS,
  getCurrentLocation,
  masteredToLocationIndex,
} from './pilgrimConfig'
import {
  buildProgressMapViewModel,
  countPassedFriends,
  getLocationStateSnapshot,
  type ProgressMapAction,
} from './model'
import { LocationScreen } from './LocationScreen'

type ProgressMapVerse = {
  externalVerseId: string
  status: string
  nextReviewAt: string | null
}

export type { ProgressMapAction } from './model'

export interface ProgressMapProps {
  className?: string
  dashboardStats: UserDashboardStats | null
  dashboardLeaderboard: DashboardLeaderboard | null
  trainingVerses: ProgressMapVerse[]
  friendsOnMap: FriendPlayerListItem[]
  isLoading?: boolean
  isFriendsLoading?: boolean
  onAction: (action: ProgressMapAction) => void
}

function ProgressMapSkeleton() {
  return (
    <div
      style={{
        height: '100dvh',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--background) 86%, #ffffff 14%) 0%, color-mix(in srgb, var(--card) 92%, #000000 8%) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid rgba(95,79,45,0.18)',
          borderTopColor: 'rgba(95,79,45,0.8)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  )
}

export function ProgressMap({
  className,
  dashboardStats,
  dashboardLeaderboard,
  trainingVerses,
  friendsOnMap,
  isLoading = false,
  isFriendsLoading: _isFriendsLoading = false,
  onAction,
}: ProgressMapProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea()
  const topInset = contentSafeAreaInset.top
  const bottomInset = contentSafeAreaInset.bottom

  const viewModel = useMemo(
    () =>
      buildProgressMapViewModel({
        dashboardStats,
        dashboardLeaderboard,
        trainingVerses,
        friendsOnMap,
      }),
    [dashboardLeaderboard, dashboardStats, friendsOnMap, trainingVerses],
  )

  const prevLocationRef = useRef<number | null>(null)
  const prevMasteredRef = useRef<number | null>(null)

  useEffect(() => {
    const previousLocation = prevLocationRef.current
    const previousMasteredVerses = prevMasteredRef.current

    if (previousLocation == null || previousMasteredVerses == null) {
      prevLocationRef.current = viewModel.currentLocationIndex
      prevMasteredRef.current = viewModel.masteredVerses
      return
    }

    if (viewModel.currentLocationIndex > previousLocation) {
      const location = getCurrentLocation(viewModel.masteredVerses)
      triggerHaptic('success')
      toast.success(`Открыта локация «${location.emoji} ${location.nameRu}»`)
    } else if (viewModel.masteredVerses > previousMasteredVerses) {
      const passedFriends = countPassedFriends({
        previousMasteredVerses,
        currentMasteredVerses: viewModel.masteredVerses,
        friendsOnMap,
      })
      if (passedFriends > 0) {
        triggerHaptic('success')
        toast.success(
          passedFriends === 1
            ? 'Вы обошли попутчика'
            : `Вы обошли ${passedFriends} попутчиков`,
        )
      }
    }

    prevLocationRef.current = viewModel.currentLocationIndex
    prevMasteredRef.current = viewModel.masteredVerses
  }, [friendsOnMap, viewModel.currentLocationIndex, viewModel.masteredVerses])

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const didAutoScrollRef = useRef(false)

  useEffect(() => {
    if (didAutoScrollRef.current) return
    if (viewModel.masteredVerses === 0) return
    const container = scrollContainerRef.current
    if (!container) return

    didAutoScrollRef.current = true
    const timeoutId = window.setTimeout(() => {
      container.scrollTo({
        top: masteredToLocationIndex(viewModel.masteredVerses) * window.innerHeight,
        behavior: 'smooth',
      })
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [viewModel.masteredVerses])

  const handlePrimaryAction = useCallback(() => {
    triggerHaptic('medium')
    onAction(viewModel.primaryAction)
  }, [onAction, viewModel.primaryAction])

  if (isLoading && !dashboardStats && !dashboardLeaderboard) {
    return <ProgressMapSkeleton />
  }

  return (
    <div
      className={className}
      ref={scrollContainerRef}
      style={{
        height: '100dvh',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {PILGRIM_LOCATIONS.map((location, locationIndex) => {
        const snapshot = getLocationStateSnapshot(locationIndex, viewModel.masteredVerses)
        const isCurrent = locationIndex === viewModel.currentLocationIndex
        const friends = viewModel.friendsByLocation.get(locationIndex) ?? []

        return (
          <LocationScreen
            key={location.slug}
            location={location}
            locationState={snapshot.state}
            localCompletedSteps={snapshot.localCompletedSteps}
            playerName={viewModel.playerName}
            playerInitials={isCurrent ? viewModel.playerInitials : ''}
            playerAvatarUrl={isCurrent ? viewModel.playerAvatarUrl : null}
            playerOverflowMastered={isCurrent ? viewModel.overflowMastered : 0}
            friends={friends}
            streakDays={viewModel.streakDays}
            weeklyRepetitions={viewModel.weeklyRepetitions}
            ratingPercent={viewModel.ratingPercent}
            rank={viewModel.rank}
            masteredVerses={viewModel.masteredVerses}
            totalVerses={viewModel.totalVerses}
            topInset={topInset}
            bottomInset={bottomInset}
            isJourneyComplete={viewModel.isJourneyComplete}
            actionTitle={isCurrent ? viewModel.actionTitle : undefined}
            actionHint={isCurrent ? viewModel.actionHint : undefined}
            onAction={isCurrent ? handlePrimaryAction : undefined}
            onStepPress={isCurrent ? () => triggerHaptic('light') : undefined}
          />
        )
      })}

      <style>{`
        div::-webkit-scrollbar { display: none; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
