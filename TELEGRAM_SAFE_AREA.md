# Интеграция с Telegram Mini Apps

## Решение проблемы с системными элементами управления

В Telegram Mini Apps сверху и снизу экрана расположены системные элементы управления. Для корректного отображения контента используется **Telegram WebApp API** для работы с безопасными зонами экрана.

## Реализация

### 1. Определение типов TypeScript

```typescript
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        expand: () => void;
        safeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
      };
    };
  }
}
```

### 2. Получение безопасных отступов

```typescript
useEffect(() => {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    const tg = window.Telegram?.WebApp;
    
    // Расширяем Mini App на весь экран
    tg.expand();
    
    // Получаем отступы безопасной зоны
    const safeAreaTop = tg.safeAreaInset?.top || 0;
    const safeAreaBottom = tg.safeAreaInset?.bottom || 0;
    setTopInset(safeAreaTop);
    setBottomInset(safeAreaBottom);

    // Слушаем изменения (поворот экрана, изменение safe area)
    const handleSafeAreaChange = () => {
      setTopInset(tg.safeAreaInset?.top || 0);
      setBottomInset(tg.safeAreaInset?.bottom || 0);
    };

    tg.onEvent('safeAreaChanged', handleSafeAreaChange);
    
    return () => {
      tg.offEvent('safeAreaChanged', handleSafeAreaChange);
    };
  } else {
    // Fallback для браузера (вне Telegram)
    const isMobile = window.innerWidth < 768;
    setTopInset(isMobile ? 112 : 0); // 112px ≈ pt-28
    setBottomInset(0);
  }
}, []);
```

### 3. Применение отступов

**Header:**
```tsx
<div 
  className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80"
  style={{ paddingTop: `${topInset}px` }}
>
```

**Scroll Container:**
```tsx
<div
  className="flex-1 overflow-y-auto"
  style={{ 
    paddingTop: `${topInset + 96}px` // topInset + базовый отступ
  }}
>
```

**Footer:**
```tsx
<div 
  className="fixed bottom-0 left-0 right-0 z-40"
  style={{ paddingBottom: `${bottomInset}px` }}
>
```

**Card Height:**
```tsx
<div
  style={{
    height: `calc(100vh - ${240 + topInset}px)`
  }}
>
```

## Преимущества

✅ **Адаптивность** - автоматическая подстройка под любое устройство  
✅ **Динамичность** - реагирует на поворот экрана и изменения safe area  
✅ **Совместимость** - работает как в Telegram, так и в обычном браузере (fallback)  
✅ **Нативность** - использует официальный Telegram WebApp API  
✅ **iOS/Android** - поддержка вырезов, Dynamic Island, и прочих особенностей устройств

## Документация

- [Telegram Mini Apps API](https://core.telegram.org/bots/webapps)
- События: `safeAreaChanged`, `contentSafeAreaChanged`
- Поля: `safeAreaInset`, `contentSafeAreaInset`
