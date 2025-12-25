# Интеграция с Telegram WebApp

## 🚀 Установка и настройка

### 1. Создание Telegram бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота:
   - Введите имя бота (например, "Bible Verse Memorization")
   - Введите username бота (например, "BibleVerseMemBot")
4. Сохраните полученный **Bot Token**

### 2. Настройка Mini App

1. Отправьте `/mybots` в BotFather
2. Выберите вашего бота
3. Выберите **Bot Settings** → **Configure Mini App**
4. Отправьте URL вашего развернутого приложения (например, `https://yourdomain.com`)

#### Настройка внешнего вида загрузки:

1. В BotFather: **Bot Settings** → **Configure Mini App** → **Enable Mini App**
2. Загрузите иконку (512x512 px)
3. Установите цвета для светлой и темной темы

### 3. Развертывание приложения

#### Вариант 1: Vercel (рекомендуется)

```bash
# Установите Vercel CLI
npm install -g vercel

# Деплой
vercel
```

#### Вариант 2: Другие платформы

- **Netlify**: `npm run build` → Deploy `.next` папку
- **GitHub Pages**: Не поддерживает Next.js SSR
- **Собственный сервер**: `npm run build` → `npm start`

### 4. Запуск Mini App

После настройки, создайте ссылку для запуска:

```
https://t.me/YourBotUsername/app
```

Или используйте кнопку в меню бота:

```
/setmenubutton
<Название кнопки>
<URL вашего Mini App>
```

## 📱 Локальная разработка

### С ngrok (для тестирования в Telegram)

1. Установите [ngrok](https://ngrok.com/)
2. Запустите приложение:
   ```bash
   npm run dev
   ```
3. В другом терминале запустите ngrok:
   ```bash
   ngrok http 3000
   ```
4. Используйте HTTPS URL от ngrok в BotFather

### Без Telegram (браузер)

Просто запустите:
```bash
npm run dev
```

Откройте `http://localhost:3000` — приложение будет работать без Telegram API (user будет null).

## 🎯 Возможности интеграции

### Текущие функции:

- ✅ **Получение данных пользователя**: имя, фамилия, username, аватар
- ✅ **Тема приложения**: автоматическая светлая/темная тема
- ✅ **Платформа**: определение iOS/Android/Desktop
- ✅ **Premium статус**: отображение premium значка
- ✅ **Адаптивный интерфейс**: полноэкранный режим

### Доступные методы:

```typescript
// Получение данных пользователя
const { user, platform, colorScheme } = useTelegram();

// Уведомления
showTelegramAlert('Стих добавлен!');
showTelegramConfirm('Удалить стих?', (confirmed) => {
  if (confirmed) {
    // Удалить
  }
});

// Вибрация
hapticFeedbackSuccess();
hapticFeedbackError();
hapticFeedbackLight();

// Закрытие WebApp
closeTelegramWebApp();

// Открытие ссылок
openTelegramLink('https://example.com');
```

## 🔧 Отладка

### iOS

1. Telegram → Настройки → 10 раз тапнуть на иконку Settings
2. Accounts → Login to another account → Test
3. Safari → Develop → [Your Device] → выберите WebView

### Android

1. Включите USB Debugging
2. В Telegram: Settings → версия (2 раза нажать и удерживать)
3. Enable WebView Debug
4. Chrome → `chrome://inspect/#devices`

### Desktop (Windows/Linux)

1. Beta версия Telegram Desktop
2. Settings → Advanced → Experimental → Enable webview inspection
3. ПКМ в WebView → Inspect

## 📚 Дополнительные возможности

### Кнопки

```typescript
// Главная кнопка (внизу)
WebApp.MainButton.setText('Начать тренировку');
WebApp.MainButton.show();
WebApp.MainButton.onClick(() => {
  // Действие
});
```

### Подтверждение закрытия

```typescript
enableClosingConfirmation();
// Пользователь увидит подтверждение при попытке закрыть
```

### Полноэкранный режим

```typescript
WebApp.requestFullscreen();
WebApp.exitFullscreen();
```

### Локальное хранилище

```typescript
// Надежное хранилище в Telegram
WebApp.CloudStorage.setItem('key', 'value', (error) => {
  if (!error) {
    console.log('Сохранено');
  }
});

WebApp.CloudStorage.getItem('key', (error, value) => {
  console.log('Значение:', value);
});
```

## 🔗 Полезные ссылки

- [Официальная документация Telegram WebApp](https://core.telegram.org/bots/webapps)
- [TWA SDK на GitHub](https://github.com/twa-dev/sdk)
- [Примеры Mini Apps](https://t.me/DurgerKingBot)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## 🆘 Решение проблем

### Приложение не загружается в Telegram

- Убедитесь, что используете HTTPS
- Проверьте CORS настройки
- Убедитесь, что скрипт `telegram-web-app.js` загружен

### User = null

- Проверьте, что приложение открыто через Telegram
- Убедитесь, что Mini App правильно настроен в BotFather
- Попробуйте очистить кэш Telegram

### Стили не применяются

- Используйте CSS переменные Telegram: `var(--tg-theme-bg-color)`
- Примените тему через `WebApp.themeParams`

## 📄 Пример использования

```typescript
import { useTelegram } from '@/contexts/TelegramContext';

export function MyComponent() {
  const { user, platform, colorScheme } = useTelegram();

  if (!user) {
    return <div>Откройте приложение через Telegram</div>;
  }

  return (
    <div>
      <h1>Привет, {user.firstName}!</h1>
      <p>Платформа: {platform}</p>
      <p>Тема: {colorScheme}</p>
    </div>
  );
}
```

