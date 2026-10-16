import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

// On Vercel / serverless deployments, the project directory is read-only.
// Copy the pre-seeded SQLite database to /tmp so read & write queries succeed.
if (process.env.VERCEL) {
  const tmpDbPath = "/tmp/dev.db";
  if (!fs.existsSync(tmpDbPath)) {
    const bundledDbPath = path.join(process.cwd(), "prisma", "dev.db");
    if (fs.existsSync(bundledDbPath)) {
      try {
        fs.copyFileSync(bundledDbPath, tmpDbPath);
        if (fs.existsSync(`${bundledDbPath}-wal`)) {
          fs.copyFileSync(`${bundledDbPath}-wal`, `${tmpDbPath}-wal`);
        }
        if (fs.existsSync(`${bundledDbPath}-shm`)) {
          fs.copyFileSync(`${bundledDbPath}-shm`, `${tmpDbPath}-shm`);
        }
      } catch (err) {
        console.error("Error copying SQLite database to /tmp:", err);
      }
    }
  }
  process.env.DATABASE_URL = `file:${tmpDbPath}`;
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// Ensure SQLite WAL mode and Foreign Keys are enabled for rock-solid concurrency and data integrity
export async function initializeDatabase() {
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
  } catch (error) {
    console.error("Failed to set SQLite PRAGMA modes:", error);
  }
}
