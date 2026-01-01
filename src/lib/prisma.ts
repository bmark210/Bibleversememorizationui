import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

console.log("DATABASE_URL =", connectionString ?? "undefined");
console.log("DIRECT_URL   =", directUrl ?? "undefined");

if (!connectionString) {
  console.warn("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const createPrismaClient = () => {
  if (connectionString) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter } as any);
  }
  return new PrismaClient({} as any);
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

