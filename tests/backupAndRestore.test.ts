import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/db";
import { createDatabaseBackup, verifyAndTestRestore } from "../src/lib/backup";
import { createNotification } from "../src/lib/notifications";
import fs from "fs";
import path from "path";

describe("Phase I - Database Backup, Integrity & Restoration Testing Test Suite", () => {
  let createdBackupFileName: string;

  afterAll(async () => {
    // Clean up test backup file if desired
    if (createdBackupFileName) {
      const backupPath = path.join(process.cwd(), "backups", createdBackupFileName);
      if (fs.existsSync(backupPath)) {
        try {
          fs.unlinkSync(backupPath);
        } catch {}
      }
    }
    await prisma.$disconnect();
  });

  it("should create a point-in-time database snapshot with SHA-256 integrity hash", async () => {
    const result = await createDatabaseBackup("Manual");

    expect(result.success).toBe(true);
    expect(result.backupFileName).toContain("shree_niwas_db_backup_");
    expect(result.fileSize).toBeGreaterThan(1000);
    expect(result.checksum.length).toBe(64); // SHA-256 hex string

    createdBackupFileName = result.backupFileName;

    // Verify file exists on disk
    const backupPath = path.join(process.cwd(), "backups", result.backupFileName);
    expect(fs.existsSync(backupPath)).toBe(true);

    // Verify record in BackupRecord table
    const record = await prisma.backupRecord.findFirst({
      where: { fileName: result.backupFileName },
    });
    expect(record).not.toBeNull();
    expect(record?.status).toBe("Success");
    expect(record?.verificationStatus).toBe("Verified");
  });

  it("should rigorously test restoration of the backup file in an isolated sandbox", async () => {
    expect(createdBackupFileName).toBeDefined();

    // Run independent restoration test
    const restoreSuccess = await verifyAndTestRestore(createdBackupFileName);
    expect(restoreSuccess).toBe(true);
  });

  it("should create, query, and manage operational system notifications", async () => {
    const notif = await createNotification({
      title: "Test System Alert",
      message: "This is a verified test notification for staff operations.",
      type: "ALERT",
      linkUrl: "/dashboard",
    });

    expect(notif.id).toBeDefined();
    expect(notif.isRead).toBe(false);

    // Query notifications
    const fetched = await prisma.systemNotification.findUnique({
      where: { id: notif.id },
    });
    expect(fetched?.title).toBe("Test System Alert");

    // Clean up
    await prisma.systemNotification.delete({ where: { id: notif.id } });
  });
});
