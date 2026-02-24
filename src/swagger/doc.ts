const serverUrl = process.env.NEXT_PUBLIC_APP_URL;

const swaggerDoc = {
  openapi: "3.0.3",
  info: {
    title: "Bible Verse Memorization API",
    version: "1.0.0",
  },
  servers: [{ url: serverUrl }],
  tags: [
    { name: "Users", description: "Работа с пользователями" },
    { name: "User Verses", description: "Прогресс запоминания стихов" },
    { name: "Tags", description: "Теги и привязка к стихам" },
    { name: "Docs", description: "Спецификация и служебные маршруты" },
    { name: "Bolls", description: "Прокси для переводов Bolls" },
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
            schema: { type: "string", enum: ["NEW", "LEARNING", "STOPPED"] },
          },
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
          {
            name: "filter",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["all", "new", "learning", "review", "stopped"] },
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
                  externalVerseId: { type: "string" },
                  masteryLevel: { type: "integer", minimum: 0, maximum: 5 },
                  repetitions: { type: "integer", minimum: 0 },
                  lastReviewedAt: { type: "string", format: "date-time" },
                  nextReviewAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Создан/обновлён", content: { "application/json": { schema: { $ref: "#/components/schemas/UserVerse" } } } },
          400: { description: "externalVerseId обязателен" },
        },
      },
    },
    "/api/users/{telegramId}/verses/review": {
      get: {
        tags: ["User Verses"],
        summary: "Список стихов пользователя на повторение (LEARNING, masteryLevel > TRAINING_STAGE_MASTERY_MAX)",
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
    "/api/users/{telegramId}/verses/{externalVerseId}": {
      patch: {
        tags: ["User Verses"],
        summary: "Обновить прогресс по стиху",
        parameters: [
          { name: "telegramId", in: "path", required: true, schema: { type: "string" } },
          { name: "externalVerseId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  masteryLevel: { type: "integer", minimum: 0, maximum: 5 },
                  repetitions: { type: "integer", minimum: 0 },
                  lastReviewedAt: { type: "string", format: "date-time" },
                  nextReviewAt: { type: "string", format: "date-time" },
                  status: {
                    type: "string",
                    enum: ["NEW", "LEARNING", "STOPPED"],
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
          { name: "externalVerseId", in: "path", required: true, schema: { type: "string" } },
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
    "/api/verses/{externalVerseId}/tags": {
      get: {
        tags: ["Tags"],
        summary: "Получить теги, привязанные к стиху",
        parameters: [{ name: "externalVerseId", in: "path", required: true, schema: { type: "string" } }],
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
        parameters: [{ name: "externalVerseId", in: "path", required: true, schema: { type: "string" } }],
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
        parameters: [{ name: "externalVerseId", in: "path", required: true, schema: { type: "string" } }],
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
    "/api/bolls/translations": {
      get: {
        tags: ["Bolls"],
        summary: "Прокси к переводам Bolls",
        responses: {
          200: {
            description: "Список переводов",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
    "/api/bolls/parallel": {
      post: {
        tags: ["Bolls"],
        summary: "Сравнение стихов в разных переводах Bolls",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BollsParallelVersesParams" },
            },
          },
        },
        responses: {
          200: {
            description: "Список параллелей по переводам",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "array",
                    items: { $ref: "#/components/schemas/BollsVerse" },
                  },
                },
              },
            },
          },
          400: {
            description: "Неверный запрос",
          },
        },
      },
    },
    "/api/bolls/verses": {
      post: {
        tags: ["Bolls"],
        summary: "Получить несколько стихов из разных мест",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BollsVersesRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Список массивов стихов",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "array",
                    items: { $ref: "#/components/schemas/BollsVerse" },
                  },
                },
              },
            },
          },
          400: {
            description: "Неверный запрос",
          },
        },
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
          translation: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      UserVerse: {
        type: "object",
        properties: {
          id: { type: "string" },
          telegramId: { type: "string" },
          externalVerseId: { type: "string" },
          masteryLevel: { type: "integer" },
          repetitions: { type: "integer" },
          lastReviewedAt: { type: "string", format: "date-time", nullable: true },
          nextReviewAt: { type: "string", format: "date-time", nullable: true },
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
          externalVerseId: { type: "string" },
          tagId: { type: "string" },
        },
      },
      BollsVerse: {
        type: "object",
        properties: {
          pk: { type: "integer" },
          translation: { type: "string" },
          book: { type: "integer" },
          chapter: { type: "integer" },
          verse: { type: "integer" },
          text: { type: "string" },
          comment: { type: "string" },
        },
      },
      BollsParallelVersesParams: {
        type: "object",
        required: ["translations", "book", "chapter", "verses"],
        properties: {
          translations: { type: "array", items: { type: "string" } },
          book: { type: "integer" },
          chapter: { type: "integer" },
          verses: { type: "array", items: { type: "integer" } },
        },
      },
      BollsVersesRequest: {
        type: "array",
        items: { $ref: "#/components/schemas/BollsVersesRequestItem" },
      },
      BollsVersesRequestItem: {
        type: "object",
        required: ["translation", "book", "chapter", "verses"],
        properties: {
          translation: { type: "string" },
          book: { type: "integer" },
          chapter: { type: "integer" },
          verses: { type: "array", items: { type: "integer" } },
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

