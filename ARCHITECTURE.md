# Bible Memory — Полная архитектура приложения

> Документ описывает полную архитектуру, структуру директорий, пайплайн изучения стихов, потоки данных, API, инварианты и паттерны фронтенда. Используется как контекст для разработки и AI-агентов.

---

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Технологический стек](#2-технологический-стек)
3. [Структура директорий](#3-структура-директорий)
4. [База данных — Prisma Schema](#4-база-данных--prisma-schema)
5. [Система статусов стихов](#5-система-статусов-стихов)
6. [Пайплайн изучения стиха](#6-пайплайн-изучения-стиха)
7. [Режимы тренировки и движок](#7-режимы-тренировки-и-движок)
8. [API эндпоинты](#8-api-эндпоинты)
9. [Фронтенд — архитектура](#9-фронтенд--архитектура)
10. [Система ежедневной цели](#10-система-ежедневной-цели)
11. [Последовательность загрузки (Boot Sequence)](#11-последовательность-загрузки-boot-sequence)
12. [Ключевые потоки данных (Flows)](#12-ключевые-потоки-данных-flows)
13. [Внешние интеграции](#13-внешние-интеграции)
14. [Производительность и оптимизации](#14-производительность-и-оптимизации)
15. [Инварианты (нельзя нарушать)](#15-инварианты-нельзя-нарушать)
16. [История исправленных багов](#16-история-исправленных-багов)
17. [Быстрая справка: что где менять](#17-быстрая-справка-что-где-менять)

---

## 1. Обзор проекта

**Bible Memory** — Telegram Mini App для заучивания библейских стихов методом интервальных повторений (spaced repetition). Пользователь добавляет стихи и последовательно проходит 7 режимов тренировки — от простого кликания по блокам текста до полного ввода с клавиатуры. После освоения стих переходит в фазу периодических повторений.

**Ключевые характеристики:**
- Платформа: Telegram Mini App (WebApp API)
- Авторизация: только через Telegram `telegramId` — логина/пароля нет
- Архитектурный паттерн: Full-stack монолит (Next.js App Router + Pages API Routes)
- БД: PostgreSQL (Neon serverless) + Prisma ORM
- Развёртывание: Vercel

---

## 2. Технологический стек

| Категория | Технология | Версия |
|---|---|---|
| Фреймворк | Next.js (App Router + Pages API) | 14.2.35 |
| UI-библиотека | React | 18.3.1 |
| Язык | TypeScript | 5.7.2 |
| CSS | Tailwind CSS | 4.1.12 |
| Анимации | motion/react (Framer Motion) | 12.23.24 |
| UI-компоненты | Radix UI (accordion, dialog, menu…) | разные |
| Иконки | Lucide React | 0.487.0 |
| Тосты | Sonner | 2.0.3 |
| Формы | React Hook Form | 7.55.0 |
| Жесты | @use-gesture/react | 10.3.1 |
| ORM | Prisma | 7.2.0 |
| БД-адаптер | @prisma/adapter-pg (Neon pooler) | 7.2.0 |
| HTTP-клиент | Axios | 1.13.2 |
| API-генерация | openapi-typescript-codegen | 0.30.0 |
| Виртуализация | react-virtuoso | 4.18.1 |
| Telegram SDK | @twa-dev/sdk | 8.0.2 |
| Чарты | Recharts | 2.15.2 |
| Swagger UI | swagger-ui-react | 5.31.0 |

**Шрифты:** Inter (sans-serif, основной), Lora (serif, для стихов) — Google Fonts с Cyrillic-подмножеством.

**Тема:** только тёмная (dark mode), hardcoded. Telegram-специфичные CSS-переменные для safe area.

---

## 3. Структура директорий

```
project-root/
├── prisma/
│   └── schema.prisma              ← схема БД (User, UserVerse, Tag, VerseTag)
│
├── scripts/
│   └── generate-openapi.ts        ← скрипт генерации openapi.json
│
├── openapi.json                   ← OpenAPI 3.0.3 спецификация (auto-generated)
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json                  ← paths: "@/*" → "src/*"
├── prisma.config.ts
│
└── src/
    ├── app/                       ← Next.js App Router (клиентская SPA-часть)
    │   ├── layout.tsx             ← HTML shell, шрифты, Telegram SDK script
    │   ├── page.tsx               ← точка входа, boot overlay, TelegramProvider
    │   ├── globals.css            ← импорты стилей + safe area классы
    │   ├── App.tsx                ← главный компонент (глобальный state, роутинг)
    │   ├── error.tsx              ← глобальный error boundary
    │   ├── loading.tsx
    │   │
    │   ├── components/
    │   │   ├── Layout.tsx             ← таб-бар + сайдбар навигация
    │   │   ├── Dashboard.tsx          ← главный экран, карточка ежедневной цели
    │   │   ├── VerseList.tsx          ← список всех стихей с фильтрами
    │   │   ├── VerseGallery.tsx       ← карусель карточек для тренировки
    │   │   ├── VerseCard.tsx          ← карточка стиха (отображение текста)
    │   │   ├── TrainingSession.tsx    ← сессия тренировки (все упражнения)
    │   │   ├── Collections.tsx        ← тематические коллекции
    │   │   ├── Statistics.tsx         ← статистика
    │   │   ├── Settings.tsx           ← настройки (перевод Библии)
    │   │   ├── AddVerseDialog.tsx     ← диалог поиска и добавления стиха
    │   │   ├── MasteryBadge.tsx       ← значок уровня мастерства
    │   │   │
    │   │   ├── training-session/
    │   │   │   ├── TrainingModeRenderer.tsx  ← динамический рендер режимов
    │   │   │   └── modes/
    │   │   │       ├── ClickChunksExercise.tsx
    │   │   │       ├── ClickWordsExercise.tsx
    │   │   │       ├── ClickWordsHintedExercise.tsx
    │   │   │       ├── FirstLettersHintedExercise.tsx
    │   │   │       ├── FirstLettersKeyboardExercise.tsx
    │   │   │       ├── FirstLettersTapExercise.tsx
    │   │   │       ├── FullRecallExercise.tsx
    │   │   │       ├── MobileRuKeyboardOverlay.tsx  ← русская клавиатура
    │   │   │       ├── TrainingRatingFooter.tsx     ← кнопки оценки (0-3)
    │   │   │       └── types.ts                    ← TrainingModeProps
    │   │   │
    │   │   ├── verse-list/
    │   │   │   ├── components/
    │   │   │   │   ├── VerseListHeader.tsx
    │   │   │   │   ├── VerseListFilterCard.tsx       ← фильтры по статусу
    │   │   │   │   ├── VerseListEmptyState.tsx
    │   │   │   │   ├── VerseListSkeletonCards.tsx
    │   │   │   │   ├── VerseListLoadMoreFooter.tsx
    │   │   │   │   ├── SwipeableVerseCard.tsx        ← свайп-действия (удалить, пауза)
    │   │   │   │   └── ConfirmDeleteModal.tsx
    │   │   │   ├── hooks/
    │   │   │   │   ├── useVerseListController.tsx   ← главный контроллер списка
    │   │   │   │   ├── useVerseActions.ts
    │   │   │   │   ├── useVersePagination.ts
    │   │   │   │   └── useTelegramId.ts
    │   │   │   ├── virtualization/
    │   │   │   │   └── VerseVirtualizedList.tsx     ← виртуализированный список
    │   │   │   ├── constants.ts                     ← PAGE_SIZE = 50
    │   │   │   ├── haptics.ts                       ← Telegram haptic feedback
    │   │   │   └── types.ts
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── DashboardSections.tsx
    │   │   │   └── DashboardSkeleton.tsx
    │   │   │
    │   │   ├── verse-gallery/
    │   │   │   ├── TrainingCompletionToastCard.tsx
    │   │   │   └── TrainingSubsetSelect.tsx
    │   │   │
    │   │   └── ui/                    ← базовые UI-компоненты (shadcn/ui + кастом)
    │   │       ├── button.tsx, card.tsx, dialog.tsx, input.tsx, badge.tsx
    │   │       ├── accordion.tsx, tabs.tsx, drawer.tsx, popover.tsx
    │   │       ├── sonner.tsx (Toast provider)
    │   │       └── ... (50+ компонентов)
    │   │
    │   ├── contexts/
    │   │   └── TelegramContext.tsx    ← контекст Telegram SDK + useTelegram()
    │   │
    │   ├── features/
    │   │   └── daily-goal/
    │   │       ├── types.ts           ← DailyGoalSession, DailyGoalPlan, фазы
    │   │       ├── planner.ts         ← buildDailyGoalPlan()
    │   │       ├── storage.ts         ← localStorage read/write
    │   │       └── useDailyGoalController.ts  ← React hook контроллер
    │   │
    │   ├── hooks/
    │   │   ├── useTelegramWebApp.ts   ← инициализация SDK, user, haptics
    │   │   ├── useTelegramSafeArea.ts ← safe area (notch) отступы
    │   │   └── useBibleVerse.ts       ← хук загрузки отдельного стиха
    │   │
    │   ├── types/
    │   │   ├── verseStatus.ts         ← DisplayVerseStatus + helpers
    │   │   ├── verseSync.ts           ← VerseMutablePatch, VersePatchEvent
    │   │   └── bible.ts               ← типы для Библии
    │   │
    │   ├── utils/
    │   │   └── versePatch.ts          ← getVerseSyncKey, mergeVersePatch
    │   │
    │   ├── data/
    │   │   └── mockData.ts            ← моки для разработки
    │   │
    │   └── services/
    │       └── bollsApi.ts            ← прямой клиент к bolls.life
    │
    ├── pages/api/                     ← Next.js API Routes (бэкенд)
    │   ├── users/
    │   │   ├── telegram.ts            ← POST /api/users/telegram
    │   │   ├── [telegramId].ts        ← GET /api/users/[telegramId]
    │   │   └── [telegramId]/
    │   │       ├── verses/
    │   │       │   ├── index.ts           ← GET list, POST create
    │   │       │   ├── [externalVerseId].ts ← PATCH, DELETE
    │   │       │   ├── review.ts          ← GET review verses
    │   │       │   ├── verseCard.types.ts ← VerseCardDto, computeDisplayStatus
    │   │       │   └── _shared.ts         ← fetchEnrichedUserVerses, пагинация
    │   │       └── daily-goal/
    │   │           └── readiness.ts   ← GET readiness
    │   ├── bolls/
    │   │   ├── verses.ts              ← POST /api/bolls/verses
    │   │   ├── translations.ts
    │   │   └── parallel.ts
    │   ├── verses/
    │   │   └── [externalVerseId]/
    │   │       └── tags.ts            ← GET теги стиха
    │   ├── tags/
    │   │   └── index.ts               ← GET все теги
    │   └── docs.ts                    ← GET /api/docs (Swagger UI)
    │
    ├── shared/                        ← общий код для фронта и бэка
    │   ├── training/
    │   │   ├── modeEngine.ts          ← ДВИЖОК ТРЕНИРОВОК (ключевой файл)
    │   │   ├── constants.ts           ← TRAINING_STAGE_MASTERY_MAX = 7
    │   │   └── fullRecallTypingAssist.ts
    │   └── ui/
    │       ├── ruKeyboardLayout.ts    ← русская раскладка клавиатуры
    │       └── verticalTouchSwipe.ts  ← детекция свайпов
    │
    ├── api/                           ← auto-generated OpenAPI клиент
    │   ├── core/
    │   │   ├── OpenAPI.ts             ← конфигурация (BASE URL, TOKEN)
    │   │   ├── request.ts             ← Axios-обёртка HTTP-запросов
    │   │   ├── ApiError.ts
    │   │   └── CancelablePromise.ts
    │   ├── services/
    │   │   ├── UsersService.ts
    │   │   ├── UserVersesService.ts
    │   │   ├── BollsService.ts
    │   │   ├── TagsService.ts
    │   │   ├── DocsService.ts
    │   │   ├── dailyGoalReadiness.ts  ← ручной сервис (не auto-generated)
    │   │   └── userVersesPagination.ts ← пагинационный хелпер
    │   └── models/
    │       ├── User.ts, UserVerse.ts, UserWithVerses.ts
    │       ├── Tag.ts, VerseTag.ts
    │       ├── BollsVerse.ts
    │       └── UserVersesPageResponse.ts
    │
    ├── generated/prisma/              ← auto-generated Prisma клиент
    │   ├── client.ts, client.d.ts
    │   └── models/ (User, UserVerse, Tag, VerseTag)
    │
    ├── lib/
    │   └── prisma.ts                  ← singleton PrismaClient
    │
    ├── styles/
    │   ├── index.css                  ← главный CSS-импорт
    │   ├── fonts.css                  ← подключение Google Fonts
    │   ├── theme.css                  ← CSS-переменные тёмной темы
    │   ├── tailwind.css               ← @tailwind директивы
    │   └── globals.css                ← утилиты safe area
    │
    └── swagger/
        └── doc.ts                     ← генерация Swagger-спецификации
```

---

## 4. База данных — Prisma Schema

```prisma
enum VerseStatus { MY | LEARNING | STOPPED }
enum Translation { NRT | SYNOD | RBS2 | BTI }

model User {
  id                   String      @id @default(cuid())
  telegramId           String      @unique
  translation          Translation @default(SYNOD)
  dailyGoalsCompleted  Int         @default(0)
  dailyStreak          Int         @default(0)
  createdAt            DateTime    @default(now())
  verses               UserVerse[]
}

model UserVerse {
  id                Int           @id @autoincrement
  telegramId        String        // → User.telegramId (не FK, для производительности)
  externalVerseId   String        // формат: "{book}-{chapter}-{verse}", напр. "43-3-16"
  status            VerseStatus   @default(MY)
  masteryLevel      Int           @default(0)
  repetitions       Int           @default(0)
  lastTrainingModeId Int?         // ID последнего режима тренировки (TrainingModeId)
  lastReviewedAt    DateTime?
  nextReviewAt      DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@unique([telegramId, externalVerseId])
}

model Tag {
  id        String     @id @default(cuid())
  slug      String     @unique  // "faith", "love", "hope"
  title     String     @unique  // "Вера", "Любовь", "Надежда"
  createdAt DateTime   @default(now())
  verses    VerseTag[]
}

model VerseTag {
  id              String @id @default(cuid())
  externalVerseId String
  tagId           String
  tag             Tag    @relation(fields: [tagId], references: [id])

  @@unique([externalVerseId, tagId])
}
```

**Ключевые правила:**
- `VerseStatus` в БД хранит ТОЛЬКО: `MY`, `LEARNING`, `STOPPED`
- `REVIEW`, `WAITING`, `MASTERED` — **виртуальные статусы**, вычисляемые на лету, в БД не пишутся
- `externalVerseId` — ID из bolls.life в формате `"{book}-{chapter}-{verse}"`
- `masteryLevel` для LEARNING стихей ВСЕГДА в диапазоне `[1, 7]` — принудительно через clamp на бэке

---

## 5. Система статусов стихов

### 5.1 Маппинг DB → DisplayStatus

Функция `computeDisplayStatus(baseStatus, masteryLevel, repetitions, nextReviewAt?)` в файле `src/pages/api/users/[telegramId]/verses/verseCard.types.ts`:

```
DB: status=MY                                           → "MY"
DB: status=STOPPED                                       → "STOPPED"
DB: status=LEARNING, repetitions >= 5                   → "MASTERED"  ← проверяем первым!
DB: status=LEARNING, masteryLevel >= 7, nextReviewAt в БУДУЩЕМ → "WAITING"
DB: status=LEARNING, masteryLevel >= 7                  → "REVIEW"
DB: status=LEARNING, masteryLevel 1-6                   → "LEARNING"
```

> **Важно:** порядок проверок критичен — MASTERED всегда проверяется раньше WAITING/REVIEW.

### 5.2 Полная таблица состояний

```
DB status | masteryLevel | repetitions | nextReviewAt       → Display
────────────────────────────────────────────────────────────────────────
MY       │ 0            │ 0           │ null               → MY
LEARNING  │ 1–6          │ 0           │ null               → LEARNING  ← фаза изучения
LEARNING  │ 7            │ 0           │ null               → REVIEW    ← готов к повторению
LEARNING  │ 7            │ 1–4         │ прошедшая / null   → REVIEW    ← пора повторять
LEARNING  │ 7            │ 1–4         │ будущая            → WAITING   ← ждём следующего дня
LEARNING  │ 7            │ ≥ 5         │ любая              → MASTERED  ← выучен полностью
STOPPED   │ любой        │ любой       │ любая              → STOPPED
```

### 5.3 Ключевые константы (файл `verseCard.types.ts`)

```typescript
TRAINING_STAGE_MASTERY_MAX = 7        // max masteryLevel в фазе LEARNING
REVIEW_MASTERY_LEVEL_MIN = 7          // порог перехода в REVIEW
MASTERED_REPETITIONS_MIN = 5          // сколько повторений нужно для MASTERED
WAITING_NEXT_REVIEW_DELAY_HOURS = 24  // интервал между повторениями (часы)
```

---

## 6. Пайплайн изучения стиха

```
┌────────────────────────────────────────────────────────────────────┐
│                      ПАЙПЛАЙН ИЗУЧЕНИЯ СТИХА                        │
└────────────────────────────────────────────────────────────────────┘

[Добавить стих] → POST /api/users/{id}/verses
      │
      ▼
  ┌───────┐
  │  MY  │  masteryLevel=0, repetitions=0
  │       │  Карточка только для чтения. Тренировка недоступна.
  └───┬───┘
      │ "Начать изучение" → status=LEARNING, masteryLevel=1
      ▼
╔═════════════════════════════════════════════════════════════════╗
║                    ФАЗА 1: LEARNING                              ║
║       masteryLevel ∈ [1, 7]  |  status=LEARNING в БД           ║
╠═════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  masteryLevel → режим упражнения:                               ║
║    1   → ClickChunks               (кликать блоки текста)       ║
║    2   → ClickWordsHinted          (слова с подсказками)        ║
║    3   → ClickWordsNoHints         (слова без подсказок)        ║
║    4   → FirstLettersWithWordHints (первые буквы + слова)       ║
║    5   → FirstLettersTapNoHints    (первые буквы, тап)          ║
║    6   → FirstLettersTyping        (первые буквы, клавиатура)   ║
║    7   → FullRecall                (полный ввод стиха)          ║
║                                                                 ║
║  Оценка после упражнения → delta:                               ║
║    0 "Забыл"   → delta = −1   (понизить)                        ║
║    1 "Плохо"   → delta =  0   (повторить тот же режим)          ║
║    2 "Хорошо"  → delta = +1   (следующий режим)                 ║
║    3 "Отлично" → delta = +2   (перескочить режим)               ║
║                                                                 ║
║  masteryLevel всегда clamp([1, 7])                              ║
║  При достижении 7 → graduatesToReview=true                      ║
║  → автоматически: nextReviewAt = now + 24h                      ║
╚═════════════════════════╦═══════════════════════════════════════╝
                           │ masteryLevel достиг 7
                           ▼
╔═════════════════════════════════════════════════════════════════╗
║                    ФАЗА 2: WAITING (первый день)                 ║
║        masteryLevel=7, nextReviewAt = завтра                    ║
╠═════════════════════════════════════════════════════════════════╣
║  DisplayStatus = WAITING                                        ║
║  Тренировка недоступна до наступления nextReviewAt              ║
╚═════════════════════════╦═══════════════════════════════════════╝
                           │ nextReviewAt наступил
                           ▼
╔═════════════════════════════════════════════════════════════════╗
║                    ФАЗА 2: REVIEW                                ║
║        masteryLevel=7, status=LEARNING в БД                     ║
╠═════════════════════════════════════════════════════════════════╣
║  Фиксированный режим: FirstLettersTyping                        ║
║  После успешного повторения:                                    ║
║    repetitions += 1                                             ║
║    nextReviewAt = now + 24h                                     ║
║    → DisplayStatus → WAITING                                    ║
║                                                                 ║
║  Цикл: REVIEW → WAITING → REVIEW → WAITING → ...               ║
║  Нужно 5 успешных повторений (repetitions ≥ 5)                  ║
╚═════════════════════════╦═══════════════════════════════════════╝
                           │ repetitions = 5
                           ▼
                    ┌──────────┐
                    │ MASTERED │  DisplayStatus="MASTERED"
                    │          │  Стих полностью выучен
                    └──────────┘

В любой момент LEARNING/REVIEW/WAITING/MASTERED → STOPPED (пауза)
STOPPED → LEARNING (возобновить с сохранением masteryLevel)
```

---

## 7. Режимы тренировки и движок

### 7.1 TrainingModeId enum (файл `src/shared/training/modeEngine.ts`)

```typescript
enum TrainingModeId {
  ClickChunks = 1,                // блоки текста, самый простой
  ClickWordsHinted = 2,           // слова с подсказками
  ClickWordsNoHints = 3,          // слова без подсказок
  FirstLettersWithWordHints = 4,  // первые буквы + показывать слова
  FirstLettersTapNoHints = 5,     // первые буквы, тап-ввод
  FirstLettersTyping = 6,         // первые буквы, клавиатура (режим REVIEW)
  FullRecall = 7,                 // полный ввод текста, самый сложный
}

const TRAINING_MODE_PROGRESS_ORDER = [1, 2, 3, 4, 5, 6, 7]
```

### 7.2 Ключевые функции движка

```typescript
// Базовый режим по уровню мастерства
getBaseTrainingModeForMastery(stageMasteryLevel: number): TrainingModeId

// Выбор следующего режима (избегает повторения lastModeId при rating != "Плохо")
chooseTrainingModeId({
  rawMasteryLevel: number,
  stageMasteryLevel: number,
  lastModeId: TrainingModeId | null
}): TrainingModeId

// Применить delta к masteryLevel с учётом clamp и фазы
applyMasteryDelta({
  isLearningVerse: boolean,     // true для LEARNING фазы
  rawMasteryBefore: number,
  masteryDelta: number
}): { rawMasteryAfter: number, graduatesToReview: boolean }
// LEARNING: clamp([1,7]), graduatesToReview=true когда 6→7
// REVIEW: clamp([0,∞)), graduatesToReview=false

// Проверить, находится ли стих в REVIEW фазе по masteryLevel
isTrainingReviewRawMastery(rawMasteryLevel: number): boolean  // > 7

// Привести masteryLevel к диапазону [0, TRAINING_STAGE_MASTERY_MAX]
toTrainingStageMasteryLevel(rawMasteryLevel: number): number
```

### 7.3 Алгоритм выбора режима

```
1. Вычислить stageMasteryLevel = toTrainingStageMasteryLevel(rawMasteryLevel)
2. Найти базовый режим: getBaseTrainingModeForMastery(stageMasteryLevel)
3. Построить список кандидатов: от базового расширяться влево/вправо в PROGRESS_ORDER
4. При rating=1 ("Плохо"): передать lastModeId=null → вернётся тот же режим
5. При других rating: выбрать первого кандидата ≠ lastModeId

// lastTrainingModeId хранится в БД и возвращается в VerseCardDto
// Читается при старте сессии, сохраняется при каждом PATCH
```

---

## 8. API эндпоинты

### 8.1 Полный список

| Метод | Путь | Описание |
|---|---|---|
| POST | /api/users/telegram | Создать/получить пользователя по telegramId |
| GET | /api/users/[telegramId] | Профиль пользователя |
| GET | /api/users/[telegramId]/verses | Список стихей (пагинация, фильтры) |
| POST | /api/users/[telegramId]/verses | Добавить стих |
| PATCH | /api/users/[telegramId]/verses/[externalVerseId] | Обновить прогресс стиха |
| DELETE | /api/users/[telegramId]/verses/[externalVerseId] | Удалить стих |
| GET | /api/users/[telegramId]/verses/review | Стихи в статусе REVIEW |
| GET | /api/users/[telegramId]/daily-goal/readiness | Готовность к ежедневной цели |
| POST | /api/bolls/verses | Тексты стихей из bolls.life (batch) |
| GET | /api/bolls/translations | Доступные переводы Библии |
| POST | /api/bolls/parallel | Параллельные переводы |
| GET | /api/verses/[externalVerseId]/tags | Теги стиха |
| GET | /api/tags | Все теги |
| GET | /api/docs | Swagger UI |

### 8.2 Правила PATCH `/verses/[externalVerseId]`

**Тело запроса:**
```typescript
{
  masteryLevel?: number
  repetitions?: number
  lastReviewedAt?: string
  nextReviewAt?: string
  lastTrainingModeId?: number
  status?: "MY" | "LEARNING" | "STOPPED"
}
```

**Guard-условия на бэке:**

```
1. Если status=LEARNING И body.masteryLevel задан:
   masteryLevel = clamp(body.masteryLevel, 1, 7)

2. Если body.repetitions задан И изменился:
   canMutate = (status=LEARNING && masteryLevel >= 7)
   → Если false → 409 Conflict

3. Если (currentMasteryLevel < 7) И (requestedMasteryLevel >= 7):
   → Первый переход в REVIEW
   → autoNextReviewAt = now + 24h
   → resolvedNextReviewAt = body.nextReviewAt ?? autoNextReviewAt
```

### 8.3 GET `/verses` — параметры фильтрации

```
filter: "all" | 'my' | "learning" | "waiting" | "review" | "mastered" | "stopped"
status: "MY" | "LEARNING" | "STOPPED"   (DB-уровень)
orderBy: "createdAt" | "updatedAt"
order: "asc" | "desc"
limit: 1-50 (default: 50)
startWith: offset (пагинация)
```

### 8.4 VerseCardDto (ответ от бэка)

```typescript
type VerseCardDto = {
  id: number
  telegramId: string
  externalVerseId: string      // "43-3-16"
  status: DisplayVerseStatus   // вычисленный виртуальный статус
  masteryLevel: number         // 0-7
  repetitions: number          // 0-5+
  lastTrainingModeId: number | null
  lastReviewedAt: string | null
  nextReviewAt: string | null
  text?: string                // текст стиха (от bolls.life)
  reference?: string           // "Иоанна 3:16"
  tags: VerseCardTagDto[]
}
```

---

## 9. Фронтенд — архитектура

### 9.1 Иерархия компонентов

```
page.tsx
└── TelegramProvider (TelegramContext)
    └── App.tsx                          ← центральный state machine
        ├── Layout.tsx                   ← навигация (таб-бар / сайдбар)
        │   ├── Dashboard.tsx            ← главный экран
        │   ├── VerseList.tsx            ← список стихей
        │   ├── Collections.tsx
        │   ├── Statistics.tsx
        │   └── Settings.tsx
        ├── VerseGallery.tsx             ← оверлей карусели
        │   └── TrainingSession.tsx      ← оверлей тренировки
        │       └── TrainingModeRenderer.tsx
        │           └── [ExerciseComponent]
        └── AddVerseDialog.tsx           ← диалог добавления
```

### 9.2 Глобальный стейт в App.tsx

```typescript
// Данные пользователя
const [user, setUser] = useState<UserWithVerses | null>(null)
const [verses, setVerses] = useState<Verse[]>([])          // все стихи (загружены разом)
const [trainingVerses, setTrainingVerses] = useState<Verse[]>([]) // стихи для сессии

// Навигация
const [currentPage, setCurrentPage] = useState<Page>("dashboard")
const [isTraining, setIsTraining] = useState(false)

// Ежедневная цель
const dailyGoal = useDailyGoalController({ verses, user, ... })
const [trainingBatchPreferences, setTrainingBatchPreferences] = useState({
  newVersesCount: 5,
  reviewVersesCount: 5
})

// Загрузка
const [isBootstrapping, setIsBootstrapping] = useState(true)
const [isLoading, setIsLoading] = useState(true)
```

### 9.3 Оптимистичный патч (VersePatchEvent)

Вместо полного перезапроса при каждом действии:

```
Пользователь ставит оценку
  1. applyMasteryDelta() → вычислить новый masteryLevel
  2. Оптимистично обновить verses в local state (setVerses)
  3. Отправить PATCH /api/users/{id}/verses/{verseId}
  4. Успех → применить ответ: pickMutableVersePatchFromApiResponse()
  5. Ошибка → откатить через предыдущий VersePatchEvent
```

```typescript
// src/app/types/verseSync.ts
type VersePatchEvent = {
  target: { id?: string; externalVerseId?: string }
  patch: {
    status?: DisplayVerseStatus
    masteryLevel?: number
    repetitions?: number
    lastReviewedAt?: string
    nextReviewAt?: string
  }
}
```

### 9.4 Тип Verse (фронтовая модель)

```typescript
type Verse = {
  id: string | number
  externalVerseId: string
  status: DisplayVerseStatus    // "MY"|"LEARNING"|"WAITING"|"REVIEW"|"MASTERED"|"STOPPED"
  masteryLevel: number
  repetitions: number
  lastTrainingModeId: number | null
  lastReviewedAt: string | null
  nextReviewAt: string | null
  text?: string                 // текст от bolls.life
  reference?: string            // "Иоанна 3:16"
  tags: VerseCardTagDto[]
}
```

### 9.5 Навигация

SPA без роутера — через `currentPage: Page` в App.tsx:

```typescript
type Page = "dashboard" | "verses" | "collections" | "statistics" | "settings"
```

Оверлеи (VerseGallery, TrainingSession, AddVerseDialog) управляются отдельными boolean-флагами.

---

## 10. Система ежедневной цели

### 10.1 Хранение в localStorage

Сессия дневной цели хранится в **localStorage** (не в БД):

```typescript
// src/app/features/daily-goal/types.ts
interface DailyGoalSession {
  version: 1
  telegramId: string
  dayKey: string               // "2026-02-26"
  plan: DailyGoalPlan
  progress: DailyGoalProgress
}

interface DailyGoalPlan {
  dayKey: string
  prefsSnapshot: { newVersesCount: number; reviewVersesCount: number }
  requestedCounts: { new: number; review: number }
  availableCounts: { new: number; review: number }
  targetVerseIds: { new: string[]; review: string[] }
  shortages: { new: number; review: number }
}

interface DailyGoalProgress {
  completedVerseIds: { new: string[]; review: string[] }
  skippedVerseIds?: { new: string[]; review: string[] }
  startedAt: string | null
  completedAt: string | null
  lastActivePhase: DailyGoalPhase
  lastSuggestedVerseId: string | null
  preferredResumeMode?: "learning" | "review" | null
}

type DailyGoalPhase = "learning" | "review" | "completed" | "empty"
```

### 10.2 Фазы ежедневной цели

```
learning  → тренировать стихи в статусе LEARNING (фаза изучения)
review    → повторять стихи в статусе REVIEW (фаза повторений)
completed → все запланированные стихи пройдены за день
empty     → нет доступных стихей для тренировки
```

### 10.3 API readiness (`/api/users/[telegramId]/daily-goal/readiness`)

Возвращает количество доступных стихей для каждой фазы и статус готовности. Результат используется для отображения карточки дневной цели на Dashboard.

### 10.4 useDailyGoalController

```typescript
// Ключевые методы
ensureSessionForToday()       // создать/получить сессию для сегодня
markDailyGoalStarted()        // зафиксировать начало тренировки
applyProgressEvent(event)     // обновить прогресс после тренировки стиха
getNextTargetVerseId()        // получить следующий рекомендуемый стих
computeUiState()              // вычислить UI-состояние для Dashboard
```

---

## 11. Последовательность загрузки (Boot Sequence)

```
1. layout.tsx
   ├── Загружает Telegram SDK: <Script src="https://telegram.org/js/telegram-web-app.js">
   ├── Подключает шрифты (Inter, Lora) через Google Fonts
   └── Устанавливает тёмную тему: className="dark"

2. page.tsx (Client Component)
   ├── Показывает boot overlay с анимированным progress bar
   ├── Инициализирует <TelegramProvider>
   └── Ждёт onInitialContentReady() от App.tsx

3. TelegramContext.tsx
   ├── Вызывает useTelegramWebApp()
   ├── Инициализирует Telegram.WebApp (fullscreen, disable swipes, etc.)
   ├── Извлекает user из initDataUnsafe
   └── Предоставляет telegramId через useTelegram()

4. App.tsx
   ├── POST /api/users/telegram → создать/получить User
   ├── GET /api/users/{id}/verses → загрузить все стихи
   ├── GET /api/users/{id}/daily-goal/readiness → готовность к цели
   ├── Вызывает onInitialContentReady()
   └── Рендерит Dashboard

5. page.tsx: boot overlay фейдится через ~450ms + 350ms задержки
```

---

## 12. Ключевые потоки данных (Flows)

### 12.1 Добавление стиха

```
Пользователь нажимает "+"
  → AddVerseDialog открывается
  → Поиск через bolls.life API (POST /api/bolls/verses)
  → Выбор стиха из результатов
  → POST /api/users/{telegramId}/verses
     body: { externalVerseId, masteryLevel: 0 }
  → Успех → добавить стих в local state (setVerses)
  → Новый стих отображается в VerseList со статусом MY
```

### 12.2 Запуск тренировки через Daily Goal

```
Dashboard → "Начать тренировку"
  → useDailyGoalController.ensureSessionForToday()
  → Построить план (buildDailyGoalPlan)
  → Открыть VerseGallery с targetVerseIds.new (фаза learning)
  → Пользователь выбирает стих в карусели
  → Нажимает "Тренироваться"
  → Открывается TrainingSession
```

### 12.3 Тренировочная сессия

```
TrainingSession открывается
  ├── Читает lastTrainingModeId из verse (VerseCardDto)
  ├── Вызывает chooseTrainingModeId() → определяет первый режим
  └── Рендерит TrainingModeRenderer → ExerciseComponent

Пользователь завершает упражнение → выбирает оценку (0-3)
  ├── applyMasteryDelta({ delta }) → rawMasteryAfter, graduatesToReview
  ├── Оптимистично обновляет verses в App.tsx
  ├── PATCH /api/users/{id}/verses/{externalVerseId}
  │    body: { masteryLevel, repetitions?, nextReviewAt?, lastTrainingModeId }
  ├── Успех → применить ответ (pickMutableVersePatchFromApiResponse)
  ├── DailyGoalProgressEvent → applyProgressEvent()
  └── Перейти к следующему стиху или завершить сессию
```

### 12.4 Прогрессия stиха (пример)

```
Стих с masteryLevel=6, rating=2 ("Хорошо"):
  delta = +1
  rawMasteryAfter = 7 → clamp([1,7]) = 7
  graduatesToReview = true

  На бэке (PATCH guard):
    currentMasteryLevel=6 < 7, requestedMasteryLevel=7 >= 7
    → autoNextReviewAt = now + 24h

  В БД: masteryLevel=7, nextReviewAt=завтра, status=LEARNING

  DisplayStatus вычисляется:
    repetitions=0 < 5 → не MASTERED
    masteryLevel=7, nextReviewAt в будущем → WAITING

Следующий день (nextReviewAt прошёл):
  DisplayStatus = REVIEW
  Режим: FirstLettersTyping (всегда для REVIEW)
  После успеха: repetitions=1, nextReviewAt=завтра → WAITING

После 5-го повторения:
  repetitions=5 → DisplayStatus = MASTERED
```

---

## 13. Внешние интеграции

### 13.1 Telegram WebApp SDK

```typescript
// Инициализация в useTelegramWebApp.ts
window.Telegram.WebApp.ready()
window.Telegram.WebApp.expand()               // полноэкранный режим
window.Telegram.WebApp.disableVerticalSwipes()
window.Telegram.WebApp.setHeaderColor("secondary_bg_color")

// Получение пользователя
const user = window.Telegram.WebApp.initDataUnsafe?.user
// { id: number, first_name, last_name?, username?, language_code? }

// Haptic Feedback (src/app/components/verse-list/haptics.ts)
window.Telegram.WebApp.HapticFeedback.impactOccurred("light" | "medium" | "heavy")
window.Telegram.WebApp.HapticFeedback.notificationOccurred("success" | "error" | "warning")

// Safe Area CSS-переменные (от Telegram SDK)
var(--tg-content-safe-area-inset-top)
var(--tg-content-safe-area-inset-bottom)
// CSS-классы: .pt-safe, .pb-safe, .pl-safe, .pr-safe (в globals.css)
```

### 13.2 Bolls.life Bible API

```typescript
// Прямой запрос (проксируется через /api/bolls/*)
POST https://bolls.life/get-verses/
Body: [{ translation: "SYNOD", book: 43, chapter: 3, verses: [16] }]
Response: [{ pk, translation, book, chapter, verse, text, comment }]

// Кэш: in-process Map (в памяти Next.js процесса), TTL = 6 часов
// Ключ кэша: "SYNOD-43-3"  (translation-book-chapter)
// Сброс: при перезапуске сервера
```

### 13.3 OpenAPI клиент (авто-генерация)

```bash
# Регенерация после изменения эндпоинтов:
npm run generate-api
# = npx tsx scripts/generate-openapi.ts
# + npx openapi-typescript-codegen --input openapi.json --output src/api --client axios
```

---

## 14. Производительность и оптимизации

### 14.1 Frontend

| Техника | Реализация |
|---|---|
| Виртуализация списка | react-virtuoso в VerseVirtualizedList.tsx (10000+ стихей) |
| Оптимистичные обновления | VersePatchEvent — нет loading-состояний при сохранении |
| Dynamic imports | Страницы Dashboard, VerseList загружаются лениво |
| Пагинация | 50 стихей за запрос, infinite scroll через Load More |
| Memo-изация | React.memo для тяжёлых компонентов карточек |

### 14.2 Backend

| Техника | Реализация |
|---|---|
| Кэш текстов | In-process Map для bolls.life ответов (6ч TTL) |
| Batch-запросы | Один запрос к bolls.life на главу (не на каждый стих) |
| Paginated fetch | Limit/offset в Prisma запросах |
| Select fields | Prisma select — только нужные поля |
| Neon pooler | @prisma/adapter-pg с connection pooling |

---

## 15. Инварианты (нельзя нарушать)

```
✅ masteryLevel для LEARNING стихей: ВСЕГДА [1, 7]
   Нарушение → стих застрянет в неверной фазе

✅ repetitions можно инкрементить ТОЛЬКО при masteryLevel >= 7
   Нарушение → стих станет MASTERED в обход фазы изучения

✅ При "Плохо" (rating=1): следующий режим = тот же (shift=0)
   Реализация → передавать lastModeId=null в chooseTrainingModeId

✅ При переходе masteryLevel: 6 → 7 (graduate):
   Автоматически установить nextReviewAt = now + 24h

✅ MASTERED проверяется раньше WAITING/REVIEW в computeDisplayStatus
   Нарушение → выученный стих будет показан как WAITING

✅ externalVerseId уникален для пары (telegramId, externalVerseId)
   Обеспечено: @@unique в Prisma schema

✅ DisplayStatus вычисляется на бэке при каждом ответе API
   Фронт получает готовый DisplayStatus — не пересчитывает самостоятельно

✅ lastTrainingModeId читается из БД при старте сессии
   и записывается при каждом PATCH после тренировки
```

---

## 16. История исправленных багов

### ✅ repetitions не обновлялись после тренировки REVIEW

**Файл:** `src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`
**Причина:** `canMutateRepetitionsByMastery` проверял `masteryLevel > 7`, но clamp даёт max 7 → условие никогда не выполнялось.
**Фикс:** изменено на `>= REVIEW_MASTERY_LEVEL_MIN` (>= 7).

### ✅ WAITING никогда не устанавливался

**Файл:** `src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`
**Причина:** `reachedWaitingThresholdNow` проверял `requestedMasteryLevel > 7` — невозможно при clamp до 7.
**Фикс:** `currentMasteryLevel < 7` && `requestedMasteryLevel >= 7`.

### ✅ body.nextReviewAt игнорировался

**Файл:** `src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`
**Причина:** поле не попадало в объект `data` для Prisma update.
**Фикс:** `resolvedNextReviewAt = body.nextReviewAt ?? autoNextReviewAt`.

### ✅ WAITING-условие в VerseGallery

**Файл:** `src/app/components/VerseGallery.tsx`
**Причина:** `deriveTrainingDisplayStatus` использовал `masteryLevel > MAX_MASTERY_LEVEL`.
**Фикс:** изменено на `masteryLevel >= MAX_MASTERY_LEVEL`.

### ✅ lastTrainingModeId не персистировался между сессиями

**Файлы:** `prisma/schema.prisma`, `verseCard.types.ts`, `[externalVerseId].ts`, компоненты.
**Фикс:** добавлено поле `lastTrainingModeId Int?` в схему; возвращается в DTO; фронт читает при инициализации сессии и записывает при каждом сохранении.

---

## 17. Быстрая справка: что где менять

| Задача | Файл | Идентификатор |
|---|---|---|
| Изменить порог MASTERED (сейчас 5 повторений) | `verseCard.types.ts` | `MASTERED_REPETITIONS_MIN` |
| Изменить количество уровней изучения (сейчас 7) | `shared/training/constants.ts` | `TRAINING_STAGE_MASTERY_MAX` |
| Изменить интервал между повторениями (сейчас 24ч) | `verseCard.types.ts` | `WAITING_NEXT_REVIEW_DELAY_HOURS` |
| Добавить новый режим тренировки | `shared/training/modeEngine.ts` | `TrainingModeId` enum + `TRAINING_MODE_PROGRESS_ORDER` |
| Изменить логику выбора режима | `shared/training/modeEngine.ts` | `chooseTrainingModeId()` |
| Изменить правила delta masteryLevel | `shared/training/modeEngine.ts` | `applyMasteryDelta()` |
| Изменить правила мутации repetitions | `verseCard.types.ts` | `canMutateRepetitionsByMastery` |
| Изменить интервал кэша bolls.life (сейчас 6ч) | `pages/api/bolls/verses.ts` | константа TTL |
| Добавить новый тег | Через API: `POST /api/tags` | — |
| Изменить схему БД | `prisma/schema.prisma` → `npm run prisma:push` | — |
| Регенерировать API-клиент | — | `npm run generate-api` |
| Настроить Telegram SDK | `app/hooks/useTelegramWebApp.ts` | инициализация |
| Изменить перевод Библии по умолчанию | `prisma/schema.prisma` | `Translation @default(SYNOD)` |
| Изменить размер страницы (сейчас 50) | `app/components/verse-list/constants.ts` | `PAGE_SIZE` |
