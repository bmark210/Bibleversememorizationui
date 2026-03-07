export const LOCATIONS = [
  { id: 0, threshold: 0,  label: 'Странник',  emoji: '🌱', steps: 5 },
  { id: 1, threshold: 15, label: 'Поляна',    emoji: '⛺', steps: 6 },
  { id: 2, threshold: 30, label: 'Долина',    emoji: '🏕️', steps: 7 },
  { id: 3, threshold: 45, label: 'Перевал',   emoji: '🗻', steps: 6 },
  { id: 4, threshold: 60, label: 'Высота',    emoji: '⛰️', steps: 8 },
  { id: 5, threshold: 75, label: 'Цитадель',  emoji: '🏯', steps: 7 },
  { id: 6, threshold: 90, label: 'Вершина',   emoji: '⭐', steps: 5 },
] as const

export type LocationId = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type LocationState = 'completed' | 'current' | 'locked'
export type Location = typeof LOCATIONS[number]

export const LOCATION_THEMES = [
  // 0 — Странник: рассветные луга
  {
    bg: 'linear-gradient(180deg, #87CEEB 0%, #98D8A0 45%, #6BAF72 100%)',
    heroFallback: '#87CEEB',
    pathColor: '#F5DEB3',
    stepBg: '#ffffff',
    accentColor: '#4CAF50',
    nodeGlow: '#81C784',
    fadeStart: '#87CEEB',
  },
  // 1 — Поляна: солнечный лес
  {
    bg: 'linear-gradient(180deg, #A8D5A2 0%, #6BAF72 40%, #4A8C56 100%)',
    heroFallback: '#A8D5A2',
    pathColor: '#DEB887',
    stepBg: '#F1F8E9',
    accentColor: '#388E3C',
    nodeGlow: '#AED581',
    fadeStart: '#A8D5A2',
  },
  // 2 — Долина: густой лес
  {
    bg: 'linear-gradient(180deg, #5A8C6E 0%, #3D6B52 50%, #2C5041 100%)',
    heroFallback: '#5A8C6E',
    pathColor: '#C8A96E',
    stepBg: '#E8F5E9',
    accentColor: '#66BB6A',
    nodeGlow: '#A5D6A7',
    fadeStart: '#5A8C6E',
  },
  // 3 — Перевал: предгорье, туман
  {
    bg: 'linear-gradient(180deg, #78909C 0%, #546E7A 45%, #37474F 100%)',
    heroFallback: '#78909C',
    pathColor: '#B0BEC5',
    stepBg: '#ECEFF1',
    accentColor: '#80CBC4',
    nodeGlow: '#80DEEA',
    fadeStart: '#78909C',
  },
  // 4 — Высота: скалы и облака
  {
    bg: 'linear-gradient(180deg, #B0BEC5 0%, #78909C 40%, #546E7A 100%)',
    heroFallback: '#B0BEC5',
    pathColor: '#CFD8DC',
    stepBg: '#F5F5F5',
    accentColor: '#4FC3F7',
    nodeGlow: '#81D4FA',
    fadeStart: '#B0BEC5',
  },
  // 5 — Цитадель: пурпурные скалы
  {
    bg: 'linear-gradient(180deg, #7E57C2 0%, #5E35B1 45%, #3949AB 100%)',
    heroFallback: '#7E57C2',
    pathColor: '#CE93D8',
    stepBg: '#EDE7F6',
    accentColor: '#CE93D8',
    nodeGlow: '#B39DDB',
    fadeStart: '#7E57C2',
  },
  // 6 — Вершина: снег и золото
  {
    bg: 'linear-gradient(180deg, #E3F2FD 0%, #BBDEFB 40%, #90CAF9 100%)',
    heroFallback: '#E3F2FD',
    pathColor: '#FFD54F',
    stepBg: '#FFFDE7',
    accentColor: '#FFB300',
    nodeGlow: '#FFE082',
    fadeStart: '#E3F2FD',
  },
] as const

export type LocationTheme = typeof LOCATION_THEMES[number]

export function getLocationState(locIndex: number, userScore: number): LocationState {
  const loc = LOCATIONS[locIndex]
  if (!loc) return 'locked'
  const nextLoc = LOCATIONS[locIndex + 1]
  const nextThreshold = nextLoc?.threshold ?? 101
  if (userScore >= nextThreshold) return 'completed'
  if (userScore >= loc.threshold) return 'current'
  return 'locked'
}

export function getLocationProgress(locIndex: number, userScore: number): number {
  const loc = LOCATIONS[locIndex]
  const nextLoc = LOCATIONS[locIndex + 1]
  if (!loc || !nextLoc) return 1
  return Math.min(1, Math.max(0, (userScore - loc.threshold) / (nextLoc.threshold - loc.threshold)))
}

export function getActiveStepIndex(locIndex: number, userScore: number, steps: number): number {
  const state = getLocationState(locIndex, userScore)
  if (state === 'locked') return -1
  if (state === 'completed') return steps - 1
  const progress = getLocationProgress(locIndex, userScore)
  return Math.min(steps - 1, Math.floor(progress * steps))
}
