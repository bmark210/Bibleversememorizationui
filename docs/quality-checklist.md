# Quality Gate Checklist

Перед merge/релизом запускайте:

- `npm run lint`
- `npm run check:dead-code`
- `npm run check:artifacts`

Или одним шагом:

- `npm run quality:gate`

## Что это проверяет

- Линтинг и базовые код-правила (`lint`)
- Неиспользуемые локальные переменные и параметры (`check:dead-code`)
- Случайно добавленные runtime-артефакты (`*.log`, `*.err.log`, `*.tsbuildinfo`) (`check:artifacts`)
