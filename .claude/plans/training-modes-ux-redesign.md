# Training Modes UX Redesign Plan

## Проблемы сейчас
1. **Варианты ответов обрезаются** — в click-based режимах WordSequenceField и choice tray делят экран 50/50 (`grid-rows-[minmax(0,1fr)_minmax(0,1fr)]`). На маленьких экранах обоим блокам не хватает места.
2. **ClickChunksExercise** — другой layout pattern (`space-y-3`), кнопки уходят за экран.
3. **ReviewHint** — popup перекрывает контент, абсолютное позиционирование ломается на мобиле, disabled state (`text-white/30`) сломан в light mode, резкий переход amber→rose, popup автоскрывается через 5с и нельзя повторно открыть hint.
4. **Нет единой layout-системы** — каждый мод по-своему организует layout.

---

## Архитектурное решение

### 1. Новый общий layout: `TrainingExerciseLayout`

Создать компонент-обёртку для ВСЕХ режимов:

```
┌─────────────────────────────┐
│  Header (label + hint btn)  │  ← shrink-0
├─────────────────────────────┤
│                             │
│     Content area            │  ← flex-1, overflow-y-auto
│  (WordSequenceField /       │
│   Textarea / status)        │
│                             │
├─────────────────────────────┤
│  Fixed bottom panel         │  ← fixed bottom via portal
│  (choices OR rating btns)   │     safe-area-inset-bottom
└─────────────────────────────┘
```

**Файл**: `src/app/components/training-session/modes/TrainingExerciseLayout.tsx`

Props:
- `label: string` — заголовок режима
- `hint?: ReactNode` — ReviewHint рядом с label
- `children: ReactNode` — основной контент (WordSequenceField, Textarea)
- `bottomPanel: ReactNode` — варианты ответов или кнопки оценки
- `bottomPanelVisible: boolean` — показывать ли нижнюю панель

Bottom panel: на мобиле fixed снизу через `createPortal` (аналогично TrainingRatingFooter), на десктопе — inline внизу. При `isCompleted` bottom panel переключается на TrainingRatingButtons.

### 2. Переработка ReviewHint → inline hint panel

**Проблемы**: popup, абсолютное позиционирование, автоскрытие, сломанные стили.

**Решение**: Вместо popup — inline-секция ВНУТРИ content area. Кнопка подсказки остаётся в header. По нажатию hint-текст показывается прямо в content area над WordSequenceField/Textarea как стационарный блок (не popup).

Изменения в `ReviewHint.tsx`:
- Убрать `absolute` popup
- Разделить на 2 части: `HintButton` (в header) и `HintContent` (в content area)
- `HintContent` — просто div с текстом, всегда видим после нажатия (не автоскрывается)
- Единая цветовая схема: amber для всех уровней, subtle label (Подсказка 1/3, 2/3, 3/3)
- Disabled button: `opacity-50` вместо `text-white/30`
- При level 3 (полный текст) показывать в scrollable area, не в popup

### 3. Фиксированная нижняя панель ответов (ChoiceTray)

Новый компонент `FixedBottomPanel.tsx` (или расширить `TrainingRatingFooter`):

- На мобиле: `fixed bottom-0 left-0 right-0` через portal, `paddingBottom: max(env(safe-area-inset-bottom), 8px)`
- `max-height: 45dvh` — не больше 45% экрана для вариантов
- Overflow-y-auto внутри для длинных списков
- border-top + backdrop-blur (как у TrainingRatingFooter)
- При завершении: плавный переход от choices к rating buttons

### 4. Изменения по каждому режиму

#### 4.1 ClickChunksExercise
- Обернуть в `TrainingExerciseLayout`
- Верхняя часть: собранная последовательность (scrollable)
- Нижняя fixed панель: кнопки-фрагменты (grid-cols-1, scrollable если много)

#### 4.2 ClickWordsExercise
- Обернуть в `TrainingExerciseLayout`
- Верхняя часть: `WordSequenceField` (занимает всё доступное пространство)
- Нижняя fixed панель: варианты слов (flex-wrap)
- Убрать `grid-rows-[minmax(0,1fr)_minmax(0,1fr)]` split

#### 4.3 ClickWordsHintedExercise
- Аналогично ClickWordsExercise
- WordSequenceField со revealed/hidden словами вверху
- Варианты слов в fixed bottom panel

#### 4.4 FirstLettersHintedExercise
- WordSequenceField вверху
- Буквы-кнопки в fixed bottom panel
- Кнопки букв чуть крупнее для touch (min-h-11, min-w-12)

#### 4.5 FirstLettersTapExercise
- Аналогично FirstLettersHintedExercise

#### 4.6 FirstLettersKeyboardExercise
- Textarea вверху (content area)
- ReviewHint inline в content area (не popup)
- Кнопка "Проверить" и rating buttons — в fixed bottom panel
- При фокусе на Textarea: нижняя панель может быть скрыта (клавиатура занимает место)

#### 4.7 FullRecallExercise
- Textarea вверху
- ReviewHint inline
- "Проверить" + match% + rating buttons — fixed bottom

#### 4.8 VoiceRecallExercise
- Кнопки записи + Textarea вверху
- ReviewHint inline
- "Проверить" + match% + rating buttons — fixed bottom

### 5. TrainingRatingButtons — без изменений логики
Оставить как есть, они уже хорошо работают через TrainingRatingFooter.

---

## Порядок реализации

1. **Создать `FixedBottomPanel.tsx`** — общий компонент fixed-bottom панели (расширение паттерна TrainingRatingFooter, но универсальный для choices И rating)
2. **Переработать `ReviewHint.tsx`** — split на HintButton + HintContent, inline вместо popup, исправить стили
3. **Переработать `ClickChunksExercise.tsx`** — новый layout с fixed bottom choices
4. **Переработать `ClickWordsExercise.tsx`** — WordSequenceField вверху, choices fixed bottom
5. **Переработать `ClickWordsHintedExercise.tsx`** — аналогично
6. **Переработать `FirstLettersHintedExercise.tsx`** — аналогично
7. **Переработать `FirstLettersTapExercise.tsx`** — аналогично
8. **Переработать `FirstLettersKeyboardExercise.tsx`** — Textarea вверху, inline hint, fixed bottom actions
9. **Переработать `FullRecallExercise.tsx`** — аналогично keyboard
10. **Переработать `VoiceRecallExercise.tsx`** — аналогично с voice controls
11. **Обновить `TrainingRatingFooter.tsx`** — интегрировать с новым FixedBottomPanel или рефакторить
12. **Проверить TypeScript** — `npx tsc --noEmit --skipLibCheck`

---

## Что НЕ меняем
- TrainingModeRenderer (routing, tutorials) — без изменений
- TrainingRatingButtons (логика/стили кнопок оценки) — без изменений
- WordSequenceField (визуал элементов) — без изменений внутренней логики
- wordUtils.ts — без изменений
- TrainingUiStateContext — без изменений
- Логику ошибок/сброса в каждом моде — без изменений
