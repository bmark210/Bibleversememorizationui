# Bible Memory — Архитектура приложения

> Этот документ описывает итоговую архитектуру, пайплайн изучения стихов, инварианты данных и специфику фронтенда и бэкенда. Используется как контекст для AI-агентов.

---

## 1. Стек и окружение

| Слой | Технология |
|---|---|
| Фреймворк | Next.js (App Router + Pages API) |
| База данных | PostgreSQL + Prisma ORM |
| Платформа | Telegram Mini App (WebApp API) |
| UI | React, Tailwind CSS, Framer Motion (motion/react) |
| Иконки | Lucide React |
| Тосты | Sonner |
| Внешний API стихов | bolls.life |

Приложение — **Telegram Mini App**. Пользователь идентифицируется через `telegramId` (строка). Нет логина/пароля — авторизация через Telegram WebApp SDK.

---

## 2. База данных — Prisma Schema

```
enum VerseStatus { NEW | LEARNING | STOPPED }
enum Translation { NRT | SYNOD | RBS2 | BTI }

User
  id            String  (cuid)
  telegramId    String  (unique)
  translation   Translation (default: SYNOD)
  dailyGoalsCompleted  Int
  dailyStreak          Int
  verses        UserVerse[]

UserVerse
  id              Int      (autoincrement)
  telegramId      String   → User.telegramId
  externalVerseId String   (формат: "book-chapter-verse", напр. "43-3-16")
  status          VerseStatus (default: NEW)
  masteryLevel    Int      (default: 0)
  repetitions     Int      (default: 0)
  lastReviewedAt  DateTime?
  nextReviewAt    DateTime?
  createdAt / updatedAt

  @@unique([telegramId, externalVerseId])

Tag
  id    String (cuid)
  slug  String (unique) — напр. "faith"
  title String (unique) — напр. "Вера"

VerseTag
  externalVerseId String
  tagId           String → Tag.id
  @@unique([externalVerseId, tagId])
```

### Ключевые правила схемы

- `VerseStatus` в БД хранит ТОЛЬКО три значения: `NEW`, `LEARNING`, `STOPPED`
- `REVIEW`, `WAITING`, `MASTERED` — **виртуальные (вычисляемые) статусы**, они никогда не пишутся в БД
- `externalVerseId` — это ID из bolls.life API в формате `"{book}-{chapter}-{verse}"`
- `masteryLevel` для LEARNING стихей ВСЕГДА в диапазоне `[1, 7]` — не 0, не 8+

---

## 3. Система статусов — полная карта

### 3.1 Как вычисляется DisplayStatus (функция `computeDisplayStatus`)

```
DB: status=NEW                          → DisplayStatus: "NEW"
DB: status=STOPPED                      → DisplayStatus: "STOPPED"
DB: status=LEARNING, repetitions >= 5   → DisplayStatus: "MASTERED"
DB: status=LEARNING, masteryLevel >= 7,
    nextReviewAt в БУДУЩЕМ              → DisplayStatus: "WAITING"
DB: status=LEARNING, masteryLevel >= 7  → DisplayStatus: "REVIEW"
DB: status=LEARNING, masteryLevel 1-6   → DisplayStatus: "LEARNING"
```

**Порядок проверок важен** — MASTERED проверяется раньше WAITING/REVIEW.

### 3.2 Таблица состояний

```
DB status | masteryLevel | repetitions | nextReviewAt   → Display
---------------------------------------------------------------------
NEW       | 0            | 0           | null           → NEW
LEARNING  | 1–6          | 0           | null           → LEARNING  ← фаза изучения
LEARNING  | 7            | 0           | null           → REVIEW    ← фаза повторений (готова)
LEARNING  | 7            | 1–4         | прошедшая/null → REVIEW    ← пора повторять
LEARNING  | 7            | 1–4         | будущая        → WAITING   ← ждём следующего дня
LEARNING  | 7            | >= 5        | любая          → MASTERED  ← выучен полностью
STOPPED   | любой        | любой       | любая          → STOPPED
```

### 3.3 Что означает STOPPED

- Это "пауза". Пользователь приостановил стих.
- По значению `masteryLevel > 0` можно понять, что стих был в LEARNING до паузы.
- Составные статусы (`LEARNING_STOPPED` и т.п.) **не нужны** — всё выводится из числовых полей.

---

## 4. Пайплайн изучения стиха (полный)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ПАЙПЛАЙН ИЗУЧЕНИЯ СТИХА                          │
└─────────────────────────────────────────────────────────────────────────┘

  [Добавить стих]
       │
       ▼
  ┌─────────┐
  │   NEW   │  masteryLevel=0, repetitions=0
  │         │  Карточка только для чтения. Нельзя тренироваться.
  └────┬────┘
       │ пользователь нажимает "Добавить в изучение"
       │ → status = LEARNING, masteryLevel = 1
       ▼
  ╔══════════════════════════════════════════════════════════════╗
  ║                    ФАЗА 1: LEARNING                          ║
  ║         masteryLevel ∈ [1, 7]  |  status = LEARNING         ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║  masteryLevel → режим тренировки:                           ║
  ║    0–1 → ClickChunks          (нажимать блоки текста)       ║
  ║    2   → ClickWordsHinted     (слова с подсказками)         ║
  ║    3   → ClickWordsNoHints    (слова без подсказок)         ║
  ║    4   → FirstLettersWithWordHints (первые буквы + слова)   ║
  ║    5   → FirstLettersTapNoHints    (первые буквы, тап)      ║
  ║    6   → FirstLettersTyping        (первые буквы, ввод)     ║
  ║    7   → FullRecall                (полный ввод текста)     ║
  ║                                                              ║
  ║  Оценки после тренировки → delta masteryLevel:             ║
  ║    "Забыл"   (0) → delta = −1    ← понижаем                ║
  ║    "Плохо"   (1) → delta =  0    ← повторяем тот же режим  ║
  ║    "Хорошо"  (2) → delta = +1    ← следующий режим         ║
  ║    "Отлично" (3) → delta = +2    ← перескакиваем режим     ║
  ║                                                              ║
  ║  ИНВАРИАНТЫ (строго соблюдать):                             ║
  ║    • masteryLevel всегда clamp([1, 7]) при status=LEARNING  ║
  ║    • При "Плохо": следующий режим = тот же (lastModeId=null)║
  ║    • При других оценках: следующий режим ≠ предыдущему      ║
  ║    • masteryLevel НИКОГДА не прыгает выше 7 в этой фазе    ║
  ║                                                              ║
  ║  masteryLevel достиг 7 → graduatesToReview = true          ║
  ║  → DisplayStatus переходит в REVIEW                         ║
  ╚══════════════════════════╦═══════════════════════════════════╝
                             │ masteryLevel = 7
                             ▼
  ╔══════════════════════════════════════════════════════════════╗
  ║                    ФАЗА 2: REVIEW                            ║
  ║         masteryLevel = 7  |  status = LEARNING (в БД)       ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║  Режим тренировки фиксированный: FirstLettersTyping         ║
  ║                                                              ║
  ║  После каждой успешной тренировки:                          ║
  ║    repetitions += 1                                          ║
  ║    nextReviewAt = now + 24h                                  ║
  ║    → DisplayStatus становится WAITING                        ║
  ║                                                              ║
  ║  Когда nextReviewAt наступает (прошли сутки):               ║
  ║    → DisplayStatus снова REVIEW (пора повторять)            ║
  ║                                                              ║
  ║  Нужно дойти до repetitions = 5                             ║
  ║                                                              ║
  ║  repetitions >= 5 → DisplayStatus = MASTERED                ║
  ╚══════════════════════════╦═══════════════════════════════════╝
                             │ repetitions = 5
                             ▼
                       ┌──────────┐
                       │ MASTERED │  Стих полностью выучен
                       └──────────┘

  В любой момент LEARNING/REVIEW/WAITING → STOPPED (пауза)
  STOPPED → LEARNING (возобновить) с сохранением masteryLevel
```

---

## 5. Режимы тренировки

```typescript
enum TrainingModeId {
  ClickChunks = 1,           // кликать блоки — самый простой
  ClickWordsHinted = 2,      // слова с подсказками
  ClickWordsNoHints = 3,     // слова без подсказок
  FirstLettersWithWordHints = 4,
  FirstLettersTapNoHints = 5,
  FirstLettersTyping = 6,    // ввод первых букв (режим REVIEW)
  FullRecall = 7,            // полный ввод текста — самый сложный
}

// Порядок прогресса (от простого к сложному):
[1, 2, 3, 4, 5, 6, 7]

// Оценка → сдвиг в порядке:
rating 0 ("Забыл")   → shift = −1
rating 1 ("Плохо")   → shift =  0  ← ОСОБЫЙ СЛУЧАЙ: тот же режим
rating 2 ("Хорошо")  → shift = +1
rating 3 ("Отлично") → shift = +2
```

### Алгоритм выбора следующего режима (`chooseTrainingModeId`)

```
1. Определить базовый режим по masteryLevel: getBaseTrainingModeForMastery(stageMasteryLevel)
2. Сформировать кандидатов: от базового режима расширяться влево и вправо
3. Выбрать первого кандидата ≠ lastModeId (если НЕ "Плохо")
4. Если "Плохо" (rating=1): передать lastModeId=null → функция вернёт тот же режим

// lastTrainingModeId Int? хранится в БД и возвращается в VerseCardDto.
// Оба компонента (VerseGallery, TrainingSession) читают его при инициализации
// сессии и записывают после каждого PATCH.
```

---

## 6. Бэкенд — API эндпоинты

### Маршруты (Pages API, `/src/pages/api/`)

```
POST   /api/users/telegram              → создать/получить пользователя по telegramId
GET    /api/users/[telegramId]          → профиль пользователя

GET    /api/users/[telegramId]/verses              → список стихей (пагинация, фильтры)
POST   /api/users/[telegramId]/verses              → добавить стих (NEW → LEARNING)
PATCH  /api/users/[telegramId]/verses/[id]         → обновить прогресс стиха
DELETE /api/users/[telegramId]/verses/[id]         → удалить стих

GET    /api/users/[telegramId]/verses/review       → стихи в статусе REVIEW
GET    /api/users/[telegramId]/daily-goal/readiness → готовность к ежедневной цели

GET    /api/bolls/verses                → тексты стихей из bolls.life
GET    /api/bolls/parallel              → параллельные переводы
GET    /api/bolls/translations          → список переводов

GET    /api/verses/[externalVerseId]/tags → теги стиха
GET    /api/tags                          → все теги

GET    /api/docs                          → Swagger UI
```

### Правила PATCH `/verses/[externalVerseId]`

```
Тело запроса: { masteryLevel?, repetitions?, lastReviewedAt?, nextReviewAt?, status? }

GUARDS на бэке:
  1. Если status=LEARNING и body содержит masteryLevel:
       → clamp(masteryLevel, 1, 7)  — нельзя выйти за границы фазы изучения

  2. Если body содержит repetitions (и значение изменилось):
       → canMutateRepetitions = status=LEARNING AND masteryLevel >= 7
       → Если false → 409 Conflict

  3. Если LEARNING, currentMasteryLevel < 7, requestedMasteryLevel >= 7:
       → Автоматически устанавливается nextReviewAt = now + 24h
       (первый переход в REVIEW фазу)

Правила guards:
   canMutateRepetitionsByMastery  → masteryLevel >= REVIEW_MASTERY_LEVEL_MIN (>= 7) ✅
   reachedWaitingThresholdNow    → currentMasteryLevel < 7 И requestedMasteryLevel >= 7 ✅
   resolvedNextReviewAt           → body.nextReviewAt ?? autoNextReviewAt ✅
```

### Ключевые константы (`verseCard.types.ts`, `constants.ts`)

```typescript
TRAINING_STAGE_MASTERY_MAX = 7      // максимальный masteryLevel в фазе LEARNING
REVIEW_MASTERY_LEVEL_MIN = 7        // порог для перехода в REVIEW
WAITING_MASTERY_LEVEL_MIN_EXCLUSIVE = 7  // использовать как >= 7, не > 7 (см. баг выше)
MASTERED_REPETITIONS_MIN = 5        // сколько повторений нужно для MASTERED
WAITING_NEXT_REVIEW_DELAY_HOURS = 24  // интервал между повторениями
```

### Как вычисляется DisplayStatus на бэке

Функция `computeDisplayStatus(baseStatus, masteryLevel, repetitions, nextReviewAt)` вызывается в `mapUserVerseToVerseCardDto` при каждом ответе API. Фронт получает уже готовый `DisplayStatus`. В БД статус ВСЕГДА `NEW | LEARNING | STOPPED`.

### Обогащение стихей текстом

При каждом GET запросе списка стихей бэк:
1. Достаёт `UserVerse[]` из PostgreSQL
2. Группирует по книге+главе
3. Батч-запрашивает тексты из bolls.life API
4. Кэширует главы в памяти на 6 часов (in-process, не Redis)
5. Возвращает `VerseCardDto[]` с полями `text` и `reference`

⚠️ Кэш живёт в памяти Next.js процесса. При рестарте сервера сбрасывается.

---

## 7. Фронтенд — структура

### Точка входа

```
page.tsx → <TelegramProvider> → <App>
```

`App.tsx` — главный компонент. Управляет:
- Загрузкой данных пользователя и стихей
- Глобальным состоянием стихей (`verses: Verse[]`)
- Навигацией между экранами (SPA, без роутера)
- Синхронизацией патчей через `VersePatchEvent`

### Навигация (таб-бар)

```
Dashboard  → Главная с дэшбордом и ежедневной целью
VerseList  → Список всех стихей с фильтрами
Collections → Коллекции (тематические подборки)
Statistics → Статистика
Settings   → Настройки (перевод Библии и т.п.)
```

Дополнительные экраны (оверлеи/модалки):
- `VerseGallery` — карусель карточек для тренировки
- `AddVerseDialog` — поиск и добавление нового стиха
- `TrainingSession` — сессия тренировки (режимы изучения)

### Тип `Verse` (фронтовая модель)

```typescript
type Verse = {
  id: string | number
  externalVerseId: string         // "43-3-16"
  status: DisplayVerseStatus      // "NEW"|"LEARNING"|"REVIEW"|"WAITING"|"MASTERED"|"STOPPED"
  masteryLevel: number            // 0-7
  repetitions: number             // 0-5
  lastReviewedAt: string | null
  nextReviewAt: string | null
  text?: string                   // текст стиха (от bolls.life)
  reference?: string              // "Иоанна 3:16"
  tags: VerseCardTagDto[]
}
```

### Обновление стихей (оптимистичный патч)

Вместо полной перезагрузки при каждом действии используется паттерн `VersePatchEvent`:

```
Пользователь делает оценку
  → applyMasteryDelta() → вычислить новый masteryLevel
  → Оптимистично обновить состояние в App
  → PATCH /api/users/{id}/verses/{verseId}
  → При успехе: применить ответ сервера (pickMutableVersePatchFromApiResponse)
  → При ошибке: откатить патч
```

### Ежедневная цель (DailyGoal)

Сессия дневной цели хранится в **localStorage** (не в БД):

```typescript
DailyGoalSession {
  version: 1
  telegramId: string
  dayKey: string           // "2026-02-26"
  plan: DailyGoalPlan      // сколько стихей запланировано
  progress: DailyGoalProgress  // что уже сделано
}
```

Два этапа цели:
1. **learning** — тренировать стихи в статусе `LEARNING` (фаза 1)
2. **review** — повторять стихи в статусе `REVIEW` (фаза 2)

Readiness (готовность к цели) запрашивается с бэка (`/daily-goal/readiness`) и показывает сколько стихей доступно для каждой фазы.

---

## 8. Модуль `modeEngine.ts` — движок тренировок

Файл: `/src/shared/training/modeEngine.ts`

Ключевые функции:

```typescript
// Определить режим по masteryLevel
getBaseTrainingModeForMastery(stageMasteryLevel: number): TrainingModeId

// Выбрать следующий режим (не равный lastModeId, если rating != "Плохо")
chooseTrainingModeId({ rawMasteryLevel, stageMasteryLevel, lastModeId }): TrainingModeId

// Применить delta с соблюдением clamp
applyMasteryDelta({ isLearningVerse, rawMasteryBefore, masteryDelta }):
  { rawMasteryAfter: number, graduatesToReview: boolean }
  // LEARNING: clamp([1,7]), graduatesToReview когда достигает 7
  // не-LEARNING: clamp([0, ∞]), graduatesToReview всегда false

// Проверить, находится ли стих в фазе REVIEW по masteryLevel
isTrainingReviewRawMastery(rawMasteryLevel: number): boolean  // > TRAINING_STAGE_MASTERY_MAX
```

---

## 9. Важные инварианты (нельзя нарушать)

```
✅ masteryLevel для LEARNING стихей: ВСЕГДА [1, 7]
   Нарушение → стих навсегда застрянет в LEARNING или сломается REVIEW фаза

✅ repetitions можно инкрементить ТОЛЬКО при masteryLevel >= 7
   Нарушение → стих станет MASTERED без прохождения фазы изучения

✅ При "Плохо" (rating=1): следующий режим = тот же
   Нарушение → пользователь не будет перетренировывать слабые места

✅ При graduation (masteryLevel → 7): автоматически установить nextReviewAt
   Нарушение → стих будет сразу в REVIEW без первого интервала ожидания

✅ MASTERED проверяется РАНЬШЕ WAITING/REVIEW в computeDisplayStatus
   Нарушение → выученный стих может показаться как WAITING

✅ externalVerseId уникален для пары (telegramId, externalVerseId)
   Нарушение → дублирование записей прогресса

✅ DisplayStatus вычисляется на бэке — фронт НЕ должен вычислять его сам
   Нарушение → рассинхронизация между клиентами
```

---

## 10. Известные проблемы

> Все критические баги исправлены. Ниже — история и суть каждого фикса.

### ✅ ИСПРАВЛЕНО: repetitions не обновлялись

**Файл**: `src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`  
**Причина**: `canMutateRepetitionsByMastery` использовал `masteryLevel > 7`, но clamp даёт max 7.  
**Фикс**: изменено на `>= REVIEW_MASTERY_LEVEL_MIN` (>= 7).

### ✅ ИСПРАВЛЕНО: WAITING никогда не устанавливался

**Файл**: `src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`  
**Причина**: `reachedWaitingThresholdNow` требовал `requestedMasteryLevel > 7` (невозможно с clamp).  
**Фикс**: изменено на `< 7` и `>= 7` соответственно.

### ✅ ИСПРАВЛЕНО: body.nextReviewAt игнорировался

**Файл**: `src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`  
**Причина**: поле `nextReviewAt` из тела запроса не применялось в `data` spread.  
**Фикс**: добавлена `resolvedNextReviewAt = body.nextReviewAt ?? autoNextReviewAt`.

### ✅ ИСПРАВЛЕНО: WAITING-условие в VerseGallery

**Файл**: `src/app/components/VerseGallery.tsx`  
**Причина**: `deriveTrainingDisplayStatus` использовал `masteryLevel > MAX_MASTERY_LEVEL`.  
**Фикс**: изменено на `masteryLevel >= MAX_MASTERY_LEVEL`.

### ✅ ИСПРАВЛЕНО: lastTrainingModeId не персистировался

**Файлы**: `prisma/schema.prisma`, `verseCard.types.ts`, `[externalVerseId].ts`, `VerseGallery.tsx`, `TrainingSession.tsx`  
**Фикс**: добавлено поле `lastTrainingModeId Int?` в схему; бэк возвращает его в DTO; фронт читает при инициализации сессии и отправляет при каждом сохранении.

### ℹ️ "Плохо" = тот же режим — уже работало

`getModeByShiftInProgressOrder(modeId, 0)` в обоих компонентах корректно возвращает тот же режим при rating=1 (shift=0). Дополнительных изменений не требовалось.

---

## 11. Структура директорий

```
src/
├── app/
│   ├── App.tsx                    ← главный компонент, глобальный state
│   ├── page.tsx                   ← точка входа Next.js + boot анимация
│   ├── layout.tsx                 ← HTML shell, метатеги
│   ├── components/
│   │   ├── Layout.tsx             ← таб-бар навигация
│   │   ├── Dashboard.tsx          ← главный экран
│   │   ├── VerseList.tsx          ← список стихей
│   │   ├── VerseGallery.tsx       ← карусель карточек (тренировка)
│   │   ├── VerseCard.tsx          ← карточка стиха (shell)
│   │   ├── Collections.tsx        ← тематические подборки
│   │   ├── AddVerseDialog.tsx     ← поиск и добавление стиха
│   │   ├── training-session/      ← компоненты тренировочной сессии
│   │   │   └── modes/types.ts     ← TrainingModeProps, TrainingModeRating
│   │   └── ui/                    ← базовые UI компоненты
│   ├── contexts/
│   │   └── TelegramContext.tsx    ← Telegram WebApp SDK провайдер
│   ├── features/
│   │   └── daily-goal/
│   │       ├── types.ts           ← все типы ежедневной цели
│   │       ├── planner.ts         ← buildDailyGoalPlan()
│   │       ├── storage.ts         ← localStorage read/write
│   │       └── useDailyGoalController.ts ← React hook контроллер
│   ├── hooks/
│   │   ├── useTelegramWebApp.ts   ← хук инициализации Telegram
│   │   └── useBibleVerse.ts       ← хук загрузки одного стиха
│   ├── types/
│   │   ├── verseStatus.ts         ← DisplayVerseStatus, helper функции
│   │   └── verseSync.ts           ← VerseMutablePatch, VersePatchEvent
│   └── utils/
│       └── versePatch.ts          ← patching helpers
│
├── pages/api/                     ← Next.js API Routes (бэкенд)
│   ├── users/
│   │   ├── telegram.ts
│   │   ├── [telegramId].ts
│   │   └── [telegramId]/
│   │       ├── verses/
│   │       │   ├── index.ts           ← GET list, POST create
│   │       │   ├── [externalVerseId].ts ← PATCH update, DELETE
│   │       │   ├── review.ts          ← GET review verses
│   │       │   ├── verseCard.types.ts ← DTO типы + computeDisplayStatus
│   │       │   └── _shared.ts         ← fetchEnrichedUserVerses + pagination
│   │       └── daily-goal/
│   │           └── readiness.ts
│   ├── bolls/                     ← прокси к bolls.life API
│   ├── verses/                    ← теги стихей
│   └── tags/
│
├── shared/
│   └── training/
│       ├── modeEngine.ts          ← ДВИЖОК ТРЕНИРОВОК (главный файл логики)
│       ├── constants.ts           ← TRAINING_STAGE_MASTERY_MAX = 7
│       └── fullRecallTypingAssist.ts
│
├── api/                           ← автогенерированный OpenAPI клиент
│   ├── services/                  ← UserVersesService, UsersService и т.д.
│   ├── models/                    ← DTO модели
│   └── core/                      ← базовый fetch клиент
│
├── generated/prisma/              ← автогенерированный Prisma клиент
├── lib/
│   └── prisma.ts                  ← singleton PrismaClient
└── swagger/
    └── doc.ts                     ← Swagger документация
```

---

## 12. Специфика Telegram Mini App

- `telegramId` — строка, получается из `window.Telegram.WebApp.initDataUnsafe.user.id`
- Пользователь создаётся/получается через `POST /api/users/telegram`
- Нет традиционной аутентификации — всё на доверии telegramId
- `useTelegramWebApp.ts` — хук для инициализации SDK, получения пользователя, темы
- Приложение адаптировано под мобильный интерфейс, safe area, back button
- Haptic feedback используется в `verse-list/haptics.ts`

---

## 13. Быстрая справка: что где менять

| Задача | Файл |
|---|---|
| Изменить порог для MASTERED (сейчас 5 повторений) | `verseCard.types.ts` → `MASTERED_REPETITIONS_MIN` |
| Изменить кол-во уровней изучения (сейчас 7) | `constants.ts` → `TRAINING_STAGE_MASTERY_MAX` |
| Изменить интервал между повторениями (сейчас 24ч) | `verseCard.types.ts` → `WAITING_NEXT_REVIEW_DELAY_HOURS` |
| Добавить новый режим тренировки | `modeEngine.ts` → `TrainingModeId` + `TRAINING_MODE_PROGRESS_ORDER` |
| Изменить логику выбора режима | `modeEngine.ts` → `chooseTrainingModeId` |
| Изменить правила обновления masteryLevel | `modeEngine.ts` → `applyMasteryDelta` + `[externalVerseId].ts` |
| Изменить правила обновления repetitions | `verseCard.types.ts` → `canMutateRepetitionsByMastery` |
| Добавить новый тег | POST `/api/tags` или напрямую через Prisma |
| Изменить схему БД | `prisma/schema.prisma` → `npx prisma migrate dev` |
