import { prisma } from "./db";
import { NextRequest } from "next/server";

interface LogAuditParams {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "REVERSE" | "EXPORT" | "BACKUP" | "RESTORE";
  entityName: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string | null;
  req?: NextRequest | null;
}

export async function logAuditAction({
  userId,
  action,
  entityName,
  entityId,
  details,
  req,
}: LogAuditParams) {
  try {
    let ipAddress: string | null = null;
    if (req) {
      ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "127.0.0.1";
    }

    const detailsString =
      typeof details === "object" && details !== null
        ? JSON.stringify(details)
        : details || null;

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityName,
        entityId: entityId || null,
        details: detailsString,
        ipAddress,
      },
    });
  } catch (error) {
    // Non-blocking for primary transaction flow, but logged
    console.error("Audit log failed to record:", error);
  }
}
