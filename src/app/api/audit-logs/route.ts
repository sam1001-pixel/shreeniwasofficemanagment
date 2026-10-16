import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Security audit trail access is restricted to Super Administrators." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const entityName = searchParams.get("entityName");
    const search = searchParams.get("search");

    const whereClause: Record<string, unknown> = {};
    if (action) whereClause.action = action;
    if (entityName) whereClause.entityName = entityName;
    if (search) {
      whereClause.OR = [
        { details: { contains: search } },
        { entityName: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET audit logs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
