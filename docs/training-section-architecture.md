# Архитектура раздела «Тренировка» — новая структура

> Документ описывает предложенную архитектуру нового раздела **Training**,
> объединяющего режим тренировки из VerseGallery и режим якорей (ReferenceTrainer),
> а также добавляющего выборочную тренировку из раздела «Стихи».

---

## 1. Текущее состояние (AS-IS)

### Навигация

```
┌─────────────┬──────────────┬────────────┬─────────────┬─────────────┐
│  Главная    │    Карта     │   Стихи    │   Якоря*    │   Профиль   │
│ (dashboard) │(progress-map)│  (verses)  │(references) │  (profile)  │
└─────────────┴──────────────┴────────────┴─────────────┴─────────────┘
                                                 ▲
                                    * показывается условно:
                                      только при ≥10 LEARNING стихов
```

### Что делает каждый раздел

```
Стихи (VerseList)
├── Список всех стихов (фильтры, теги, поиск, сортировка)
└── Открывает VerseGallery (портал поверх страницы)
        ├── Режим preview — просмотр и свайп по стихам
        └── Режим training — тренировка одного стиха
                 └── Определяет режим по masteryLevel стиха:
                      LEARNING  → прогрессивный пайплайн (ClickChunks → FullRecall)
                      REVIEW    → ротация (FirstLettersTyping / FullRecall / VoiceRecall)
                      MASTERED  → ❌ тренировка недоступна

Якоря (ReferenceTrainer)  — отдельный раздел навигации
├── Тренирует: ссылку, начало стиха, контекст — для ВСЕХ стихов (включая MASTERED)
└── Режимы: reference | incipit | context | mixed
```

### Проблемы текущей структуры

| # | Проблема |
|---|----------|
| 1 | Тренировка спрятана внутри VerseGallery — логика просмотра и обучения перемешаны |
| 2 | «Якоря» — скрытый раздел, доступен только при ≥10 LEARNING стихов |
| 3 | MASTERED стихи нельзя тренировать через VerseGallery |
| 4 | Нет возможности выбрать конкретные стихи из VerseList и тренировать их подборку |
| 5 | `"training"` закомментирован в `type Page` — был план, не реализован |

---

## 2. Предложенная архитектура (TO-BE)

### Навигация

```
┌─────────────┬──────────────┬────────────┬──────────────┬─────────────┐
│  Главная    │    Карта     │   Стихи    │  Тренировка  │   Профиль   │
│ (dashboard) │(progress-map)│  (verses)  │ (training)   │  (profile)  │
└─────────────┴──────────────┴────────────┴──────────────┴─────────────┘
                                                 ▲
                                    Постоянный раздел.
                                    Заменяет «Якоря».
```

---

## 3. Структура раздела «Тренировка»

### 3.1 Верхнеуровневая схема

```
Training (раздел)
│
├── [A] Training Hub — единый экран конфигурации перед стартом
│     1. Выбор режима (что тренируем)
│     2. Выбор очерёдности (в каком порядке)
│     3. Кнопка «Начать»
│     + отдельная кнопка «Подборка из Стихов» (переход в VerseList)
│
└── [B] Training Session — сессия тренировки
      Единый контейнер, который внутри запускает нужный движок:
      • mode=learning  → прогрессивный пайплайн (useTrainingFlow)
      • mode=review    → ротация (useTrainingFlow)
      • mode=anchor    → якоря (бывший ReferenceTrainer)
      • mode=mix       → случайный порядок из всех трёх
```

> **Почему НЕ 5 карточек?**
> Пять отдельных «входов» создают когнитивную нагрузку — пользователь не понимает
> разницу между «Ежедневная сессия» и «Повторение» (по сути это один пресет фильтра).
> Единый конфигуратор с двумя шагами (режим + порядок) — проще, гибче и масштабируемее.

---

### 3.2 Четыре режима тренировки

```
┌───────────────────────────────────────────────────────────────────┐
│  Режим              Стихи             Упражнения                  │
│  ─────────────────────────────────────────────────────────────    │
│                                                                   │
│  Изучение           LEARNING          Прогрессивный пайплайн      │
│                                       (ClickChunks → FullRecall)  │
│                                       modeId по masteryLevel      │
│                                                                   │
│  Повторение         REVIEW            Ротация сложных:            │
│                     (+ due сейчас)    FirstLettersTyping /         │
│                                       FullRecall / VoiceRecall    │
│                                                                   │
│  Закрепление        ВСЕ стихи         Якоря (бывш. ReferenceTrainer): │
│                     (LEARNING +       reference / incipit /       │
│                      REVIEW +         context / mixed             │
│                      MASTERED)        → внутри сессии ReferenceTrainer │
│                                       сам предлагает трек         │
│                                                                   │
│  Микс               ВСЕ стихи         Случайный порядок:          │
│                     (LEARNING +       один стих — пайплайн,       │
│                      REVIEW +         другой — ротация,           │
│                      MASTERED)        третий — якорь              │
│                                       modeId по статусу стиха     │
└───────────────────────────────────────────────────────────────────┘
```

### 3.3 Три варианта очерёдности

```
┌───────────────────────────────────────────────────────────────────┐
│  Очерёдность       Описание                   sortBy в API        │
│  ─────────────────────────────────────────────────────────────    │
│                                                                   │
│  По активности     Последние тренированные     updatedAt desc     │
│                    первыми (свежие ↑)                              │
│                                                                   │
│  По канону         Библейский порядок:          bible (canonical)  │
│                    Бытие → Откровение                              │
│                                                                   │
│  По популярности   Рейтинг / частота у          popularity desc   │
│                    других игроков ↑                                │
└───────────────────────────────────────────────────────────────────┘
```

> Это ТЕ ЖЕ `sortBy` значения, что уже есть в VerseList (`"updatedAt" | "bible" | "popularity"`).
> Переиспользуем существующую логику.

---

### 3.4 Training Hub (Главный экран) — визуально

```
┌───────────────────────────────────────────────────────────┐
│  Тренировка                                   12 стихов   │
│  ──────────────────────────────────────────────────────   │
│                                                           │
│  Режим                                                    │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌────────┐ │
│  │▪ Изучение  │ │ Повторение │ │Закреплен. │ │  Микс  │ │
│  │  (12)      │ │   (5)      │ │   (20)    │ │  (37)  │ │
│  └────────────┘ └────────────┘ └───────────┘ └────────┘ │
│                                                           │
│  Очерёдность                                              │
│  ┌────────────┐ ┌────────────┐ ┌─────────────┐           │
│  │▪ Активность│ │   Канон    │ │ Популярность│           │
│  └────────────┘ └────────────┘ └─────────────┘           │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │               [ Начать тренировку → ]               │ │
│  │              12 стихов · изучение · активность       │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│  или:                                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Подборка из Стихов                                 │ │
│  │  Перейдите в Стихи, настройте фильтры →             │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Логика конфигуратора:**

```typescript
type TrainingMode = 'learning' | 'review' | 'anchor' | 'mix';
type TrainingOrder = 'updatedAt' | 'bible' | 'popularity';

// Текущая конфигурация хранится в useState Training.tsx:
const [mode, setMode] = useState<TrainingMode>('learning');
const [order, setOrder] = useState<TrainingOrder>('updatedAt');

// Счётчик стихов пересчитывается автоматически при смене mode:
//   learning  → count LEARNING verses
//   review    → count REVIEW verses
//   anchor    → count ALL verses (LEARNING + REVIEW + MASTERED)
//   mix       → count ALL verses
```

---

### 3.5 Training Session — единый контейнер

```
Training Session
│
│  Props
│  ─────────────────────────────────────
│  verses: Verse[]              ← стихи, отсортированные по order
│  mode: TrainingMode           ← learning | review | anchor | mix
│  onClose: () => void
│  onVersePatched: (event) => void
│
│  Внутренняя логика по mode:
│  ─────────────────────────────────────
│
│  mode='learning':
│    → useTrainingFlow с subsetFilter='learning'
│    → прогрессивный пайплайн по masteryLevel:
│      0→ClickChunks, 1→ClickWordsHinted ... 6+→FullRecall
│
│  mode='review':
│    → useTrainingFlow с subsetFilter='review'
│    → ротация: FirstLettersTyping / FullRecall / VoiceRecall
│
│  mode='anchor':
│    → запускает AnchorSession (бывший ReferenceTrainer)
│    → внутри ReferenceTrainer сам выбирает трек
│      (reference / incipit / context / mixed)
│
│  mode='mix':
│    → useTrainingFlow без subsetFilter
│    → для каждого стиха modeId определяется по его статусу:
│      LEARNING → пайплайн, REVIEW/MASTERED → ротация
│    → рандомная перетасовка очерёдности
└─
```

**Визуально — одинаково для всех mode (кроме anchor):**

```
┌─────────────────────────────────────────┐
│  ← Назад    Иоанна 3:16     [2/8]  ···  │  ← Header
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │
│   │   TrainingCard                  │   │
│   │   (текущий режим упражнения)    │   │
│   │   ClickChunks / ClickWords /    │   │
│   │   FirstLetters / FullRecall...  │   │
│   └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [Плохо]  [Сложно]  [Хорошо]  [Отлично]│  ← Rating Footer
└─────────────────────────────────────────┘
```

**Для mode='anchor' — UI ReferenceTrainer (без изменений).**

---

## 4. Поток «Подборка из Стихов»

### 4.1 Принцип работы

> ⚠️ **Важно**: выборка — это не ручной отбор отдельных стихов.
> Подборкой является **текущий результат фильтров** в VerseList:
> комбинация статуса, тегов, поискового запроса и сортировки.
> Пользователь настраивает фильтры — и отфильтрованный набор становится подборкой для тренировки.

```
VerseList (раздел «Стихи»)            Training (раздел «Тренировка»)
─────────────────────────────          ────────────────────────────────────
  Обычный режим                              Training Hub
  [ фильтры: статус/теги/поиск ]            [ ... карточки ... ]
  [ список стихов ]                          [ Подборка из Стихов → ] ──┐
                                                                          │
  Режим выборки (selectionMode=true) ←──────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │ 🎯 Режим подборки для тренировки             │  ← баннер поверх Header
  │ Настройте фильтры — тренироваться будет      │
  │ весь отфильтрованный набор                   │
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │  [Изучение ▼]  [теги: #благодать]  [поиск]  │  ← существующий VerseListFilterCard
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │ Иоанна 3:16                    LEARNING      │
  │ Псалом 22:1                    LEARNING      │
  │ Притчи 3:5                     LEARNING      │
  │ ...                                          │  ← обычный список, только просмотр
  └──────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────┐
  │        [Отмена]  [Тренировать 12 стихов →]  │  ← sticky нижняя панель
  └──────────────────────────────────────────────┘
           │
           ▼
  Training — Verse Training Session
  verses = текущий отфильтрованный список (vm.pagination.verses)
```

### 4.2 Что передаётся в Training Session

Не ID стихов — а **снапшот** текущего фильтра, по которому Training Session
сам запрашивает/получает стихи. Либо упрощённый вариант: при подтверждении
передаётся уже загруженный `verses[]` (то, что сейчас в `vm.pagination.verses`).

```
Вариант A (проще, стартовая реализация):
  onSelectionConfirm(verses: Verse[])
  → Training получает готовый массив стихов
  → Обходит API, тренирует локально загруженный список

Вариант B (для больших наборов, будущее):
  onSelectionConfirm(filter: VerseListFilterSnapshot)
  → Training делает отдельный запрос с теми же параметрами фильтра
  → Поддерживает пагинацию в процессе тренировки
```

Рекомендация: **Вариант A** — достаточно для первой версии.

### 4.3 Стейт-машина

```
App / Router level state
─────────────────────────────────────────────────────────
verseSelectionState: {
  mode: 'idle' | 'selecting' | 'ready'
  verses: Verse[]      // снапшот отфильтрованного списка
}

Переходы:
  idle ──→ selecting    нажали «Подборка из Стихов» в Training Hub
                        → App переключает page='verses', selectionMode=true
  selecting ──→ ready   нажали «Тренировать N стихов» в VerseList
                        → App переключает page='training', verses=snapshot
  ready ──→ idle        сессия завершена / закрыта
  selecting ──→ idle    нажали «Отмена» в VerseList
```

### 4.4 Изменения в VerseList (только в selectionMode)

```
selectionMode=true добавляет:
  1. Баннер над фильтрами — «Режим подборки для тренировки»
  2. Sticky нижняя панель — «Тренировать N стихов» + «Отмена»
  3. VerseListFilterCard — без изменений, работает как обычно
  4. Карточки стихов — без изменений, только просмотр (gallery недоступна)

selectionMode НЕ добавляет:
  ✗ чекбоксы на карточках
  ✗ выделение отдельных стихов
  ✗ новые UI-элементы в карточках
```

### 4.5 Передача данных (props)

```typescript
// VerseList получает:
interface VerseListProps {
  // ... существующие props (без изменений)
  selectionMode?: boolean
  onSelectionConfirm?: (verses: Verse[]) => void  // передаёт vm.pagination.verses
  onSelectionCancel?: () => void
}

// Training получает:
interface TrainingProps {
  allVerses: Verse[]                          // все стихи (для Ежедневной сессии)
  selectionVerses?: Verse[]                  // снапшот из VerseList (для Подборки)
  onVersePatched: (event: VersePatchEvent) => void
  onRequestVerseSelection: () => void        // → App переключает в selectionMode
}
```

---

## 5. Что происходит с VerseGallery

```
VerseGallery (после рефакторинга)
│
│  Остаётся только в режиме preview:
│  ─────────────────────────────────────
│  • Свайп между стихами
│  • Просмотр текста и статуса
│  • Изменение статуса (LEARNING / REVIEW / MASTERED)
│  • Удаление стиха
│  • Теги
│
│  Удаляется из VerseGallery:
│  ─────────────────────────────────────
│  • panelMode: 'training'      →   переносится в TrainingSession
│  • useTrainingFlow            →   переносится в Training раздел
│  • TrainingCard               →   переносится / используется из Training
│  • GalleryFooter (rating)     →   используется из Training
│  • TrainingSubsetSelect       →   используется из Training Hub
│
│  Кнопка «Тренировать» в VerseGallery footer:
│  ─────────────────────────────────────
│  Вместо открытия training режима внутри Gallery →
│  переходит в раздел Training с этим стихом в качестве стартовой точки.
└─
```

---

## 6. Файловая структура (новая)

```
src/app/components/
│
├── VerseList/                     (без изменений, кроме режима выборки)
│   ├── VerseList.tsx
│   └── verse-list/
│       └── ... (существующие компоненты)
│
├── VerseGallery/                  (только preview-режим)
│   ├── VerseGallery.tsx           (упрощается — убирается training панель)
│   └── ...
│
├── Training/                      ← НОВЫЙ РАЗДЕЛ
│   ├── index.tsx                  re-export
│   ├── Training.tsx               оркестратор: Hub или активная сессия
│   │
│   ├── hub/
│   │   ├── TrainingHub.tsx        Главный экран выбора режима
│   │   ├── TrainingHubCard.tsx    Карточка запуска (Ежедневная / Якоря / ...)
│   │   └── useTrainingHubState.ts Логика: какие карточки показывать, счётчики
│   │
│   ├── session/
│   │   ├── TrainingSession.tsx    Оболочка — Verse Training Session
│   │   │                         (переиспользует useTrainingFlow, TrainingCard)
│   │   ├── useTrainingSession.ts  Хук-агрегатор (verses, progress, navigation)
│   │   └── TrainingSessionHeader.tsx  Заголовок с прогрессом и кнопкой выхода
│   │
│   ├── anchor/
│   │   ├── AnchorSession.tsx      Бывший ReferenceTrainer.tsx
│   │   └── useAnchorSession.ts    Логика якорей (перенесена из ReferenceTrainer)
│   │
│   ├── selection/
│   │   └── useVerseSelection.ts   Хук управления выборкой стихов
│   │
│   └── types.ts                   Общие типы раздела Training
│
├── training-session/              (существующие упражнения — без изменений)
│   ├── TrainingModeRenderer.tsx
│   ├── TrainingUiStateContext.tsx
│   └── modes/
│       ├── ClickChunksExercise.tsx
│       ├── ClickWordsExercise.tsx
│       └── ...
│
└── ReferenceTrainer/              (deprecated → заменяется Training/anchor/)
    └── ReferenceTrainer.tsx       Оставляем до полного переноса, потом удаляем
```

---

## 7. Навигационный флоу

### Сценарий 1: Стандартная тренировка (основной путь)

```
[Тренировка]
    ↓
  Training Hub
  Выбор режима: [Изучение ▪] [Повторение] [Закрепление] [Микс]
  Выбор порядка: [Активность ▪] [Канон] [Популярность]
  «12 стихов · изучение · по активности»
    ↓  [Начать тренировку →]
  Training Session (mode=learning, order=updatedAt)
```

### Сценарий 2: Подборка из Стихов

```
[Тренировка] → «Подборка из Стихов» → [Стихи] (режим выборки)
                                          ↓ пользователь настраивает фильтры:
                                            статус / теги / поиск / сортировка
                                          ↓ список обновляется в реальном времени
                                       «Тренировать 12 стихов»
                                          ↓
                               [Тренировка] → Training Session
                                              mode сохраняется из Hub
                                              verses = снапшот vm.pagination.verses
```

### Сценарий 3: Из VerseGallery → запуск тренировки

```
[Стихи] → тап на стих → VerseGallery (preview)
                             ↓ кнопка «Тренировать»
                         [Тренировка] → Training Session
                         (СКИП Hub, прямой запуск:
                          verse = текущий стих,
                          mode = auto по статусу стиха:
                            LEARNING → 'learning'
                            REVIEW   → 'review'
                            MASTERED → 'anchor')
```

### Сценарий 4: С Dashboard

```
[Главная] → кнопка «Тренировка»
         → [Тренировка] → Training Hub (конфигуратор)
```

---

## 8. Режимы тренировки: матрица доступности

```
               Изучение    Повторение    Закрепление    Микс
              (learning)   (review)      (anchor)       (mix)
  ──────────────────────────────────────────────────────────────
  LEARNING     ✅ pipeline  ─             ✅ якоря       ✅ auto
  REVIEW       ─            ✅ ротация    ✅ якоря       ✅ auto
  MASTERED     ─            ─             ✅ якоря       ✅ auto
  CATALOG      ─            ─             ─              ─
```

| Режим | Какие стихи попадают | Какие упражнения |
|-------|---------------------|-----------------|
| Изучение | только LEARNING | Прогрессивный пайплайн по masteryLevel |
| Повторение | только REVIEW | Ротация (FirstLettersTyping / FullRecall / VoiceRecall) |
| Закрепление | ВСЕ (LEARNING + REVIEW + MASTERED) | Якоря (reference / incipit / context / mixed) |
| Микс | ВСЕ (LEARNING + REVIEW + MASTERED) | Auto: для каждого стиха по его статусу |

---

## 9. Изменения в App.tsx

### Текущий state

```typescript
type Page = "dashboard" | "verses" | "references" | "progress-map" | "profile"
//                                     ^^^^^^^^^^  условный раздел якорей
```

### Новый state

```typescript
type Page = "dashboard" | "verses" | "training" | "progress-map" | "profile"
//                                    ^^^^^^^^^^  всегда виден в навигации

// Дополнительный state для выборки (filter-based, не ID-based):
type VerseSelectionState =
  | { mode: 'idle' }
  | { mode: 'selecting' }
  | { mode: 'ready'; verses: Verse[] }   // снапшот vm.pagination.verses на момент подтверждения
```

### Новые props для компонентов

```typescript
// VerseList получает:
interface VerseListProps {
  // ... существующие props (без изменений)
  selectionMode?: boolean
  // verses = текущий vm.pagination.verses в момент нажатия кнопки
  onSelectionConfirm?: (verses: Verse[]) => void
  onSelectionCancel?: () => void
}

// Training получает:
interface TrainingProps {
  allVerses: Verse[]                          // все стихи (для Ежедневной / Повторения / Закрепления)
  selectionVerses?: Verse[]                  // снапшот из VerseList (для Подборки); undefined = нет активной подборки
  onVersePatched: (event: VersePatchEvent) => void
  onRequestVerseSelection: () => void        // → App: page='verses', selectionMode=true
}
```

---

## 10. UX-детали

### Иконка для раздела «Тренировка»

```
Предлагаемые иконки из lucide-react:
  Dumbbell   — гантель (физическая тренировка)
  Brain      — уже используется в Dashboard
  GraduationCap — используется в ReferenceTrainer
  Zap        — молния (скорость/энергия)
  Target     — уже в Dashboard
  BookOpenCheck — книга с галкой ✅
```

Рекомендация: **`Dumbbell`** — не используется нигде, чётко ассоциируется с тренировкой.

### Badge на иконке Тренировки в навигации

```
Показывать число = (кол-во LEARNING + кол-во REVIEW due сегодня)
Если 0 — не показывать badge
```

### Переход «Тренировать» из VerseGallery (прямой запуск)

```
Текущая кнопка «Тренировать» в GalleryFooter:
  onClick → panelMode = 'training'   (в пределах VerseGallery)

После рефакторинга:
  onClick → onNavigateToTraining({ verse: currentVerse })
            ↓
            App.tsx: page = 'training', directLaunch = { verse, mode: autoByStatus }
            ↓
            Training.tsx видит directLaunch → ПРОПУСКАЕТ Hub
            → сразу запускает Training Session с этим стихом

  Авто-определение mode по статусу стиха:
    LEARNING → mode='learning' (прогрессивный пайплайн)
    REVIEW   → mode='review'   (ротация)
    MASTERED → mode='anchor'   (якоря)
```

### Почему НЕ дублировать фильтры VerseList внутри Training

```
Вопрос: нужна ли своя фильтрация внутри Training Hub?
Ответ:  НЕТ. Это дублирование.

Разделение ответственности:
  Стихи   = просмотр, управление, фильтрация
  Тренировка = конфигурация режима + запуск сессии

Если нужна выборка → через «Подборка из Стихов»:
  Training Hub → VerseList (selectionMode) → фильтры → подтверждение → обратно в Training

Фильтры в Training Hub только КОСВЕННЫЕ (выбор mode фильтрует по статусу):
  mode=learning   → автоматически: только LEARNING стихи
  mode=review     → автоматически: только REVIEW стихи
  mode=anchor/mix → автоматически: все стихи
```

---

## 11. Порядок реализации (рекомендуемый)

```
Шаг 1 — Добавить "training" в навигацию
─────────────────────────────────────────
  • Заменить "references" на "training" в type Page и Layout.tsx
  • Временно показывать заглушку <Training /> → «Раздел в разработке»
  • Убрать условие showReferencesSection

Шаг 2 — Создать Training Hub
──────────────────────────────
  • Training/Training.tsx — оркестратор
  • Training/hub/TrainingHub.tsx — карточки запуска
  • useTrainingHubState.ts — подсчёт стихов для каждой карточки

Шаг 3 — Перенести Anchor Training
───────────────────────────────────
  • Скопировать логику ReferenceTrainer → Training/anchor/AnchorSession.tsx
  • Подключить в Training как режим
  • Удалить старый ReferenceTrainer раздел

Шаг 4 — Создать Verse Training Session
────────────────────────────────────────
  • Training/session/TrainingSession.tsx
  • Переиспользует useTrainingFlow из VerseGallery (без копирования)
  • Подключить в Training Hub («Ежедневная сессия», «Только повторение», «Закрепление»)

Шаг 5 — Режим выборки в VerseList
────────────────────────────────────
  • Добавить prop selectionMode в VerseList (баннер + нижняя панель)
  • Баннер над фильтрами: «Режим подборки — настройте фильтры»
  • Sticky панель снизу: «Тренировать N стихов» + «Отмена»
  • Карточки без изменений — выборка = текущий отфильтрованный список
  • Подтверждение: onSelectionConfirm(vm.pagination.verses)
  • App.tsx координирует переход: verses→training→selectionMode

Шаг 6 — Убрать training из VerseGallery
──────────────────────────────────────────
  • GalleryFooter: кнопка «Тренировать» → навигация в Training
  • Удалить panelMode === 'training' из VerseGallery.tsx
  • Упростить useTrainingFlow (остаётся в /hooks, используется из Training)
```

---

## 12. Что НЕ меняется

- `src/shared/training/modeEngine.ts` — движок определения режимов (без изменений)
- `src/app/components/training-session/` — все упражнения (ClickChunks, ClickWords, etc.)
- `TrainingModeRenderer.tsx` — рендерер упражнений
- `VerseGallery` — остаётся для preview, просто без training-режима
- API: `persistTrainingVerseProgress`, `fetchReferenceTrainerVerses` — без изменений
- Toast система (Sonner, `id="gallery"` toaster переезжает в Training)

---

## Итог

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │                       Раздел «Тренировка»                            │
 │                                                                      │
 │  ┌────────────────────────────────────────────────────────────────┐  │
 │  │  Training Hub (конфигуратор)                                   │  │
 │  │                                                                │  │
 │  │  Режим:  [Изучение] [Повторение] [Закрепление] [Микс]         │  │
 │  │  Порядок: [Активность] [Канон] [Популярность]                 │  │
 │  │  Счётчик: «12 стихов»                                         │  │
 │  │                                                                │  │
 │  │            [ Начать тренировку → ]                              │  │
 │  │            [ Подборка из Стихов → ]                             │  │
 │  └────────────────────────────────────────────────────────────────┘  │
 │                          │                                           │
 │                          ▼                                           │
 │  ┌────────────────────────────────────────────────────────────────┐  │
 │  │  Training Session (единый контейнер)                           │  │
 │  │                                                                │  │
 │  │  mode=learning → useTrainingFlow (прогрессивный пайплайн)      │  │
 │  │  mode=review   → useTrainingFlow (ротация сложных)             │  │
 │  │  mode=anchor   → AnchorSession (reference/incipit/context)     │  │
 │  │  mode=mix      → useTrainingFlow (auto по статусу стиха)       │  │
 │  └────────────────────────────────────────────────────────────────┘  │
 │                                                                      │
 └──────────────────────────────────────────────────────────────────────┘

     Входы:
     ↑ Из Training Hub:    mode + order → отфильтрованные + отсортированные verses[]
     ↑ Из VerseList:       selectionMode → snapshot verses[] → Training Session
     ↑ Из VerseGallery:    кнопка «Тренировать» → прямой запуск (mode auto по статусу)
```
