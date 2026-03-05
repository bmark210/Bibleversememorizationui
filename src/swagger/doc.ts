const serverUrl = process.env.NEXT_PUBLIC_APP_URL;

const externalVerseIdSchema = {
  type: "string",
  pattern: "^\\d+-\\d+-\\d+(?:-\\d+)?$",
  description:
    'ID стиха: "book-chapter-verse" или диапазон в пределах главы "book-chapter-verseStart-verseEnd" (максимум 5 стихов в диапазоне).',
  examples: ["43-3-16", "43-3-16-18"],
} as const;

const swaggerDoc = {
  openapi: "3.0.3",
  info: {
    title: "Bible Verse Memorization API",
    version: "1.0.0",
  },
  servers: [{ url: serverUrl }],
  tags: [
    { name: "Users", description: "Работа с пользователями" },
    { name: "Friends", description: "Подписки и активность друзей" },
    { name: "User Verses", description: "Прогресс запоминания стихов" },
    { name: "Tags", description: "Теги и привязка к стихам" },
    { name: "Docs", description: "Спецификация и служебные маршруты" },
  ],
  paths: {
    "/api/users": {
      post: {
        tags: ["Users"],
        summary: "Создать/обновить пользователя по telegramId",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["telegramId"],
                properties: {
                  telegramId: { type: "string" },
                  translation: { type: "string" },
                  name: { type: "string" },
                  nickname: { type: "string" },
                  avatarUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Создан/обновлён", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
        },
      },
    },
    "/api/users/{telegramId}": {
      get: {
        tags: ["Users"],
        summary: "Получить пользователя по telegramId",
        parameters: [{ name: "telegramId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserWithVerses" } } } },
          404: { description: "Не найден" },
        },
      },
    },
    "/api/users/{telegramId}/stats": {
      get: {
        tags: ["Users"],
        summary: "Персональная статистика пользователя для дашборда (включая композитный рейтинг)",
        parameters: [{ name: "telegramId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserDashboardStats" } } } },
          404: { description: "Не найден" },
        },
      },
    },
    "/api/users/{telegramId}/players": {
      get: {
        tags: ["Friends"],
        summary: "Список игроков для поиска друзей",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          { name: "search", in: "query", required: false, schema: { type: "string", maxLength: 80 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50 } },
          { name: "startWith", in: "query", required: false, schema: { type: "integer", minimum: 0 } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FriendPlayersPageResponse" },
              },
            },
          },
          404: { description: "Пользователь не найден" },
        },
      },
    },
    "/api/users/{telegramId}/friends": {
      get: {
        tags: ["Friends"],
        summary: "Список друзей (подписок пользователя)",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          { name: "search", in: "query", required: false, schema: { type: "string", maxLength: 80 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50 } },
          { name: "startWith", in: "query", required: false, schema: { type: "integer", minimum: 0 } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FriendPlayersPageResponse" },
              },
            },
          },
          404: { description: "Пользователь не найден" },
        },
      },
      post: {
        tags: ["Friends"],
        summary: "Добавить пользователя в друзья (подписка)",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["targetTelegramId"],
                properties: {
                  targetTelegramId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FriendsMutationResponse" },
              },
            },
          },
          400: { description: "Некорректный запрос" },
          404: { description: "Пользователь не найден" },
        },
      },
    },
    "/api/users/{telegramId}/friends/{friendTelegramId}": {
      delete: {
        tags: ["Friends"],
        summary: "Удалить пользователя из друзей",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          { name: "friendTelegramId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FriendsMutationResponse" },
              },
            },
          },
          404: { description: "Пользователь не найден" },
        },
      },
    },
    "/api/users/{telegramId}/friends/activity": {
      get: {
        tags: ["Friends"],
        summary: "Последняя активность друзей для дашборда (с композитным рейтингом)",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardFriendsActivityResponse" },
              },
            },
          },
          404: { description: "Пользователь не найден" },
        },
      },
    },
    "/api/users/leaderboard": {
      get: {
        tags: ["Users"],
        summary: "Таблица лидеров для главной страницы (рейтинг: прогресс + навыки + регулярность)",
        parameters: [
          { name: "telegramId", in: "query", required: false, schema: { type: "string" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 25 } },
        ],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserLeaderboardResponse" } } } },
        },
      },
    },
    "/api/users/telegram": {
      post: {
        tags: ["Users"],
        summary: "Инициализация пользователя через Telegram",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["telegramId"],
                properties: {
                  telegramId: { type: "string" },
                  translation: { type: "string" },
                  name: { type: "string" },
                  nickname: { type: "string" },
                  avatarUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Пользователь уже существует",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/User" } },
            },
          },
          201: {
            description: "Создан новый пользователь",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/User" } },
            },
          },
        },
      },
    },
    "/api/users/{telegramId}/verses": {
      get: {
        tags: ["User Verses"],
        summary: "Список стихов пользователя",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["MY", "LEARNING", "STOPPED"] },
          },
          {
            name: "orderBy",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["createdAt", "updatedAt", "bible", "popularity"],
            },
          },
          {
            name: "order",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"] },
          },
          {
            name: "filter",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: [
                "catalog",
                "friends",
                "my",
                "learning",
                "review",
                "mastered",
                "stopped",
              ],
            },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50 },
          },
          {
            name: "startWith",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
          },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserVersesPageResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["User Verses"],
        summary: "Создать или обновить прогресс по стиху",
        parameters: [{ name: "telegramId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["externalVerseId"],
                properties: {
                  externalVerseId: externalVerseIdSchema,
                  masteryLevel: { type: "integer", minimum: 0, maximum: 7 },
                  repetitions: { type: "integer", minimum: 0 },
                  lastTrainingModeId: { type: "integer", minimum: 1, maximum: 8, nullable: true },
                  lastReviewedAt: { type: "string", format: "date-time" },
                  nextReviewAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Создан/обновлён", content: { "application/json": { schema: { $ref: "#/components/schemas/UserVerse" } } } },
          400: { description: "externalVerseId обязателен или имеет неверный формат" },
        },
      },
    },
    "/api/users/{telegramId}/verses/review": {
      get: {
        tags: ["User Verses"],
        summary:
          "Список стихов пользователя на повторение (LEARNING, masteryLevel >= TRAINING_STAGE_MASTERY_MAX)",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          {
            name: "orderBy",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["createdAt", "updatedAt"] },
          },
          {
            name: "order",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"] },
          },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/UserVerse" } },
              },
            },
          },
        },
      },
    },
    "/api/users/{telegramId}/verses/reference-trainer": {
      get: {
        tags: ["User Verses"],
        summary: "Пул стихов для раздела «Якоря»",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/UserVerse" } },
              },
            },
          },
        },
      },
    },
    "/api/users/{telegramId}/verses/reference-trainer/session": {
      post: {
        tags: ["User Verses"],
        summary: "Сохранить skill-score по итогам сессии раздела «Якоря»",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sessionTrack", "updates"],
                properties: {
                  sessionTrack: {
                    type: "string",
                    enum: ["reference", "incipit", "context", "mixed"],
                  },
                  updates: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["externalVerseId", "track", "outcome"],
                      properties: {
                        externalVerseId: externalVerseIdSchema,
                        track: {
                          type: "string",
                          enum: ["reference", "incipit", "context"],
                        },
                        outcome: {
                          type: "string",
                          enum: ["correct_first", "correct_retry", "wrong"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["updated"],
                  properties: {
                    updated: {
                      type: "array",
                      items: {
                        type: "object",
                        required: [
                          "externalVerseId",
                          "referenceScore",
                          "incipitScore",
                          "contextScore",
                        ],
                        properties: {
                          externalVerseId: externalVerseIdSchema,
                          referenceScore: { type: "integer", minimum: 0, maximum: 100 },
                          incipitScore: { type: "integer", minimum: 0, maximum: 100 },
                          contextScore: { type: "integer", minimum: 0, maximum: 100 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/users/{telegramId}/verses/{externalVerseId}": {
      patch: {
        tags: ["User Verses"],
        summary:
          "Обновить прогресс по стиху (сервер защищает инварианты mastery/review и валидирует lastTrainingModeId)",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          { name: "externalVerseId", in: "path", required: true, schema: externalVerseIdSchema },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  masteryLevel: { type: "integer", minimum: 0, maximum: 7 },
                  repetitions: { type: "integer", minimum: 0 },
                  lastTrainingModeId: { type: "integer", minimum: 1, maximum: 8, nullable: true },
                  lastReviewedAt: { type: "string", format: "date-time" },
                  nextReviewAt: { type: "string", format: "date-time" },
                  status: {
                    type: "string",
                    enum: ["MY", "LEARNING", "STOPPED"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserVerse" } } } },
        },
      },
      delete: {
        tags: ["User Verses"],
        summary: "Удалить прогресс по стиху",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          { name: "externalVerseId", in: "path", required: true, schema: externalVerseIdSchema },
        ],
        responses: { 200: { description: "Удалено" } },
      },
    },
    "/api/tags": {
      get: {
        tags: ["Tags"],
        summary: "Список тегов",
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Tag" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tags"],
        summary: "Создать тег",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["slug", "title"],
                properties: {
                  slug: { type: "string" },
                  title: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Создан", content: { "application/json": { schema: { $ref: "#/components/schemas/Tag" } } } },
          400: { description: "slug и title обязательны" },
        },
      },
    },
    "/api/docs": {
      get: {
        tags: ["Docs"],
        summary: "Получить открытый Swagger-документ",
        responses: {
          200: {
            description: "Спецификация в JSON",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/OpenApiDoc" },
              },
            },
          },
        },
      },
    },
    "/api/verses": {
      get: {
        tags: ["User Verses"],
        summary: "Каталог стихов с пагинацией и контекстной популярностью",
        parameters: [
          { name: "telegramId", in: "query", required: false, schema: { type: "string" } },
          { name: "translation", in: "query", required: false, schema: { type: "string" } },
          { name: "tagSlugs", in: "query", required: false, schema: { type: "string" } },
          {
            name: "orderBy",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["createdAt", "bible", "popularity"] },
          },
          {
            name: "order",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["asc", "desc"] },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50 },
          },
          {
            name: "startWith",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0 },
          },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserVersesPageResponse" },
              },
            },
          },
          400: { description: "Некорректные query-параметры" },
        },
      },
    },
    "/api/verses/{externalVerseId}/tags": {
      get: {
        tags: ["Tags"],
        summary: "Получить теги, привязанные к стиху",
        parameters: [{ name: "externalVerseId", in: "path", required: true, schema: externalVerseIdSchema }],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Tag" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Tags"],
        summary: "Привязать тег к стиху",
        parameters: [{ name: "externalVerseId", in: "path", required: true, schema: externalVerseIdSchema }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tagId: { type: "string" },
                  tagSlug: { type: "string" },
                },
                oneOf: [
                  { required: ["tagId"] },
                  { required: ["tagSlug"] },
                ],
              },
            },
          },
        },
        responses: {
          201: { description: "Связь создана", content: { "application/json": { schema: { $ref: "#/components/schemas/VerseTag" } } } },
          400: { description: "Нужен tagId или tagSlug" },
        },
      },
      delete: {
        tags: ["Tags"],
        summary: "Отвязать тег от стиха",
        parameters: [{ name: "externalVerseId", in: "path", required: true, schema: externalVerseIdSchema }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tagId: { type: "string" },
                  tagSlug: { type: "string" },
                },
                oneOf: [
                  { required: ["tagId"] },
                  { required: ["tagSlug"] },
                ],
              },
            },
          },
        },
        responses: { 200: { description: "Связь удалена" }, 400: { description: "Нужен tagId или tagSlug" } },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          telegramId: { type: "string" },
          name: { type: "string", nullable: true },
          nickname: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          translation: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      UserVerse: {
        type: "object",
        required: [
          "externalVerseId",
          "status",
          "masteryLevel",
          "repetitions",
          "referenceScore",
          "incipitScore",
          "contextScore",
          "lastReviewedAt",
          "nextReviewAt",
        ],
        properties: {
          externalVerseId: externalVerseIdSchema,
          status: {
            type: "string",
            enum: ["MY", "LEARNING", "STOPPED", "REVIEW", "MASTERED", "CATALOG"],
          },
          masteryLevel: { type: "integer" },
          repetitions: { type: "integer" },
          referenceScore: { type: "integer", minimum: 0, maximum: 100 },
          incipitScore: { type: "integer", minimum: 0, maximum: 100 },
          contextScore: { type: "integer", minimum: 0, maximum: 100 },
          lastTrainingModeId: { type: "integer", minimum: 1, maximum: 8, nullable: true },
          lastReviewedAt: { type: "string", format: "date-time", nullable: true },
          nextReviewAt: { type: "string", format: "date-time", nullable: true },
          tags: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "slug", "title"],
              properties: {
                id: { type: "string" },
                slug: { type: "string" },
                title: { type: "string" },
              },
            },
          },
          popularityScope: {
            type: "string",
            enum: ["friends", "players", "self"],
          },
          popularityValue: { type: "integer", minimum: 0 },
          text: { type: "string" },
          reference: { type: "string" },
          contextPromptText: { type: "string" },
          contextPromptReference: { type: "string" },
        },
      },
      UserVersesPageResponse: {
        type: "object",
        required: ["items", "totalCount"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/UserVerse" },
          },
          totalCount: { type: "integer", minimum: 0 },
        },
      },
      UserWithVerses: {
        allOf: [
          { $ref: "#/components/schemas/User" },
          {
            type: "object",
            properties: {
              verses: { type: "array", items: { $ref: "#/components/schemas/UserVerse" } },
            },
          },
        ],
      },
      UserDashboardStats: {
        type: "object",
        required: [
          "totalVerses",
          "learningVerses",
          "reviewVerses",
          "masteredVerses",
          "stoppedVerses",
          "dueReviewVerses",
          "totalRepetitions",
          "averageProgressPercent",
          "bestVerseReference",
          "dailyStreak",
        ],
        properties: {
          totalVerses: { type: "integer", minimum: 0 },
          learningVerses: { type: "integer", minimum: 0 },
          reviewVerses: { type: "integer", minimum: 0 },
          masteredVerses: { type: "integer", minimum: 0 },
          stoppedVerses: { type: "integer", minimum: 0 },
          dueReviewVerses: { type: "integer", minimum: 0 },
          totalRepetitions: { type: "integer", minimum: 0 },
          averageProgressPercent: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "Композитный рейтинг пользователя (прогресс + навыки + регулярность).",
          },
          bestVerseReference: { type: "string", nullable: true },
          dailyStreak: { type: "integer", minimum: 0 },
        },
      },
      UserLeaderboardEntry: {
        type: "object",
        required: [
          "rank",
          "telegramId",
          "name",
          "avatarUrl",
          "score",
          "streakDays",
          "weeklyRepetitions",
          "isCurrentUser",
        ],
        properties: {
          rank: { type: "integer", minimum: 1 },
          telegramId: { type: "string" },
          name: { type: "string" },
          avatarUrl: { type: "string", nullable: true },
          score: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "Композитный рейтинг участника (прогресс + навыки + регулярность).",
          },
          streakDays: { type: "integer", minimum: 0 },
          weeklyRepetitions: { type: "integer", minimum: 0 },
          isCurrentUser: { type: "boolean" },
        },
      },
      UserLeaderboardCurrentUser: {
        type: "object",
        required: [
          "telegramId",
          "name",
          "avatarUrl",
          "rank",
          "score",
          "streakDays",
          "weeklyRepetitions",
        ],
        properties: {
          telegramId: { type: "string" },
          name: { type: "string" },
          avatarUrl: { type: "string", nullable: true },
          rank: { type: "integer", minimum: 1, nullable: true },
          score: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "Композитный рейтинг пользователя (прогресс + навыки + регулярность).",
          },
          streakDays: { type: "integer", minimum: 0 },
          weeklyRepetitions: { type: "integer", minimum: 0 },
        },
      },
      UserLeaderboardResponse: {
        type: "object",
        required: ["generatedAt", "totalParticipants", "entries", "currentUser"],
        properties: {
          generatedAt: { type: "string", format: "date-time" },
          totalParticipants: { type: "integer", minimum: 0 },
          entries: {
            type: "array",
            items: { $ref: "#/components/schemas/UserLeaderboardEntry" },
          },
          currentUser: {
            nullable: true,
            allOf: [{ $ref: "#/components/schemas/UserLeaderboardCurrentUser" }],
          },
        },
      },
      FriendPlayerListItem: {
        type: "object",
        required: [
          "telegramId",
          "name",
          "avatarUrl",
          "isFriend",
          "lastActiveAt",
          "weeklyRepetitions",
          "dailyStreak",
          "averageProgressPercent",
        ],
        properties: {
          telegramId: { type: "string" },
          name: { type: "string" },
          avatarUrl: { type: "string", nullable: true },
          isFriend: { type: "boolean" },
          lastActiveAt: { type: "string", format: "date-time", nullable: true },
          weeklyRepetitions: { type: "integer", minimum: 0 },
          dailyStreak: { type: "integer", minimum: 0 },
          averageProgressPercent: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "Композитный рейтинг друга (прогресс + навыки + регулярность).",
          },
        },
      },
      FriendPlayersPageResponse: {
        type: "object",
        required: ["items", "totalCount", "limit", "startWith"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/FriendPlayerListItem" },
          },
          totalCount: { type: "integer", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 50 },
          startWith: { type: "integer", minimum: 0 },
        },
      },
      DashboardFriendActivityEntry: {
        type: "object",
        required: [
          "telegramId",
          "name",
          "avatarUrl",
          "lastActiveAt",
          "weeklyRepetitions",
          "dailyStreak",
          "averageProgressPercent",
        ],
        properties: {
          telegramId: { type: "string" },
          name: { type: "string" },
          avatarUrl: { type: "string", nullable: true },
          lastActiveAt: { type: "string", format: "date-time", nullable: true },
          weeklyRepetitions: { type: "integer", minimum: 0 },
          dailyStreak: { type: "integer", minimum: 0 },
          averageProgressPercent: { type: "integer", minimum: 0, maximum: 100 },
        },
      },
      DashboardFriendsActivitySummary: {
        type: "object",
        required: [
          "friendsTotal",
          "activeLast7Days",
          "avgWeeklyRepetitions",
          "avgStreakDays",
          "avgProgressPercent",
        ],
        properties: {
          friendsTotal: { type: "integer", minimum: 0 },
          activeLast7Days: { type: "integer", minimum: 0 },
          avgWeeklyRepetitions: { type: "integer", minimum: 0 },
          avgStreakDays: { type: "integer", minimum: 0 },
          avgProgressPercent: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            description: "Средний композитный рейтинг по друзьям.",
          },
        },
      },
      DashboardFriendsActivityResponse: {
        type: "object",
        required: ["generatedAt", "summary", "entries"],
        properties: {
          generatedAt: { type: "string", format: "date-time" },
          summary: { $ref: "#/components/schemas/DashboardFriendsActivitySummary" },
          entries: {
            type: "array",
            items: { $ref: "#/components/schemas/DashboardFriendActivityEntry" },
          },
        },
      },
      FriendsMutationResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["added", "already-following", "removed", "not-following"],
          },
        },
      },
      Tag: {
        type: "object",
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          title: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      VerseTag: {
        type: "object",
        properties: {
          id: { type: "string" },
          externalVerseId: externalVerseIdSchema,
          tagId: { type: "string" },
        },
      },
      OpenApiDoc: {
        type: "object",
        properties: {
          openapi: { type: "string" },
          info: {
            type: "object",
            properties: {
              title: { type: "string" },
              version: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

export default swaggerDoc;
