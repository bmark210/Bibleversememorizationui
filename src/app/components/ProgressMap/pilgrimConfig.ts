export interface PilgrimLocationPalette {
  background: string
  panel: string
  panelBorder: string
  accent: string
  accentSoft: string
  path: string
  pathGlow: string
  pathShadow: string
  badgeBg: string
  badgeBorder: string
}

export interface PilgrimWorldPoint {
  x: number
  y: number
}

export interface PilgrimLocationCamera {
  x: number
  y: number
  zoom: number
}

export interface PilgrimLocationLandmark {
  x: number
  y: number
}

export interface PilgrimLocationMap {
  track: PilgrimWorldPoint[]
  camera: PilgrimLocationCamera
  landmark: PilgrimLocationLandmark
}

// Legacy types kept for compatibility with older path/image components.
export interface PilgrimLocationPathPoint {
  x: number
  y: number
}

export interface PilgrimLocationBackgroundImage {
  url: string
  pathPoints?: PilgrimLocationPathPoint[]
  fitMode?: 'cover' | 'contain' | 'fill'
  focalPoint?: { x: number; y: number }
  roadStartY?: number
  roadEndY?: number
  padding?: { top: number; bottom: number; left: number; right: number }
  horizontalScale?: number
  opacity?: number
}

export interface PilgrimLocation {
  index: number
  slug: string
  nameRu: string
  emoji: string
  palette: PilgrimLocationPalette
  map: PilgrimLocationMap
  backgroundImage?: PilgrimLocationBackgroundImage
}

export const STEPS_PER_LOCATION = 12
export const MAP_MAX_MASTERED = 96
export const PILGRIM_TOTAL_STEPS = MAP_MAX_MASTERED
export const PILGRIM_WORLD_WIDTH = 1000
export const PILGRIM_WORLD_HEIGHT = 6760

const LOCATION_STEP_GAP = 58

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildLocationMap(config: {
  topY: number
  baseX: number
  xOffsets: number[]
  zoom: number
}): PilgrimLocationMap {
  const track = config.xOffsets.map((offset, index) => ({
    x: config.baseX + offset,
    y: config.topY + index * LOCATION_STEP_GAP,
  }))

  const centerX = average(track.map((point) => point.x))
  const centerY = average(track.map((point) => point.y))
  const anchor = track[0] ?? { x: config.baseX, y: config.topY }

  return {
    track,
    camera: {
      x: centerX,
      y: centerY,
      zoom: config.zoom,
    },
    landmark: {
      x: anchor.x,
      y: anchor.y - 108,
    },
  }
}

export const PILGRIM_LOCATIONS: PilgrimLocation[] = [
  {
    index: 0,
    slug: 'nazareth',
    nameRu: 'Назарет',
    emoji: '🌄',
    palette: {
      background: 'linear-gradient(180deg, #f2ebdd 0%, #dfcfb0 58%, #8d7047 100%)',
      panel: 'linear-gradient(180deg, rgba(249,243,232,0.92) 0%, rgba(235,221,193,0.8) 100%)',
      panelBorder: 'rgba(98, 74, 44, 0.18)',
      accent: '#775933',
      accentSoft: 'rgba(119, 89, 51, 0.14)',
      path: 'rgba(250, 244, 232, 0.96)',
      pathGlow: 'rgba(198, 160, 104, 0.28)',
      pathShadow: 'rgba(95, 68, 34, 0.18)',
      badgeBg: 'rgba(255, 249, 238, 0.76)',
      badgeBorder: 'rgba(116, 86, 49, 0.14)',
    },
    map: buildLocationMap({
      topY: 240,
      baseX: 470,
      xOffsets: [-18, 32, 86, 116, 92, 42, -14, -70, -110, -88, -32, 24],
      zoom: 1.02,
    }),
    backgroundImage: {
      url: '/images/locations/1.png',
      pathPoints: [
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
        { x: 0.53, y: 0.32 },
      ],
      fitMode: 'cover',
      focalPoint: { x: 0.53, y: 0.32 },
    },
  },
  {
    index: 1,
    slug: 'galilee',
    nameRu: 'Галилея',
    emoji: '🌾',
    palette: {
      background: 'linear-gradient(180deg, #efe5d5 0%, #d8c4a3 56%, #756541 100%)',
      panel: 'linear-gradient(180deg, rgba(248,240,227,0.9) 0%, rgba(229,211,180,0.78) 100%)',
      panelBorder: 'rgba(101, 84, 51, 0.16)',
      accent: '#7c643e',
      accentSoft: 'rgba(124, 100, 62, 0.14)',
      path: 'rgba(250, 244, 233, 0.94)',
      pathGlow: 'rgba(188, 158, 101, 0.28)',
      pathShadow: 'rgba(81, 66, 35, 0.18)',
      badgeBg: 'rgba(252, 246, 236, 0.72)',
      badgeBorder: 'rgba(112, 90, 55, 0.14)',
    },
    map: buildLocationMap({
      topY: 1020,
      baseX: 542,
      xOffsets: [24, 72, 110, 92, 44, -12, -66, -108, -118, -78, -18, 36],
      zoom: 1.03,
    }),
  },
  {
    index: 2,
    slug: 'samaria',
    nameRu: 'Самария',
    emoji: '🫒',
    palette: {
      background: 'linear-gradient(180deg, #e8e3d8 0%, #b9b28f 56%, #5d6550 100%)',
      panel: 'linear-gradient(180deg, rgba(244,240,230,0.9) 0%, rgba(216,212,194,0.76) 100%)',
      panelBorder: 'rgba(72, 80, 52, 0.18)',
      accent: '#616947',
      accentSoft: 'rgba(97, 105, 71, 0.15)',
      path: 'rgba(246, 243, 235, 0.9)',
      pathGlow: 'rgba(130, 142, 101, 0.26)',
      pathShadow: 'rgba(52, 57, 39, 0.18)',
      badgeBg: 'rgba(244, 242, 235, 0.68)',
      badgeBorder: 'rgba(86, 92, 65, 0.14)',
    },
    map: buildLocationMap({
      topY: 1800,
      baseX: 452,
      xOffsets: [-26, 24, 76, 112, 94, 48, -6, -62, -104, -118, -72, -10],
      zoom: 1.04,
    }),
  },
  {
    index: 3,
    slug: 'bethlehem',
    nameRu: 'Вифлеем',
    emoji: '⭐',
    palette: {
      background: 'linear-gradient(180deg, #f4ecdc 0%, #dcc294 56%, #816536 100%)',
      panel: 'linear-gradient(180deg, rgba(249,242,227,0.92) 0%, rgba(232,210,168,0.78) 100%)',
      panelBorder: 'rgba(117, 85, 36, 0.18)',
      accent: '#926a2c',
      accentSoft: 'rgba(146, 106, 44, 0.14)',
      path: 'rgba(253, 246, 229, 0.95)',
      pathGlow: 'rgba(214, 175, 101, 0.28)',
      pathShadow: 'rgba(96, 66, 22, 0.18)',
      badgeBg: 'rgba(255, 247, 228, 0.72)',
      badgeBorder: 'rgba(131, 94, 39, 0.14)',
    },
    map: buildLocationMap({
      topY: 2580,
      baseX: 556,
      xOffsets: [18, 62, 104, 114, 70, 18, -42, -96, -114, -82, -28, 18],
      zoom: 1.03,
    }),
  },
  {
    index: 4,
    slug: 'jericho',
    nameRu: 'Иерихон',
    emoji: '🏛️',
    palette: {
      background: 'linear-gradient(180deg, #eedfcd 0%, #cca075 54%, #77472d 100%)',
      panel: 'linear-gradient(180deg, rgba(247,238,227,0.9) 0%, rgba(227,193,168,0.76) 100%)',
      panelBorder: 'rgba(114, 66, 37, 0.18)',
      accent: '#8d5428',
      accentSoft: 'rgba(141, 84, 40, 0.14)',
      path: 'rgba(251, 241, 228, 0.92)',
      pathGlow: 'rgba(208, 127, 84, 0.28)',
      pathShadow: 'rgba(82, 42, 21, 0.18)',
      badgeBg: 'rgba(253, 244, 234, 0.68)',
      badgeBorder: 'rgba(124, 72, 39, 0.14)',
    },
    map: buildLocationMap({
      topY: 3360,
      baseX: 464,
      xOffsets: [-22, 20, 68, 102, 88, 36, -18, -72, -106, -94, -38, 8],
      zoom: 1.04,
    }),
  },
  {
    index: 5,
    slug: 'jerusalem',
    nameRu: 'Иерусалим',
    emoji: '🕍',
    palette: {
      background: 'linear-gradient(180deg, #ece1cf 0%, #cfb58b 54%, #6a562f 100%)',
      panel: 'linear-gradient(180deg, rgba(248,241,227,0.9) 0%, rgba(230,211,174,0.78) 100%)',
      panelBorder: 'rgba(110, 87, 41, 0.18)',
      accent: '#80662e',
      accentSoft: 'rgba(128, 102, 46, 0.14)',
      path: 'rgba(253, 245, 228, 0.93)',
      pathGlow: 'rgba(196, 165, 97, 0.26)',
      pathShadow: 'rgba(76, 58, 24, 0.18)',
      badgeBg: 'rgba(253, 247, 232, 0.7)',
      badgeBorder: 'rgba(109, 88, 41, 0.14)',
    },
    map: buildLocationMap({
      topY: 4140,
      baseX: 550,
      xOffsets: [16, 58, 96, 108, 76, 28, -30, -88, -110, -86, -34, 10],
      zoom: 1.03,
    }),
  },
  {
    index: 6,
    slug: 'golgotha',
    nameRu: 'Голгофа',
    emoji: '✝️',
    palette: {
      background: 'linear-gradient(180deg, #e6ddd6 0%, #b08d7b 54%, #4a332b 100%)',
      panel: 'linear-gradient(180deg, rgba(244,236,232,0.9) 0%, rgba(206,176,163,0.74) 100%)',
      panelBorder: 'rgba(89, 56, 46, 0.2)',
      accent: '#764b40',
      accentSoft: 'rgba(118, 75, 64, 0.15)',
      path: 'rgba(248, 242, 237, 0.9)',
      pathGlow: 'rgba(160, 111, 99, 0.26)',
      pathShadow: 'rgba(51, 31, 25, 0.18)',
      badgeBg: 'rgba(248, 241, 236, 0.66)',
      badgeBorder: 'rgba(100, 64, 54, 0.14)',
    },
    map: buildLocationMap({
      topY: 4920,
      baseX: 458,
      xOffsets: [-12, 34, 82, 110, 94, 48, -4, -58, -102, -112, -74, -18],
      zoom: 1.04,
    }),
  },
  {
    index: 7,
    slug: 'new-jerusalem',
    nameRu: 'Новый Иерусалим',
    emoji: '👑',
    palette: {
      background: 'linear-gradient(180deg, #f5ecdb 0%, #ddc59b 54%, #8f7248 100%)',
      panel: 'linear-gradient(180deg, rgba(250,244,231,0.92) 0%, rgba(236,216,184,0.8) 100%)',
      panelBorder: 'rgba(123, 95, 49, 0.18)',
      accent: '#917237',
      accentSoft: 'rgba(145, 114, 55, 0.14)',
      path: 'rgba(255, 248, 233, 0.96)',
      pathGlow: 'rgba(221, 183, 103, 0.28)',
      pathShadow: 'rgba(90, 67, 29, 0.18)',
      badgeBg: 'rgba(255, 249, 236, 0.74)',
      badgeBorder: 'rgba(138, 108, 47, 0.14)',
    },
    map: buildLocationMap({
      topY: 5700,
      baseX: 548,
      xOffsets: [20, 70, 110, 118, 82, 30, -24, -78, -112, -100, -48, 4],
      zoom: 1.02,
    }),
  },
]

export const PILGRIM_MILESTONE_STEPS = Array.from(
  { length: STEPS_PER_LOCATION },
  (_, index) => index,
).filter((index) => (index + 1) % 3 === 0)

export function clampMasteredVerses(masteredVerses: number): number {
  return Math.max(0, Math.min(MAP_MAX_MASTERED, Math.floor(masteredVerses)))
}

export function getOverflowMastered(masteredVerses: number): number {
  return Math.max(0, Math.floor(masteredVerses) - MAP_MAX_MASTERED)
}

export function isJourneyComplete(masteredVerses: number): boolean {
  return Math.floor(masteredVerses) >= MAP_MAX_MASTERED
}

export function getPlayerGlobalStepIndex(masteredVerses: number): number {
  const clamped = clampMasteredVerses(masteredVerses)
  if (clamped >= MAP_MAX_MASTERED) return MAP_MAX_MASTERED - 1
  return clamped
}

export function masteredToLocationIndex(masteredVerses: number): number {
  const clamped = clampMasteredVerses(masteredVerses)
  if (clamped >= MAP_MAX_MASTERED) return PILGRIM_LOCATIONS.length - 1
  return Math.min(
    Math.floor(clamped / STEPS_PER_LOCATION),
    PILGRIM_LOCATIONS.length - 1,
  )
}

export function getLocationStateByMastered(
  locIndex: number,
  masteredVerses: number,
): 'completed' | 'current' | 'locked' {
  const currentLocationIndex = masteredToLocationIndex(masteredVerses)
  if (locIndex < currentLocationIndex) return 'completed'
  if (locIndex === currentLocationIndex) return 'current'
  return 'locked'
}

export function getPlayerLocalCompletedSteps(
  locIndex: number,
  masteredVerses: number,
): number {
  const clamped = clampMasteredVerses(masteredVerses)
  const locationStart = locIndex * STEPS_PER_LOCATION
  const state = getLocationStateByMastered(locIndex, masteredVerses)

  if (state === 'completed') return STEPS_PER_LOCATION
  if (state === 'locked') return 0
  if (isJourneyComplete(masteredVerses) && locIndex === PILGRIM_LOCATIONS.length - 1) {
    return STEPS_PER_LOCATION
  }

  return Math.max(0, Math.min(STEPS_PER_LOCATION, clamped - locationStart))
}

export function getCurrentLocation(masteredVerses: number): PilgrimLocation {
  return PILGRIM_LOCATIONS[masteredToLocationIndex(masteredVerses)]!
}

export function getLocationMasteredRange(locIndex: number): {
  from: number
  to: number
} {
  const from = locIndex * STEPS_PER_LOCATION
  const to = from + STEPS_PER_LOCATION
  return { from, to }
}

export function getLocationTrackPoint(
  locIndex: number,
  stepIndex: number,
): PilgrimWorldPoint {
  const location = PILGRIM_LOCATIONS[locIndex]!
  const clampedStepIndex = Math.max(0, Math.min(STEPS_PER_LOCATION - 1, stepIndex))
  return location.map.track[clampedStepIndex]!
}
