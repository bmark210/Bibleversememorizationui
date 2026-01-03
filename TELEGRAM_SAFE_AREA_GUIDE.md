# Telegram Safe Area - Глобальная интеграция

## 🎯 Обзор

Все приложение теперь полностью интегрировано с Telegram Mini Apps API для корректной работы с безопасными зонами экрана на всех устройствах.

## 📁 Структура

### 1. Хук `useTelegramSafeArea`
**Файл:** `src/app/hooks/useTelegramSafeArea.ts`

Универсальный React хук для работы с Telegram WebApp API.

**Возвращает:**
```typescript
{
  isInTelegram: boolean;           // Запущено ли в Telegram
  safeAreaInset: {                 // Безопасные отступы
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  contentSafeAreaInset: {...};     // Отступы для контента
  viewportHeight: number;          // Высота viewport
  isExpanded: boolean;             // Развернуто ли приложение
}
```

**Особенности:**
- ✅ Автоматически вызывает `WebApp.expand()` и `WebApp.ready()`
- ✅ Слушает события `safeAreaChanged`, `contentSafeAreaChanged`, `viewportChanged`
- ✅ Fallback для браузера (вне Telegram)
- ✅ Адаптивность для мобильных устройств

### 2. Глобальный Layout
**Файл:** `src/app/components/Layout.tsx`

**Изменения:**
- Header: `paddingTop` = `safeAreaInset.top`
- Mobile Navigation: `paddingBottom` = `safeAreaInset.bottom`
- Main Content: `paddingBottom` учитывает нижнюю навигацию + safe area
- CSS переменные устанавливаются глобально через `root.style.setProperty()`

### 3. VerseGallery
**Файл:** `src/app/components/VerseGallery.tsx`

**Изменения:**
- Убран дублирующий код работы с Telegram API
- Использует `useTelegramSafeArea()` хук
- Header и Footer динамически адаптируются под safe area
- Card height учитывает верхний отступ

### 4. CSS Утилиты
**Файл:** `src/styles/tailwind.css`

**Новые классы:**

```css
/* Padding */
.pt-safe, .pb-safe, .pl-safe, .pr-safe

/* Margin */
.mt-safe, .mb-safe, .ml-safe, .mr-safe

/* Height */
.h-screen-safe       /* 100vh - top - bottom */
.min-h-screen-safe
```

**CSS Переменные:**
```css
--safe-area-inset-top
--safe-area-inset-bottom
--safe-area-inset-left
--safe-area-inset-right
```

## 🚀 Использование

### В любом компоненте:

```tsx
import { useTelegramSafeArea } from '@/app/hooks/useTelegramSafeArea';

function MyComponent() {
  const { safeAreaInset, isInTelegram } = useTelegramSafeArea();
  
  return (
    <div style={{ paddingTop: `${safeAreaInset.top}px` }}>
      {isInTelegram ? "В Telegram" : "В браузере"}
    </div>
  );
}
```

### С CSS классами:

```tsx
<div className="pt-safe pb-safe">
  Контент с безопасными отступами
</div>

<div className="h-screen-safe">
  Контент на всю высоту экрана (минус safe area)
</div>
```

### С inline стилями:

```tsx
<header style={{ paddingTop: `${safeAreaInset.top}px` }}>
  Header
</header>
```

## 📱 Поддерживаемые устройства

### iOS
- ✅ Dynamic Island (iPhone 14 Pro+)
- ✅ Notch (iPhone X+)
- ✅ Home Indicator
- ✅ Status Bar

### Android
- ✅ Вырезы экрана (Notch/Punch-hole)
- ✅ Навигационная панель
- ✅ Status Bar
- ✅ Различные соотношения сторон

### Desktop
- ✅ Браузеры (fallback режим)
- ✅ Telegram Desktop

## 🔄 События

Хук автоматически обрабатывает:
- `safeAreaChanged` - изменение безопасной зоны
- `contentSafeAreaChanged` - изменение безопасной зоны контента
- `viewportChanged` - изменение размера viewport (поворот экрана)

## 🎨 Визуализация

```
┌───────────────────────────────┐
│   System UI (Telegram)        │ ← safeAreaInset.top
├───────────────────────────────┤
│   Header (pt-safe)            │
├───────────────────────────────┤
│                               │
│   Content (flex-1)            │
│   с автоматическим padding    │
│                               │
├───────────────────────────────┤
│   Mobile Nav (pb-safe)        │
├───────────────────────────────┤
│   Home Indicator (iOS)        │ ← safeAreaInset.bottom
└───────────────────────────────┘
```

## ⚡ Производительность

- Минимальные ререндеры (только при изменении safe area)
- CSS переменные обновляются на `document.documentElement`
- События правильно очищаются при размонтировании
- Fallback не требует дополнительных запросов

## 📚 Документация

- [Telegram Mini Apps API](https://core.telegram.org/bots/webapps)
- [Safe Area Insets](https://core.telegram.org/bots/webapps#safeareainset)
- [Viewport Changes](https://core.telegram.org/bots/webapps#viewportchanged)

## 🐛 Troubleshooting

### Проблема: Safe area не применяется
**Решение:** Убедитесь, что:
1. `Layout` компонент смонтирован
2. `useTelegramSafeArea()` вызван в корневом компоненте
3. CSS переменные установлены в `document.documentElement`

### Проблема: Контент перекрывается системными элементами
**Решение:** Используйте классы `.pt-safe` или `.pb-safe` вместо фиксированных отступов

### Проблема: Не работает в браузере
**Решение:** Хук автоматически использует fallback для браузера. Проверьте breakpoint `md:` (768px)

## ✨ Преимущества

✅ **Единый источник истины** - один хук для всего приложения  
✅ **Автоматическая адаптация** - работает на всех устройствах  
✅ **Удобные утилиты** - CSS классы для быстрой разработки  
✅ **TypeScript** - полная типизация  
✅ **Производительность** - минимум ререндеров  
✅ **Совместимость** - fallback для браузеров  
