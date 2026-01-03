# Telegram Safe Area - ПРАВИЛЬНАЯ интеграция

## ⚠️ Важно: CSS переменные НЕ работают в Telegram!

Согласно [официальной документации Telegram Mini Apps](https://core.telegram.org/bots/webapps), для работы с safe area нужно использовать **ТОЛЬКО inline стили** с JavaScript значениями из `window.Telegram.WebApp.safeAreaInset`.

## ✅ Правильный подход

### 1. Хук `useTelegramSafeArea`
**Файл:** `src/app/hooks/useTelegramSafeArea.ts`

Получает значения напрямую из Telegram WebApp API и возвращает их как JavaScript объекты.

```typescript
const { safeAreaInset, isInTelegram } = useTelegramSafeArea();

// safeAreaInset = { top: 59, bottom: 34, left: 0, right: 0 }
```

**Что делает хук:**
- ✅ Вызывает `WebApp.ready()` и `WebApp.expand()`
- ✅ Получает актуальные значения из `WebApp.safeAreaInset`
- ✅ Слушает события `safeAreaChanged`, `contentSafeAreaChanged`, `viewportChanged`
- ✅ Логирует все изменения в консоль для отладки
- ✅ Предоставляет fallback для браузера

### 2. Использование в компонентах

**❌ НЕ РАБОТАЕТ (CSS переменные):**
```tsx
// ❌ Не используйте это в Telegram!
<div className="pt-safe">Content</div>
<div style={{ paddingTop: "var(--safe-area-inset-top)" }}>Content</div>
```

**✅ РАБОТАЕТ (inline стили с JS значениями):**
```tsx
const { safeAreaInset } = useTelegramSafeArea();

<div style={{ paddingTop: `${safeAreaInset.top}px` }}>
  Content
</div>
```

### 3. Примеры использования

#### Header с отступом сверху
```tsx
const { safeAreaInset } = useTelegramSafeArea();

<header 
  className="fixed top-0 left-0 right-0"
  style={{ paddingTop: `${safeAreaInset.top}px` }}
>
  <div className="flex items-center justify-between h-16">
    {/* Header content */}
  </div>
</header>
```

#### Footer с отступом снизу
```tsx
const { safeAreaInset } = useTelegramSafeArea();

<footer 
  className="fixed bottom-0 left-0 right-0"
  style={{ paddingBottom: `${safeAreaInset.bottom}px` }}
>
  {/* Footer content */}
</footer>
```

#### Контент с учетом safe area
```tsx
const { safeAreaInset } = useTelegramSafeArea();

<main 
  className="flex-1"
  style={{ 
    paddingTop: `${safeAreaInset.top + 64}px`, // safe area + header height
    paddingBottom: `${safeAreaInset.bottom + 80}px` // safe area + footer height
  }}
>
  {children}
</main>
```

#### Динамическая высота
```tsx
const { safeAreaInset } = useTelegramSafeArea();

<div 
  style={{
    height: `calc(100vh - ${safeAreaInset.top + safeAreaInset.bottom}px)`
  }}
>
  {/* Content */}
</div>
```

## 📱 Как работает в реальном Telegram

### iOS (iPhone 14 Pro с Dynamic Island)
```javascript
window.Telegram.WebApp.safeAreaInset
// { top: 59, bottom: 34, left: 0, right: 0 }
```

### iOS (iPhone 8 без вырезов)
```javascript
window.Telegram.WebApp.safeAreaInset
// { top: 20, bottom: 0, left: 0, right: 0 }
```

### Android (с вырезом)
```javascript
window.Telegram.WebApp.safeAreaInset
// { top: 24, bottom: 0, left: 0, right: 0 }
```

## 🔍 Отладка

### 1. Проверка в консоли браузера
```javascript
// Открой DevTools в Telegram Mini App
console.log('Telegram WebApp:', window.Telegram?.WebApp);
console.log('Safe Area:', window.Telegram?.WebApp?.safeAreaInset);
console.log('Is Expanded:', window.Telegram?.WebApp?.isExpanded);
```

### 2. Логи из хука
Хук автоматически логирует все изменения:
```
🟢 Telegram WebApp detected
📊 Initial safe area: {top: 59, bottom: 34, left: 0, right: 0}
🔄 safeAreaChanged event
📐 Safe area updated: {top: 59, bottom: 34, left: 0, right: 0}
```

### 3. Включение Debug Mode в Telegram

**iOS:**
1. Откройте Telegram
2. Нажмите 10 раз на иконку Settings
3. Включите "Allow Web View Inspection"
4. Подключите iPhone к Mac через USB
5. Откройте Safari → Develop → [Ваш iPhone] → Mini App

**Android:**
1. Включите USB Debugging на устройстве
2. В Telegram Settings прокрутите вниз
3. Нажмите и удерживайте номер версии 2 раза
4. Выберите "Enable WebView Debug"
5. Откройте Chrome → `chrome://inspect/#devices`

## 🎯 Текущая реализация

### Layout.tsx
```tsx
const { safeAreaInset, isInTelegram } = useTelegramSafeArea();

// Header
<header 
  style={{ paddingTop: `${safeAreaInset.top}px` }}
>

// Mobile Navigation
<div 
  style={{ paddingBottom: `${safeAreaInset.bottom}px` }}
>

// Main Content
<main 
  style={{ 
    paddingBottom: `calc(82px + ${safeAreaInset.bottom}px)` 
  }}
>
```

### VerseGallery.tsx
```tsx
const { safeAreaInset } = useTelegramSafeArea();
const topInset = safeAreaInset.top;
const bottomInset = safeAreaInset.bottom;

// Header
<div style={{ paddingTop: `${topInset}px` }}>

// Scroll Container  
<div style={{ paddingTop: `${topInset + 96}px` }}>

// Footer
<div style={{ paddingBottom: `${bottomInset}px` }}>

// Card Height
<div style={{ height: `calc(100vh - ${240 + topInset}px)` }}>
```

## 📚 Документация

- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Bot API 8.0 - Safe Area](https://core.telegram.org/bots/webapps#safeareainset)
- [Events](https://core.telegram.org/bots/webapps#events)

## ✨ Преимущества этого подхода

✅ **Работает реально** - использует официальный Telegram API  
✅ **Простота** - только inline стили, никаких CSS переменных  
✅ **Отладка** - встроенные console.log для проверки  
✅ **TypeScript** - полная типизация  
✅ **Адаптивность** - автоматическое обновление при изменениях  
✅ **Fallback** - работает и в обычном браузере  

## 🐛 Если не работает

1. **Проверьте консоль** - должны быть логи `🟢 Telegram WebApp detected`
2. **Проверьте значения** - `console.log(window.Telegram?.WebApp?.safeAreaInset)`
3. **Убедитесь что используете inline стили**, а не CSS классы
4. **Проверьте что `WebApp.expand()` вызывается** - это важно!
5. **Попробуйте перезапустить Mini App** в Telegram

## 📝 Checklist для новых компонентов

- [ ] Импортировал `useTelegramSafeArea` хук
- [ ] Получил `safeAreaInset` из хука
- [ ] Использую **inline стили** с `${safeAreaInset.top}px`
- [ ] НЕ использую CSS классы типа `.pt-safe`
- [ ] НЕ использую CSS переменные `var(--safe-area-inset-top)`
- [ ] Проверил в консоли что значения корректные
- [ ] Протестировал в реальном Telegram на телефоне
