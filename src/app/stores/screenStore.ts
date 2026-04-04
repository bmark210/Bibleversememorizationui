'use client'

import { create } from 'zustand'
import type { DirectLaunchVerse } from '@/app/components/Training/types'
import type { Verse } from '@/app/domain/verse'
import type { AppRootPage, PendingVerseListReturn } from '@/app/domain/appPages'
import { toDirectLaunchPayload } from '@/app/utils/directLaunch'

interface ScreenStore {
  active: AppRootPage
  history: AppRootPage[]
  trainingDirectLaunch: DirectLaunchVerse | null
  pendingVerseListReturn: PendingVerseListReturn | null

  /** Root navigation — resets history, clears training state */
  go: (screen: AppRootPage) => void
  /** Push on top of history stack (mobile-style sub-navigation) */
  push: (screen: AppRootPage) => void
  /** Pop the history stack */
  back: () => void
  /** Navigate to Training with a specific verse as direct launch */
  navigateToTrainingWithVerse: (launchOrVerse: DirectLaunchVerse | Verse) => void
  /** Called when Training's direct-launch session ends */
  onDirectLaunchExit: (launch: DirectLaunchVerse) => void
  /** Called after VerseList consumes the pending return filter */
  onVerseListReturnHandled: () => void
}

export const useScreenStore = create<ScreenStore>((set, get) => ({
  active: 'dashboard',
  history: [],
  trainingDirectLaunch: null,
  pendingVerseListReturn: null,

  go: (screen) =>
    set((s) => {
      if (s.active === screen && s.history.length === 0) return s
      return {
        active: screen,
        history: [],
        trainingDirectLaunch: null,
        pendingVerseListReturn: null,
      }
    }),

  push: (screen) =>
    set((s) => {
      if (s.active === screen) return s
      return { history: [...s.history, s.active], active: screen }
    }),

  back: () =>
    set((s) => {
      if (s.history.length === 0) return s
      return {
        active: s.history.at(-1) ?? 'dashboard',
        history: s.history.slice(0, -1),
      }
    }),

  navigateToTrainingWithVerse: (launchOrVerse) => {
    const launch = toDirectLaunchPayload(launchOrVerse)
    set({ pendingVerseListReturn: null, trainingDirectLaunch: launch })
    get().push('training')
  },

  onDirectLaunchExit: (launch) => {
    const returnTarget = launch.returnTarget ?? { kind: 'training-hub' as const }
    set({ trainingDirectLaunch: null })

    if (returnTarget.kind !== 'verse-list') return

    const pending: PendingVerseListReturn = { statusFilter: returnTarget.statusFilter }

    set((s) => {
      if (s.active !== 'training') {
        return { pendingVerseListReturn: pending, active: 'verses', history: [] }
      }
      const prevPage = s.history.at(-1)
      if (prevPage === 'verses') {
        return {
          pendingVerseListReturn: pending,
          active: 'verses',
          history: s.history.slice(0, -1),
        }
      }
      return { pendingVerseListReturn: pending, active: 'verses', history: [] }
    })
  },

  onVerseListReturnHandled: () => set({ pendingVerseListReturn: null }),
}))
