# Промпт: Переработка системы интервального повторения (Spaced Repetition Overhaul)

## Контекст проекта

Bible Verse Memorization UI — Telegram Mini App на Next.js (App Router), React 18, TypeScript, Tailwind CSS, Prisma ORM. Приложение помогает запоминать библейские стихи через систему прогрессивных упражнений и интервального повторения.

---

## ЦЕЛЬ

Переработать систему повторения так, чтобы полный цикл запоминания стиха занимал **2-3 месяца** вместо текущих 9 дней. Добавить механику **ступенчатых подсказок** во время review-сессий. Обеспечить долгосрочное удержание стихов в памяти.

---

## ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ (что есть сейчас)

### Схема БД (Prisma — `prisma/schema.prisma`)

Модель `UserVerse`:
```
masteryLevel: Int @default(0)       // 0-7, уровень освоения
repetitions: Int @default(0)        // 0-3, кол-во успешных review
referenceScore: Int @default(0)     // 0-100, score якоря "ссылка"
incipitScore: Int @default(0)       // 0-100, score якоря "начало"
contextScore: Int @default(0)       // 0-100, score якоря "контекст"
lastTrainingModeId: Int?            // ID последнего режима (1-8)
lastReviewedAt: DateTime?
nextReviewAt: DateTime?
status: VerseStatus @default(MY)    // MY | LEARNING | STOPPED
```

### Константы (`src/shared/constants/training.ts`)

```typescript
MASTERY_MAX = 7
REVIEW_REPETITIONS_MAX = 3
REVIEW_INTERVALS_DAYS = [1, 3, 5]           // ← СЛИШКОМ КОРОТКИЙ ЦИКЛ
REVIEW_FAIL_RETRY_MINUTES = 10              // ← СЛИШКОМ МАЛО
SPACED_REPETITION_MS_BY_STAGE = {
  0: 10min, 1: 1h, 2: 6h, 3: 24h,
  4: 3d, 5: 3d, 6: 3d, 7: 3d               // ← stages 4-7 одинаковые
}
RATING_MASTERY_DELTAS = { 0: -1, 1: 0, 2: 1, 3: 2 }
```

### Текущий flow пользователя

```
LEARNING (mastery 0→7, ~7 режимов):
  ClickChunks → ClickWordsHinted → ClickWordsNoHints →
  FirstLettersWithWordHints → FirstLettersTapNoHints →
  FirstLettersTyping → FullRecall

REVIEW (3 повторения за 9 дней):
  rep 0 → FirstLettersTyping (через 1 день)
  rep 1 → FullRecall (через 3 дня)
  rep 2 → VoiceRecall (через 5 дней) → MASTERED

MASTERED → Anchors (ручной запуск, нет расписания)
```

### Статусы (`src/modules/training/application/computeDisplayStatus.ts`)

```typescript
function computeDisplayStatus(masteryLevel, repetitions): DisplayStatus {
  if (repetitions >= REVIEW_REPETITIONS_MAX) return "MASTERED";
  if (masteryLevel >= MASTERY_MAX) return "REVIEW";
  return "LEARNING";
}
```

### Режимы review (`src/shared/training/modeEngine.ts`)

```typescript
REVIEW_TRAINING_MODE_ROTATION = [FirstLettersTyping, FullRecall, VoiceRecall]

function getReviewModeByRepetition(repetitions): TrainingModeId {
  const index = clamp(repetitions, 0, REVIEW_TRAINING_MODE_ROTATION.length - 1);
  return REVIEW_TRAINING_MODE_ROTATION[index];
}
```

### Рейтинг в review (`src/app/components/training-session/modes/TrainingRatingButtons.tsx`)

При review показываются только 2 кнопки:
- "Забыл" (rating 0)
- "Вспомнил" (rating 2)

### Вычисление прогресса review (`src/modules/training/application/computeProgressDelta.ts`)

```typescript
// Review success: rating >= 2
if (rating >= REVIEW_SUCCESS_RATING_MIN) {
  repetitions += 1;
  nextReviewAt = REVIEW_INTERVALS_DAYS[repetitions]; // 1, 3, или 5 дней
} else {
  // Fail: retry через 10 минут, repetitions не меняется
  nextReviewAt = now + 10 минут;
}
```

### API endpoint (`src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`)

PATCH endpoint принимает:
```
{ masteryLevel, repetitions, status, lastReviewedAt, nextReviewAt, lastTrainingModeId }
```
Сервер clamping: masteryLevel [1-7] для LEARNING. Repetitions можно менять только если masteryLevel >= 7.

### Автовыбор режима (`src/app/components/Training/Training.tsx`)

```typescript
function autoModeForVerse(verse): TrainingMode {
  if (status === "REVIEW") return "review";
  if (status === "MASTERED") return "anchor";
  return "learning";
}
```

---

## ЧТО НУЖНО ИЗМЕНИТЬ

### 1. Увеличить review-цикл до 2-3 месяцев

**Файл: `src/shared/constants/training.ts`**

Изменить:
```typescript
// БЫЛО:
REVIEW_REPETITIONS_MAX = 3
REVIEW_INTERVALS_DAYS = [1, 3, 5]
REVIEW_FAIL_RETRY_MINUTES = 10

// СТАЛО:
REVIEW_REPETITIONS_MAX = 7
REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60, 90]
REVIEW_FAIL_RETRY_MINUTES = 360  // 6 часов
```

**Важно:** `TOTAL_REPEATS_AND_STAGE_MASTERY_MAX` (строка 56-57) используется для расчёта прогресс-бара. Сейчас = 7 + 3 = 10. Станет = 7 + 7 = 14. Проверить все места, где используется это значение, и убедиться что прогресс-бар и процентные расчёты работают корректно.

### 2. Разнести интервалы learning stages 4-7

**Файл: `src/shared/constants/training.ts`**

Изменить:
```typescript
// БЫЛО:
SPACED_REPETITION_MS_BY_STAGE = {
  0: 10min, 1: 1h, 2: 6h, 3: 24h,
  4: 3d, 5: 3d, 6: 3d, 7: 3d    // всё одинаковое
}

// СТАЛО:
SPACED_REPETITION_MS_BY_STAGE = {
  0: 10 * 60 * 1000,             // 10 минут
  1: 60 * 60 * 1000,             // 1 час
  2: 6 * 60 * 60 * 1000,         // 6 часов
  3: 24 * 60 * 60 * 1000,        // 1 день
  4: 2 * 24 * 60 * 60 * 1000,    // 2 дня  (было 3)
  5: 3 * 24 * 60 * 60 * 1000,    // 3 дня  (без изменений)
  6: 5 * 24 * 60 * 60 * 1000,    // 5 дней (было 3)
  7: 7 * 24 * 60 * 60 * 1000,    // 7 дней (было 3)
}
```

### 3. Расширить ротацию режимов review

**Файл: `src/shared/training/modeEngine.ts`**

Сейчас ротация всего из 3 режимов: `[FirstLettersTyping, FullRecall, VoiceRecall]`.
При 7 повторениях режимы будут циклически повторяться.

Изменить:
```typescript
// БЫЛО:
REVIEW_TRAINING_MODE_ROTATION = [FirstLettersTyping, FullRecall, VoiceRecall]

// СТАЛО:
REVIEW_TRAINING_MODE_ROTATION = [
  TrainingModeId.FirstLettersTyping,    // rep 0: день 1 — лёгкий старт
  TrainingModeId.FullRecall,            // rep 1: день 3 — полный recall
  TrainingModeId.VoiceRecall,           // rep 2: день 7 — голосовой
  TrainingModeId.FullRecall,            // rep 3: день 14 — полный recall
  TrainingModeId.VoiceRecall,           // rep 4: день 30 — голосовой (месяц!)
  TrainingModeId.FullRecall,            // rep 5: день 60 — полный recall
  TrainingModeId.FullRecall,            // rep 6: день 90 — финальный recall
]
```

**Внимание:** функция `getReviewModeByRepetition()` использует `clamp(repetitions, 0, ROTATION.length - 1)`. При новом массиве из 7 элементов она будет работать корректно без изменений, но проверить что `repetitions` передаётся как текущее значение (0-6), а не следующее (1-7).

### 4. Обновить computeDisplayStatus

**Файл: `src/modules/training/application/computeDisplayStatus.ts`**

Логика `repetitions >= REVIEW_REPETITIONS_MAX` уже использует константу. При изменении `REVIEW_REPETITIONS_MAX` на 7 — MASTERED будет достигаться при `repetitions >= 7`. Проверить что нигде нет хардкода `3`.

**Искать во всех файлах:** `repetitions >= 3`, `repetitions === 3`, `repetitions > 2`, `=== "MASTERED"` — убедиться что всё завязано на константы.

### 5. Обновить рейтинг review с учётом подсказок

**Файл: `src/app/components/training-session/modes/TrainingRatingButtons.tsx`**

Сейчас review имеет 2 кнопки: "Забыл" (0) и "Вспомнил" (2).
Добавить третью опцию для случая "вспомнил с подсказкой":

```typescript
// Review-режим — 3 кнопки:
// "Забыл"           → rating 0 (не вспомнил даже с подсказкой)
// "С подсказкой"    → rating 1 (вспомнил после подсказки)
// "Вспомнил"        → rating 2 (вспомнил без подсказки)
```

**Визуал кнопок:**
- "Забыл" — rose/red (rating 0) — masteryDelta: -1
- "С подсказкой" — amber/orange (rating 1) — masteryDelta: 0, repetitions НЕ увеличивается
- "Вспомнил" — emerald/green (rating 2) — masteryDelta: +1, repetitions +1

**Важно:** Рейтинг 1 в review-фазе НЕ должен засчитываться как успешное повторение. В `computeReviewResult()` success определяется как `rating >= REVIEW_SUCCESS_RATING_MIN` (которое = 2). При rating 1 repetitions не увеличится, но nextReviewAt нужно установить на более короткий интервал чем при полном fail.

### 6. Изменить логику retry при частичном успехе (rating 1 в review)

**Файл: `src/modules/training/application/computeProgressDelta.ts`**

Сейчас есть только 2 ветки: success (rating >= 2) и fail (rating < 2). Нужна третья ветка для "с подсказкой" (rating === 1):

```typescript
function computeReviewResult(rating, currentRepetitions, now) {
  if (rating >= 2) {
    // Полный успех — repetitions +1, следующий интервал
    return { repetitions: rep + 1, nextReviewAt: REVIEW_INTERVALS[rep + 1], successful: true };
  }

  if (rating === 1) {
    // С подсказкой — repetitions БЕЗ ИЗМЕНЕНИЙ, повторить через 1 день
    // (не 10 минут как при полном fail, но и не полный интервал)
    return { repetitions: rep, nextReviewAt: now + 24h, successful: false };
  }

  // Полный fail — repetitions БЕЗ ИЗМЕНЕНИЙ, повторить через 6 часов
  return { repetitions: rep, nextReviewAt: now + 6h, successful: false };
}
```

### 7. Механика подсказок (HINT SYSTEM) для review-упражнений

#### 7.1. Концепция

Во время review-упражнений (FullRecall, VoiceRecall, FirstLettersTyping) пользователь может запросить подсказку через кнопку. Подсказки ступенчатые — каждый следующий уровень раскрывает больше текста. Использование подсказки автоматически ограничивает максимальный рейтинг до 1 ("С подсказкой").

#### 7.2. Уровни подсказок

| Уровень | Что показывается | Описание |
|---------|------------------|----------|
| 0 | Ничего | Без подсказки (по умолчанию) |
| 1 | Первые буквы каждого слова | "В н б С и С б у Б" — минимальный толчок |
| 2 | Первые 3-4 слова стиха | "В начале было Слово..." — запуск recall цепочки |
| 3 | Полный текст стиха | Показать весь стих для перечитывания. Rating = 0 автоматически |

#### 7.3. UI реализация

**Кнопка подсказки** — добавить в компоненты упражнений (`FullRecallExercise.tsx`, `VoiceRecallExercise.tsx`, `FirstLettersKeyboardExercise.tsx`):

- Иконка: `Lightbulb` из lucide-react (или `Eye`)
- Позиция: над полем ввода, справа, маленькая кнопка
- Поведение:
  - Первое нажатие → показывает hint level 1 (первые буквы)
  - Второе нажатие → показывает hint level 2 (первые слова)
  - Третье нажатие → показывает hint level 3 (весь стих)
- Визуал подсказки: всплывающий блок над/под полем ввода, полупрозрачный фон, текст подсказки
- Анимация: fade-in, можно закрыть тапом или автоскрыть через 5 секунд (кроме level 3)

**Показывать кнопку подсказки ТОЛЬКО в review-режиме** — в learning-фазе подсказки не нужны, потому что упражнения и так постепенно снимают "опоры".

#### 7.4. Состояние подсказки

Добавить state в компоненты упражнений:
```typescript
const [hintLevel, setHintLevel] = useState(0);  // 0 = нет подсказки
const [hintUsed, setHintUsed] = useState(false); // true если подсказка использовалась

const requestHint = () => {
  const nextLevel = Math.min(hintLevel + 1, 3);
  setHintLevel(nextLevel);
  setHintUsed(true);
};
```

#### 7.5. Передача hintUsed в рейтинг

**Способ реализации:**

Упражнения вызывают `onComplete()` когда пользователь завершает. Нужно передать `hintUsed` через этот callback или через ref.

В `TrainingModeRenderer.tsx` — компонент имеет `ref` с `TrainingModeRendererHandle`. Добавить метод `getHintUsed(): boolean` в handle, или передать через дополнительный prop/callback.

В `TrainingRatingButtons.tsx` — получить `hintUsed` и:
- Если `hintUsed === true` и `hintLevel < 3`: максимальный доступный рейтинг = 1
- Если `hintLevel === 3` (показан весь стих): рейтинг автоматически = 0
- Если `hintUsed === false`: показать обычные кнопки

**Варианты UI при hintUsed:**
```
hintLevel 1-2: Показать 2 кнопки: "Забыл" (0) и "С подсказкой" (1)
hintLevel 3:   Показать 1 кнопку: "Забыл" (0) — автоматически
hintUsed=false: Показать 3 кнопки: "Забыл" (0), "С подсказкой" (1), "Вспомнил" (2)
```

#### 7.6. Генерация текста подсказок

Создать утилиту `src/app/components/training-session/modes/hintUtils.ts`:

```typescript
import { tokenizeWords, getComparableFirstLetter } from './wordUtils';

export function generateHintLevel1(verseText: string): string {
  // Первые буквы каждого слова через пробел
  const words = tokenizeWords(verseText);
  return words.map(w => getComparableFirstLetter(w).toUpperCase()).join(' ');
}

export function generateHintLevel2(verseText: string): string {
  // Первые 3-4 слова стиха + "..."
  const words = tokenizeWords(verseText);
  const count = Math.min(4, Math.ceil(words.length * 0.2));
  return words.slice(0, count).join(' ') + '...';
}

export function generateHintLevel3(verseText: string): string {
  // Полный текст стиха
  return verseText;
}
```

**Важно:** Использовать существующие функции из `wordUtils.ts` (`tokenizeWords`, `getComparableFirstLetter`). НЕ дублировать логику токенизации.

#### 7.7. Компонент подсказки

Создать `src/app/components/training-session/modes/ReviewHint.tsx`:

```
Props:
- verseText: string
- isReview: boolean (показывать только в review)
- onHintUsed: () => void (callback когда подсказка использована)
- hintLevel: number
- onRequestHint: () => void

UI:
- Маленькая кнопка с иконкой Lightbulb + badge с номером доступного уровня
- При нажатии — всплывающий блок с текстом подсказки
- Цвет badge: amber при level 1-2, rose при level 3
- Текст "Подсказка снизит оценку" — показать при первом нажатии
```

### 8. Обновить flow для MASTERED-стихов

Сейчас MASTERED-стихи уходят в Anchors и всё. Нужно добавить **периодический FullRecall** для давно выученных стихов.

#### 8.1. Maintenance review для MASTERED

После достижения MASTERED (repetitions = 7):
- Через 180 дней (6 месяцев) стих автоматически должен появиться на review
- Реализация: при `computeDisplayStatus`, если `repetitions >= 7` И `nextReviewAt` не null И `nextReviewAt <= now` → показать стих как доступный для повторения

**Вариант реализации без изменения схемы:**
- При достижении MASTERED — установить `nextReviewAt = now + 180 дней` (вместо null)
- Не менять `repetitions` и `status`
- В Anchors уже фильтруются MASTERED стихи — это продолжит работать
- В VerseGallery/списке стихов — показать индикатор "пора повторить" для MASTERED стихов с истёкшим nextReviewAt

**Файл: `src/modules/training/application/computeProgressDelta.ts`**

В `computeReviewNextReviewAt()`: сейчас при `repetitions >= REVIEW_REPETITIONS_MAX` возвращает `null`. Изменить:
```typescript
if (successfulRepetitions >= REVIEW_REPETITIONS_MAX) {
  // Maintenance review через 180 дней
  return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
}
```

### 9. Полный обновлённый flow пользователя

```
═══════════════════════════════════════════════════════
ФАЗА 1: LEARNING (mastery 0 → 7, ~1-3 недели)
═══════════════════════════════════════════════════════

mastery 0 → ClickChunks           (через 10 мин)
mastery 1 → ClickWordsHinted      (через 1 час)
mastery 2 → ClickWordsNoHints     (через 6 часов)
mastery 3 → FirstLettersWithHints (через 1 день)
mastery 4 → FirstLettersTapNoHints(через 2 дня)
mastery 5 → FirstLettersTyping    (через 3 дня)
mastery 6 → FullRecall            (через 5 дней)
mastery 7 → GRADUATION → переход в REVIEW

Рейтинг: "Сложно"(1) / "Хорошо"(2) / "Легко"(3)
Подсказки: НЕТ (упражнения имеют встроенные подсказки)

═══════════════════════════════════════════════════════
ФАЗА 2: REVIEW (repetitions 0 → 7, ~3 месяца)
═══════════════════════════════════════════════════════

rep 0 → FirstLettersTyping  (через 1 день)
rep 1 → FullRecall           (через 3 дня)
rep 2 → VoiceRecall          (через 7 дней)
rep 3 → FullRecall           (через 14 дней)
rep 4 → VoiceRecall          (через 30 дней) ← месяц!
rep 5 → FullRecall           (через 60 дней) ← 2 месяца!
rep 6 → FullRecall           (через 90 дней) ← 3 месяца!
rep 7 → MASTERED

Рейтинг: "Забыл"(0) / "С подсказкой"(1) / "Вспомнил"(2)
Подсказки: ДА, ступенчатые (первые буквы → первые слова → полный текст)

Логика retry:
  rating 0 (забыл)       → repetitions без изменений, retry через 6 часов
  rating 1 (с подсказкой) → repetitions без изменений, retry через 1 день
  rating 2 (вспомнил)    → repetitions +1, следующий интервал по расписанию

═══════════════════════════════════════════════════════
ФАЗА 3: MASTERED + ANCHORS (бессрочно)
═══════════════════════════════════════════════════════

  Anchors (ручной запуск): reference/incipit/context тренировки
  Maintenance FullRecall: автоматически через 180 дней
  При maintenance review: такая же механика как в ФАЗЕ 2
    (подсказки доступны, 3 кнопки рейтинга)

═══════════════════════════════════════════════════════
```

---

## ФАЙЛЫ ДЛЯ ИЗМЕНЕНИЯ (полный список)

### Константы и бизнес-логика

| Файл | Что менять |
|------|-----------|
| `src/shared/constants/training.ts` | `REVIEW_REPETITIONS_MAX` → 7, `REVIEW_INTERVALS_DAYS` → [1,3,7,14,30,60,90], `REVIEW_FAIL_RETRY_MINUTES` → 360, `SPACED_REPETITION_MS_BY_STAGE` stages 4-7, `TOTAL_REPEATS_AND_STAGE_MASTERY_MAX` → 14 |
| `src/shared/training/modeEngine.ts` | `REVIEW_TRAINING_MODE_ROTATION` → массив из 7 элементов |
| `src/modules/training/application/computeProgressDelta.ts` | Добавить ветку `rating === 1` в `computeReviewResult()`, maintenance review в `computeReviewNextReviewAt()` |
| `src/modules/training/application/computeDisplayStatus.ts` | Проверить что использует константы (скорее всего без изменений) |

### UI компоненты

| Файл | Что менять |
|------|-----------|
| `src/app/components/training-session/modes/TrainingRatingButtons.tsx` | Добавить третью кнопку "С подсказкой" для review, логику hintUsed |
| `src/app/components/training-session/modes/FullRecallExercise.tsx` | Добавить кнопку подсказки и hint state для review-режима |
| `src/app/components/training-session/modes/VoiceRecallExercise.tsx` | Добавить кнопку подсказки и hint state для review-режима |
| `src/app/components/training-session/modes/FirstLettersKeyboardExercise.tsx` | Добавить кнопку подсказки для review-режима |

### Новые файлы

| Файл | Что создать |
|------|------------|
| `src/app/components/training-session/modes/hintUtils.ts` | Функции генерации текста подсказок |
| `src/app/components/training-session/modes/ReviewHint.tsx` | Компонент UI подсказки |

### Проверить на хардкод (grep по проекту)

Искать и заменить на константы если найдены:
- `repetitions >= 3` или `=== 3` или `> 2`
- `REVIEW_REPETITIONS_MAX` (проверить что все используют)
- `[1, 3, 5]` (хардкод интервалов)
- `10 * 60 * 1000` (10 минут retry)
- Число `10` в контексте `TOTAL_REPEATS_AND_STAGE_MASTERY_MAX`

---

## КРИТИЧЕСКИЕ НЮАНСЫ

### 1. Прогресс-бар

`TOTAL_REPEATS_AND_STAGE_MASTERY_MAX` меняется с 10 на 14. Все UI, показывающие процент прогресса, должны пересчитаться. Найти все использования в:
- `src/app/components/VerseGallery/utils.ts`
- `src/app/components/VerseGallery/components/VersePreviewCard.tsx`
- Любые другие компоненты с progress percentage

### 2. TrainingOutcomeCard

**Файл: `src/app/components/Training/session/TrainingOutcomeCard.tsx`** и **`trainingPendingOutcome.ts`**

При `repetitions >= 7` показывается outcome "mastered". Проверить что:
- Текст "Стих выучен" корректен
- Иконка Trophy показывается
- `nextReviewAt` для maintenance review (180 дней) корректно отображается

### 3. API endpoint guard

**Файл: `src/pages/api/users/[telegramId]/verses/[externalVerseId].ts`**

Сервер имеет guard: repetitions можно менять только если `masteryLevel >= 7`. Это правило остаётся. Но проверить что сервер принимает `repetitions` до 7 (а не максимум 3).

### 4. Anchor system eligibility

**Файл: `src/pages/api/users/[telegramId]/verses/reference-trainer/index.ts`** и связанные

Anchors фильтрует стихи со статусом REVIEW и MASTERED. При новом REVIEW_REPETITIONS_MAX = 7, стих дольше остаётся в REVIEW. Anchors должен работать с REVIEW стихами как и раньше — проверить что нет проблем.

### 5. Обратная совместимость

Пользователи, у которых уже `repetitions = 3` и стих MASTERED — они должны остаться MASTERED. Новая логика `repetitions >= 7` ломает это! Стихи с `repetitions = 3, 4, 5, 6` станут REVIEW.

**Решение — миграция данных:**
Создать Prisma-миграцию или скрипт который для всех UserVerse с `repetitions >= 3` (старый MASTERED порог) установит `repetitions = 7` (новый порог). Это сохранит статус MASTERED для уже выученных стихов.

```sql
UPDATE "UserVerse" SET repetitions = 7 WHERE repetitions >= 3 AND "masteryLevel" >= 7;
```

**ЭТО КРИТИЧЕСКИ ВАЖНО.** Без миграции все MASTERED стихи вернутся в REVIEW.

### 6. hintUsed передача через компоненты

Цепочка передачи hintUsed:
```
ReviewHint (внутри exercise)
  → Exercise component (FullRecallExercise / VoiceRecallExercise)
    → TrainingModeRenderer (через ref handle или callback prop)
      → TrainingSession / useTrainingSession
        → TrainingRatingButtons (определяет доступные кнопки)
```

**Рекомендуемый способ:** Добавить `hintUsed` в `TrainingModeRendererHandle` ref:
```typescript
export interface TrainingModeRendererHandle {
  reset: () => void;
  getHintUsed?: () => boolean;  // ДОБАВИТЬ
}
```

### 7. isReview prop для упражнений

Упражнения должны знать, что они в review-режиме, чтобы показать кнопку подсказки. Проверить как передаётся режим в exercise-компоненты. Скорее всего через `TrainingModeRenderer` props — найти и передать `isReview: boolean`.

### 8. TypeScript check

После всех изменений запустить:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit --skipLibCheck
```
Исправить все ошибки типов.

---

## ПОРЯДОК РЕАЛИЗАЦИИ

1. **Миграция данных** — скрипт для обновления repetitions у существующих MASTERED стихов
2. **Константы** — обновить все числовые значения
3. **computeProgressDelta** — добавить ветку rating 1, изменить retry, maintenance review
4. **modeEngine** — расширить REVIEW_TRAINING_MODE_ROTATION
5. **hintUtils.ts** — создать утилиты генерации подсказок
6. **ReviewHint.tsx** — создать UI компонент подсказки
7. **Exercise components** — интегрировать ReviewHint в FullRecall, VoiceRecall, FirstLettersKeyboard
8. **TrainingModeRenderer** — передать isReview и hintUsed
9. **TrainingRatingButtons** — добавить кнопку "С подсказкой", логику ограничения рейтинга
10. **Grep на хардкоды** — найти и заменить все хардкоды 3, 10, [1,3,5]
11. **Проверить прогресс-бар** — обновить расчёты с новым TOTAL
12. **TypeScript check** — убедиться что всё компилируется
13. **Тестирование flow** — пройти полный цикл learning → review → mastered
