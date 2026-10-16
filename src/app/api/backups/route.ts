import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { createDatabaseBackup } from "@/lib/backup";
import { logAuditAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "backups:manage")) {
      return NextResponse.json({ error: "Forbidden: Super Administrator only" }, { status: 403 });
    }

    const backups = await prisma.backupRecord.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("GET backups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "backups:manage")) {
      return NextResponse.json({ error: "Forbidden: Super Administrator only" }, { status: 403 });
    }

    const result = await createDatabaseBackup("Manual");

    await logAuditAction({
      userId: session.userId,
      action: "BACKUP",
      entityName: "Database",
      details: {
        fileName: result.backupFileName,
        fileSize: result.fileSize,
        checksum: result.checksum,
        verified: result.success,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Database backup created and restoration test verified successfully",
      backup: result,
    });
  } catch (error) {
    console.error("POST backup error:", error);
    return NextResponse.json(
      { error: `Backup failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
