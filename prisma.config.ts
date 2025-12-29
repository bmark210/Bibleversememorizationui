import * as dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Загружаем переменные из .env и .env.local (если есть)
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

