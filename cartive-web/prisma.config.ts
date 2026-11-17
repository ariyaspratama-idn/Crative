import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrl } from "./src/lib/db-config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: resolveDatabaseUrl(process.env, {
      requireTls: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
    }),
  },
});
