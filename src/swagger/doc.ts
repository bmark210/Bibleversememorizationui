const serverUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  ],
  paths: {
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "Получить пользователя",
        parameters: [
          {
            name: "id",
            in: "query",
            schema: { type: "string" },
            required: false,
          },
          {
            name: "email",
            in: "query",
            schema: { type: "string" },
            required: false,
          },
          {
            name: "username",
            in: "query",
            schema: { type: "string" },
            required: false,
          },
        ],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserWithVerses" } } } },
          400: { description: "Нужно передать id/email/username" },
          404: { description: "Не найден" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Создать/обновить пользователя по email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "username", "avatar", "email"],
                properties: {
                  name: { type: "string" },
                  username: { type: "string" },
                  avatar: { type: "string" },
                  email: { type: "string", format: "email" },
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
    "/api/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Получить пользователя по id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/UserWithVerses" } } } },
          404: { description: "Не найден" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Обновить пользователя",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  username: { type: "string" },
                  avatar: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
        },
      },
    },
    "/api/users/{id}/verses": {
      get: {
        tags: ["User Verses"],
        summary: "Список стихов пользователя",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
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
      post: {
        tags: ["User Verses"],
        summary: "Upsert прогресса по стиху",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
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
    "/api/users/{id}/verses/{externalVerseId}": {
      patch: {
        tags: ["User Verses"],
        summary: "Обновить прогресс по стиху",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
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
          { name: "id", in: "path", required: true, schema: { type: "string" } },
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
  },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          username: { type: "string" },
          avatar: { type: "string" },
          email: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      UserVerse: {
        type: "object",
        properties: {
          id: { type: "string" },
          userId: { type: "string" },
          externalVerseId: { type: "string" },
          masteryLevel: { type: "integer" },
          repetitions: { type: "integer" },
          lastReviewedAt: { type: "string", format: "date-time", nullable: true },
          nextReviewAt: { type: "string", format: "date-time", nullable: true },
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
    },
  },
} as const;

export default swaggerDoc;

