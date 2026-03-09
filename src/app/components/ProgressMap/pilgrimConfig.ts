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

export interface PilgrimLocationPathPoint {
  /** X координата точки пути (0-1, относительно ширины картинки) */
  x: number
  /** Y координата точки пути (0-1, относительно высоты картинки) */
  y: number
}

export interface PilgrimLocationBackgroundImage {
  /** URL картинки (относительный или абсолютный) */
  url: string
  /** 
   * Кастомные точки пути дороги на картинке.
   * Если заданы - используются вместо автоматической генерации.
   * Координаты 0-1 (относительные).
   * Должно быть точек = STEPS_PER_LOCATION (12)
   */
  pathPoints?: PilgrimLocationPathPoint[]
  /** 
   * Режим заполнения картинки:
   * - 'cover' - заполняет весь экран, обрезает лишнее (для 16:9)
   * - 'contain' - вмещает всю картинку, возможны поля
   * - 'fill' - растягивает до размеров контейнера
   */
  fitMode?: 'cover' | 'contain' | 'fill'
  /** 
   * Фокусная точка для cover режима (0-1).
   * Где на картинке находится центр дороги.
   */
  focalPoint?: { x: number; y: number }
  /** Где начинается дорога на картинке (0-1, от top) - deprecated, используйте pathPoints */
  roadStartY?: number
  /** Где заканчивается дорога на картинке (0-1, от top) - deprecated, используйте pathPoints */
  roadEndY?: number
  /** Отступы для fine-tuning позиционирования */
  padding?: { top: number; bottom: number; left: number; right: number }
  /** Масштаб по горизонтали для совпадения амплитуды волнения пути */
  horizontalScale?: number
  /** Прозрачность картинки */
  opacity?: number
}

export interface PilgrimLocation {
  index: number
  slug: string
  nameRu: string
  emoji: string
  verse: string
  verseRef: string
  description: string
  palette: PilgrimLocationPalette
  /** Опциональная фоновая картинка с дорогой */
  backgroundImage?: PilgrimLocationBackgroundImage
}

export const STEPS_PER_LOCATION = 12
export const MAP_MAX_MASTERED = 96
export const PILGRIM_TOTAL_STEPS = MAP_MAX_MASTERED

export const PILGRIM_LOCATIONS: PilgrimLocation[] = [
  {
    index: 0,
    slug: 'nazareth',
    nameRu: 'Назарет',
    emoji: '🌄',
    verse: '…и возрастал в премудрости и возрасте',
    verseRef: 'Лк 2:52',
    description: 'Тихое начало пути. Здесь формируется привычка возвращаться к Писанию каждый день.',
    palette: {
      background:
        'linear-gradient(180deg, #efe1c9 0%, #dcc19b 45%, #9d7750 100%)',
      panel:
        'linear-gradient(180deg, rgba(248,239,225,0.84) 0%, rgba(233,216,189,0.64) 100%)',
      panelBorder: 'rgba(92, 69, 42, 0.22)',
      accent: '#6f5431',
      accentSoft: 'rgba(111, 84, 49, 0.16)',
      path: 'rgba(252, 243, 227, 0.92)',
      pathGlow: 'rgba(197, 148, 82, 0.38)',
      pathShadow: 'rgba(88, 59, 30, 0.22)',
      badgeBg: 'rgba(255, 248, 236, 0.66)',
      badgeBorder: 'rgba(112, 82, 51, 0.18)',
    },
    // Пример фоновой картинки 16:9 с кастомными точками пути:
    backgroundImage: {
      url: '/images/locations/1.png',
      fitMode: 'cover',    // Заполняет весь экран на телефоне
      focalPoint: { x: 0.5, y: 0.6 }, // Центр дороги на картинке
      opacity: 1,
      // Кастомные точки пути (12 точек для 12 шагов).
      // Координаты 0-1 относительно картинки.
      // Можно задать точные позиции сгибов дороги.
      pathPoints: [
        { x: 0.53, y: 0.38 }, // Step 0 - начало дороги
        { x: 0.53, y: 0.40 }, // Step 1 - первый поворот
        { x: 0.50, y: 0.44 }, // Step 2
        { x: 0.40, y: 0.51 }, // Step 3
        { x: 0.42, y: 0.54 }, // Step 4 - середина
        { x: 0.48, y: 0.57 }, // Step 5
        { x: 0.41, y: 0.64 }, // Step 6
        { x: 0.48, y: 0.68  }, // Step 7
        { x: 0.63, y: 0.75 }, // Step 8
        { x: 0.70, y: 0.80 }, // Step 9
        { x: 0.70, y: 0.85 }, // Step 10
        { x: 0.63, y: 0.90 }, // Step 11 - конец дороги
      ],
    },
  },
  {
    index: 1,
    slug: 'galilee',
    nameRu: 'Галилея',
    emoji: '🌾',
    verse: 'Следуй за Мною, и Я сделаю вас ловцами человеков',
    verseRef: 'Мф 4:19',
    description: 'Путь становится осознанным. Каждое повторение превращается в движение вперёд.',
    palette: {
      background:
        'linear-gradient(180deg, #e8dcc1 0%, #c9b48d 42%, #7a6647 100%)',
      panel:
        'linear-gradient(180deg, rgba(244,236,221,0.82) 0%, rgba(222,205,174,0.60) 100%)',
      panelBorder: 'rgba(96, 80, 51, 0.2)',
      accent: '#7f643d',
      accentSoft: 'rgba(127, 100, 61, 0.18)',
      path: 'rgba(250, 242, 227, 0.92)',
      pathGlow: 'rgba(187, 154, 94, 0.34)',
      pathShadow: 'rgba(70, 55, 33, 0.24)',
      badgeBg: 'rgba(250, 244, 233, 0.62)',
      badgeBorder: 'rgba(110, 88, 55, 0.16)',
    },
    backgroundImage: {
      url: 'https://img.freepik.com/free-photo/beautiful-mountain-landscape_23-2149063331.jpg',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      opacity: 0.9,
    },
  },
  {
    index: 2,
    slug: 'samaria',
    nameRu: 'Самария',
    emoji: '🫒',
    verse: 'Бог есть дух, и поклоняющиеся Ему должны поклоняться в духе и истине',
    verseRef: 'Ин 4:24',
    description: 'Место глубины. Память начинает держаться не на усилии, а на внутренней связи.',
    palette: {
      background:
        'linear-gradient(180deg, #d9d1bd 0%, #a8a07f 44%, #5d5f46 100%)',
      panel:
        'linear-gradient(180deg, rgba(241,237,224,0.8) 0%, rgba(212,209,189,0.58) 100%)',
      panelBorder: 'rgba(70, 75, 49, 0.22)',
      accent: '#59603f',
      accentSoft: 'rgba(89, 96, 63, 0.18)',
      path: 'rgba(246, 242, 231, 0.88)',
      pathGlow: 'rgba(127, 139, 92, 0.32)',
      pathShadow: 'rgba(47, 52, 34, 0.22)',
      badgeBg: 'rgba(244, 241, 231, 0.6)',
      badgeBorder: 'rgba(83, 89, 61, 0.16)',
    },
    backgroundImage: {
      url: 'https://img.freepik.com/free-photo/beautiful-mountain-landscape_23-2149063331.jpg',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      opacity: 0.9,
    },
  },
  {
    index: 3,
    slug: 'bethlehem',
    nameRu: 'Вифлеем',
    emoji: '⭐',
    verse: 'Из тебя произойдёт Мне Тот, Который должен быть Владыкою',
    verseRef: 'Мих 5:2',
    description: 'На этом этапе путь становится светлее: повторение начинает давать устойчивую уверенность.',
    palette: {
      background:
        'linear-gradient(180deg, #ede1c7 0%, #d1b17e 42%, #7d5b2f 100%)',
      panel:
        'linear-gradient(180deg, rgba(248,239,220,0.82) 0%, rgba(228,202,153,0.56) 100%)',
      panelBorder: 'rgba(112, 77, 29, 0.22)',
      accent: '#8e6628',
      accentSoft: 'rgba(142, 102, 40, 0.18)',
      path: 'rgba(253, 244, 223, 0.92)',
      pathGlow: 'rgba(212, 173, 93, 0.32)',
      pathShadow: 'rgba(95, 64, 20, 0.22)',
      badgeBg: 'rgba(255, 245, 223, 0.6)',
      badgeBorder: 'rgba(129, 90, 31, 0.16)',
    },
    backgroundImage: {
      url: 'https://img.freepik.com/free-photo/beautiful-mountain-landscape_23-2149063331.jpg',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      opacity: 0.9,
    },
  },
  {
    index: 4,
    slug: 'jericho',
    nameRu: 'Иерихон',
    emoji: '🏛️',
    verse: 'Верою пали стены Иерихонские',
    verseRef: 'Евр 11:30',
    description: 'Ритм становится сильнее. Стихи перестают выпадать и собираются в устойчивый запас.',
    palette: {
      background:
        'linear-gradient(180deg, #e7d6bf 0%, #c18f63 40%, #744427 100%)',
      panel:
        'linear-gradient(180deg, rgba(245,234,220,0.82) 0%, rgba(221,184,157,0.58) 100%)',
      panelBorder: 'rgba(112, 62, 31, 0.22)',
      accent: '#8a4f24',
      accentSoft: 'rgba(138, 79, 36, 0.18)',
      path: 'rgba(250, 239, 224, 0.9)',
      pathGlow: 'rgba(205, 122, 78, 0.32)',
      pathShadow: 'rgba(76, 38, 17, 0.22)',
      badgeBg: 'rgba(252, 241, 230, 0.58)',
      badgeBorder: 'rgba(124, 69, 37, 0.16)',
    },
    backgroundImage: {
      url: 'https://img.freepik.com/free-photo/beautiful-mountain-landscape_23-2149063331.jpg',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      opacity: 0.9,
    },
  },
  {
    index: 5,
    slug: 'jerusalem',
    nameRu: 'Иерусалим',
    emoji: '🕍',
    verse: 'Если я забуду тебя, Иерусалим, — забудь меня десница моя',
    verseRef: 'Пс 136:5',
    description: 'Слово закрепляется в памяти. Здесь виден результат дисциплины и долгого маршрута.',
    palette: {
      background:
        'linear-gradient(180deg, #e4d7c1 0%, #bfa06b 40%, #6a5228 100%)',
      panel:
        'linear-gradient(180deg, rgba(245,237,221,0.82) 0%, rgba(225,202,158,0.58) 100%)',
      panelBorder: 'rgba(104, 82, 35, 0.22)',
      accent: '#7a612a',
      accentSoft: 'rgba(122, 97, 42, 0.18)',
      path: 'rgba(252, 242, 223, 0.9)',
      pathGlow: 'rgba(190, 161, 93, 0.3)',
      pathShadow: 'rgba(70, 54, 22, 0.22)',
      badgeBg: 'rgba(252, 245, 230, 0.58)',
      badgeBorder: 'rgba(108, 86, 40, 0.16)',
    },
    backgroundImage: {
      url: 'https://img.freepik.com/free-photo/beautiful-mountain-landscape_23-2149063331.jpg',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      opacity: 0.9,
    },
  },
  {
    index: 6,
    slug: 'golgotha',
    nameRu: 'Голгофа',
    emoji: '✝️',
    verse: 'Слово Божие живо и действенно и острее всякого меча обоюдоострого',
    verseRef: 'Евр 4:12',
    description: 'Самая строгая часть дороги. Здесь остаётся только то, что по-настоящему закреплено.',
    palette: {
      background:
        'linear-gradient(180deg, #d7cbc2 0%, #9b7965 42%, #4a3027 100%)',
      panel:
        'linear-gradient(180deg, rgba(240,232,227,0.82) 0%, rgba(194,163,147,0.54) 100%)',
      panelBorder: 'rgba(85, 53, 43, 0.24)',
      accent: '#72463a',
      accentSoft: 'rgba(114, 70, 58, 0.18)',
      path: 'rgba(247, 240, 234, 0.88)',
      pathGlow: 'rgba(153, 105, 94, 0.3)',
      pathShadow: 'rgba(46, 27, 22, 0.22)',
      badgeBg: 'rgba(247, 238, 234, 0.56)',
      badgeBorder: 'rgba(98, 61, 50, 0.18)',
    },
    backgroundImage: {
      url: 'https://img.freepik.com/free-photo/beautiful-mountain-landscape_23-2149063331.jpg',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      opacity: 0.9,
    },
  },
  {
    index: 7,
    slug: 'new-jerusalem',
    nameRu: 'Новый Иерусалим',
    emoji: '👑',
    verse: 'Слово Твоё — светильник ноге моей и свет стезе моей',
    verseRef: 'Пс 118:105',
    description: 'Финиш маршрута. Карта пройдена, а дальше начинается запас сверх цели.',
    palette: {
      background:
        'linear-gradient(180deg, #efe4ce 0%, #d2b78c 38%, #8a6b41 100%)',
      panel:
        'linear-gradient(180deg, rgba(249,240,225,0.84) 0%, rgba(232,210,176,0.6) 100%)',
      panelBorder: 'rgba(120, 92, 46, 0.22)',
      accent: '#8b6a2e',
      accentSoft: 'rgba(139, 106, 46, 0.18)',
      path: 'rgba(255, 246, 227, 0.94)',
      pathGlow: 'rgba(220, 179, 92, 0.36)',
      pathShadow: 'rgba(86, 63, 26, 0.24)',
      badgeBg: 'rgba(255, 248, 232, 0.64)',
      badgeBorder: 'rgba(137, 105, 43, 0.18)',
    },
    backgroundImage: {
      url: 'https://img.freepik.com/free-photo/beautiful-mountain-landscape_23-2149063331.jpg',
      fitMode: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
      opacity: 0.9,
    },
  },
]

export const PILGRIM_MILESTONE_STEPS = Array.from(
  { length: STEPS_PER_LOCATION },
  (_, index) => index
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
