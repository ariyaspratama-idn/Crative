import "server-only";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { DatabaseUnavailableError } from "@/lib/security";
import { parseMysqlConnectionOptions } from "@/lib/db-config";

const globalForPrisma = globalThis as typeof globalThis & { cartivePrisma?: PrismaClient };

export function getDb() {
  if (globalForPrisma.cartivePrisma) return globalForPrisma.cartivePrisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new DatabaseUnavailableError("DATABASE_URL belum diatur.");
  }

  let options: ReturnType<typeof parseMysqlConnectionOptions>;
  try {
    const defaultConnectionLimit = process.env.VERCEL === "1" ? "1" : "4";
    const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT ?? defaultConnectionLimit);
    options = parseMysqlConnectionOptions(connectionString, {
      requireTls: process.env.NODE_ENV === "production",
      connectionLimit,
    });
  } catch (error) {
    throw new DatabaseUnavailableError(
      error instanceof Error ? error.message : "DATABASE_URL tidak valid.",
    );
  }

  const adapter = new PrismaMariaDb(options);
  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  globalForPrisma.cartivePrisma = prisma;

  return prisma;
}
