'use client'

import { create } from 'zustand'
import type { DirectLaunchVerse } from '@/app/components/Training/types'
import type { AppRootPage, PendingTextBoxReturn } from '@/app/domain/appPages'
import type { TrainingBoxScope } from '@/app/types/textBox'

interface ScreenStore {
  active: AppRootPage
  history: AppRootPage[]
  trainingDirectLaunch: DirectLaunchVerse | null
  trainingBoxScope: TrainingBoxScope | null
  pendingTextBoxReturn: PendingTextBoxReturn | null

  go: (screen: AppRootPage) => void
  push: (screen: AppRootPage) => void
  back: () => void
  navigateToTrainingWithVerse: (launch: DirectLaunchVerse) => void
  navigateToTrainingHub: () => void
  navigateToTrainingBox: (scope: TrainingBoxScope) => void
  setTrainingBoxScope: (scope: TrainingBoxScope | null) => void
  onDirectLaunchExit: (launch: DirectLaunchVerse) => void
  onTextBoxReturnHandled: () => void
}

export const useScreenStore = create<ScreenStore>((set, get) => ({
  active: 'dashboard',
  history: [],
  trainingDirectLaunch: null,
  trainingBoxScope: null,
  pendingTextBoxReturn: null,

  go: (screen) =>
    set((s) => {
      if (s.active === screen && s.history.length === 0) return s
      return {
        active: screen,
        history: [],
        trainingDirectLaunch: null,
        trainingBoxScope: null,
        pendingTextBoxReturn: null,
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

  navigateToTrainingWithVerse: (launch) => {
    set({
      pendingTextBoxReturn: null,
      trainingBoxScope: launch.scope,
      trainingDirectLaunch: launch,
    })
    get().push('training')
  },

  navigateToTrainingHub: () => {
    set({
      pendingTextBoxReturn: null,
      trainingDirectLaunch: null,
      trainingBoxScope: null,
    })
    get().push('training')
  },

  navigateToTrainingBox: (scope) => {
    set({
      pendingTextBoxReturn: null,
      trainingDirectLaunch: null,
      trainingBoxScope: scope,
    })
    get().push('training')
  },

  setTrainingBoxScope: (scope) => set({ trainingBoxScope: scope }),

  onDirectLaunchExit: (launch) => {
    const returnTarget = launch.returnTarget ?? { kind: 'training-hub' as const }
    set({ trainingDirectLaunch: null })

    if (returnTarget.kind !== 'text-box') return

    const pending: PendingTextBoxReturn = {
      boxId: returnTarget.boxId,
      boxTitle: returnTarget.boxTitle,
    }

    set((s) => {
      if (s.active !== 'training') {
        return {
          pendingTextBoxReturn: pending,
          trainingBoxScope: { boxId: returnTarget.boxId, boxTitle: returnTarget.boxTitle },
          active: 'verses',
          history: [],
        }
      }
      const prevPage = s.history.at(-1)
      if (prevPage === 'verses') {
        return {
          pendingTextBoxReturn: pending,
          trainingBoxScope: { boxId: returnTarget.boxId, boxTitle: returnTarget.boxTitle },
          active: 'verses',
          history: s.history.slice(0, -1),
        }
      }
      return {
        pendingTextBoxReturn: pending,
        trainingBoxScope: { boxId: returnTarget.boxId, boxTitle: returnTarget.boxTitle },
        active: 'verses',
        history: [],
      }
    })
  },

  onTextBoxReturnHandled: () => set({ pendingTextBoxReturn: null }),
}))
