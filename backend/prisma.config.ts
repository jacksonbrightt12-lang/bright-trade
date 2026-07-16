import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "@prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(process.cwd(), ".env"),
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/brighttrade?schema=public";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
