import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const canManage = hasPermission(session, "attendance:manage");
    const whereClause: Record<string, unknown> = {};

    if (!canManage) {
      if (!session.employeeId) {
        return NextResponse.json({ error: "No employee profile found" }, { status: 403 });
      }
      whereClause.employeeId = session.employeeId;
    }

    if (status) {
      whereClause.status = status;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error("GET leaves error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leaveType, startDate, endDate, totalDays, reason, employeeId } = body;

    const canManage = hasPermission(session, "attendance:manage");
    let targetEmployeeId = employeeId;

    if (!canManage) {
      if (!session.employeeId) {
        return NextResponse.json({ error: "No employee profile found" }, { status: 403 });
      }
      targetEmployeeId = session.employeeId;
    }

    if (!targetEmployeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Required fields: leaveType, startDate, endDate, reason" },
        { status: 400 }
      );
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: targetEmployeeId,
        leaveType,
        startDate,
        endDate,
        totalDays: totalDays ? parseFloat(totalDays) : 1,
        reason,
        status: canManage ? "Approved" : "Pending",
        approvedById: canManage ? session.userId : null,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "LeaveRequest",
      entityId: leave.id,
      details: { targetEmployeeId, leaveType, startDate, endDate, status: leave.status },
      req,
    });

    return NextResponse.json({ success: true, leave }, { status: 201 });
  } catch (error) {
    console.error("POST leave error:", error);
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "attendance:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const { leaveId, status, approvalNotes } = body; // Approved, Rejected

    if (!leaveId || !status) {
      return NextResponse.json({ error: "leaveId and status are required" }, { status: 400 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        approvalNotes: approvalNotes || null,
        approvedById: session.userId,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "UPDATE",
      entityName: "LeaveRequest",
      entityId: leaveId,
      details: { status, approvalNotes },
      req,
    });

    return NextResponse.json({ success: true, leave: updated });
  } catch (error) {
    console.error("PUT leave status error:", error);
    return NextResponse.json({ error: "Failed to update leave status" }, { status: 500 });
  }
}
