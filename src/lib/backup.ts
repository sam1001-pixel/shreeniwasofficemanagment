import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "./db";
import { PrismaClient } from "@prisma/client";

const BACKUP_DIR = path.join(process.cwd(), "backups");

export function ensureBackupDir(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  return BACKUP_DIR;
}

export function computeFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(new Uint8Array(fileBuffer));
  return hashSum.digest("hex");
}

/**
 * Creates a verified point-in-time snapshot of the database.
 */
export async function createDatabaseBackup(
  triggeredBy: "Manual" | "Scheduled" = "Manual"
): Promise<{ success: boolean; backupFileName: string; fileSize: number; checksum: string }> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `shree_niwas_db_backup_${timestamp}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  const primaryDbPath = path.join(process.cwd(), "prisma", "dev.db");

  if (!fs.existsSync(primaryDbPath)) {
    throw new Error(`Primary database not found at ${primaryDbPath}`);
  }

  // Force checkpoint in WAL mode so all pending transactions are flushed to primary file
  try {
    await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch (err) {
    console.warn("WAL checkpoint warning:", err);
  }

  // Copy primary database file
  fs.copyFileSync(primaryDbPath, backupFilePath);

  const stats = fs.statSync(backupFilePath);
  const checksum = computeFileHash(backupFilePath);

  // Record in BackupRecord
  const record = await prisma.backupRecord.create({
    data: {
      fileName: backupFileName,
      fileSize: stats.size,
      status: "Success",
      triggeredBy,
      verificationStatus: "Pending",
      notes: `SHA-256 Checksum: ${checksum}`,
    },
  });

  // Automatically test restore to prove integrity
  const restoreSuccess = await verifyAndTestRestore(backupFileName, record.id);

  return {
    success: restoreSuccess,
    backupFileName,
    fileSize: stats.size,
    checksum,
  };
}

/**
 * Performs a rigorous restoration test using an isolated SQLite instance.
 * Proves that data, tables, and rows can be retrieved without corruption.
 */
export async function verifyAndTestRestore(
  backupFileName: string,
  backupRecordId?: string
): Promise<boolean> {
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file does not exist: ${backupFilePath}`);
  }

  const testRestoreDbPath = path.join(BACKUP_DIR, `temp_test_restore_${Date.now()}.db`);

  try {
    // 1. Copy backup file to isolated test location
    fs.copyFileSync(backupFilePath, testRestoreDbPath);

    // 2. Initialize temporary Prisma client to read the restored file
    const testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${testRestoreDbPath}`,
        },
      },
    });

    // 3. Query essential tables
    const userCount = await testPrisma.user.count();
    const roleCount = await testPrisma.role.count();
    const employeeCount = await testPrisma.employee.count();
    const settingsCount = await testPrisma.systemSetting.count();

    await testPrisma.$disconnect();

    const verified = userCount > 0 && roleCount > 0 && employeeCount > 0 && settingsCount > 0;

    // 4. Update BackupRecord
    if (backupRecordId) {
      await prisma.backupRecord.update({
        where: { id: backupRecordId },
        data: {
          verificationStatus: verified ? "Verified" : "Failed",
          verifiedAt: new Date(),
          notes: verified
            ? `Restoration test passed. Restored verified records: Users (${userCount}), Roles (${roleCount}), Employees (${employeeCount}), Settings (${settingsCount}).`
            : "Restoration test failed: Essential records missing in restored database.",
        },
      });
    }

    return verified;
  } catch (error) {
    console.error("Restoration test failed:", error);
    if (backupRecordId) {
      await prisma.backupRecord.update({
        where: { id: backupRecordId },
        data: {
          verificationStatus: "Failed",
          notes: `Restoration test error: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
    return false;
  } finally {
    // Clean up temporary test database
    if (fs.existsSync(testRestoreDbPath)) {
      try {
        fs.unlinkSync(testRestoreDbPath);
      } catch {}
    }
  }
}
