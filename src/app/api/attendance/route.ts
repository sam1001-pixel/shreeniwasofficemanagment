import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { calculateWorkingAndLateMinutes } from "@/lib/attendanceCalculator";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const month = searchParams.get("month"); // YYYY-MM
    const employeeIdParam = searchParams.get("employeeId");

    // Regular employee can only view their own attendance unless they have attendance:manage
    let targetEmployeeId = employeeIdParam;
    const canManageAttendance = hasPermission(session, "attendance:manage");

    if (!canManageAttendance) {
      if (!session.employeeId) {
        return NextResponse.json({ error: "No employee profile linked to user" }, { status: 400 });
      }
      targetEmployeeId = session.employeeId;
    }

    const whereClause: Record<string, unknown> = {};

    if (targetEmployeeId) {
      whereClause.employeeId = targetEmployeeId;
    }

    if (date) {
      whereClause.date = date;
    } else if (month) {
      whereClause.date = { startsWith: month };
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { employee: { employeeCode: "asc" } }],
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error("GET attendance error:", error);
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
    const {
      employeeId,
      date,
      checkInTime,
      checkOutTime,
      status, // Present, Absent, HalfDay, Leave, WeeklyOff, Holiday
      isManualCorrection,
      correctionReason,
    } = body;

    const canManage = hasPermission(session, "attendance:manage");
    let targetEmployeeId = employeeId;

    if (!canManage) {
      // Regular staff check-in/out only for themselves
      if (!session.employeeId) {
        return NextResponse.json({ error: "No employee profile linked to your account" }, { status: 403 });
      }
      targetEmployeeId = session.employeeId;
    }

    if (!targetEmployeeId || !date) {
      return NextResponse.json({ error: "Employee ID and date are required" }, { status: 400 });
    }

    // Manual corrections require reason
    if (isManualCorrection && !correctionReason) {
      return NextResponse.json(
        { error: "A clear reason must be provided for manual attendance adjustments" },
        { status: 400 }
      );
    }

    // Fetch shift settings
    const shiftSetting = await prisma.systemSetting.findUnique({ where: { key: "SHIFT_START_TIME" } });
    const graceSetting = await prisma.systemSetting.findUnique({ where: { key: "GRACE_PERIOD_MINS" } });

    const shiftStartTime = shiftSetting?.value || "09:30";
    const gracePeriodMins = graceSetting ? parseInt(graceSetting.value, 10) : 15;

    // Check if attendance already exists for this employee on this date
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: targetEmployeeId,
          date,
        },
      },
    });

    const newIn = checkInTime !== undefined ? checkInTime : existing?.checkInTime || null;
    const newOut = checkOutTime !== undefined ? checkOutTime : existing?.checkOutTime || null;

    const { workingMinutes, lateMinutes } = calculateWorkingAndLateMinutes(
      newIn,
      newOut,
      { shiftStartTime, gracePeriodMins }
    );

    let saved;
    if (existing) {
      // If regular employee is trying to overwrite an already finalized entry without permissions
      if (!canManage && existing.checkOutTime) {
        return NextResponse.json(
          { error: "Attendance for today is already completed. Contact your manager for adjustments." },
          { status: 400 }
        );
      }

      saved = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkInTime: newIn,
          checkOutTime: newOut,
          status: status || existing.status,
          workingMinutes,
          lateMinutes,
          isManualCorrection: isManualCorrection ? true : existing.isManualCorrection,
          correctionReason: correctionReason || existing.correctionReason,
          correctedById: isManualCorrection ? session.userId : existing.correctedById,
        },
      });

      await logAuditAction({
        userId: session.userId,
        action: "UPDATE",
        entityName: "Attendance",
        entityId: saved.id,
        details: { date, previous: existing, updated: saved, reason: correctionReason },
        req,
      });
    } else {
      saved = await prisma.attendance.create({
        data: {
          employeeId: targetEmployeeId,
          date,
          checkInTime: newIn,
          checkOutTime: newOut,
          status: status || "Present",
          workingMinutes,
          lateMinutes,
          isManualCorrection: isManualCorrection || false,
          correctionReason: correctionReason || null,
          correctedById: isManualCorrection ? session.userId : null,
        },
      });

      await logAuditAction({
        userId: session.userId,
        action: "CREATE",
        entityName: "Attendance",
        entityId: saved.id,
        details: { date, status: saved.status, checkIn: newIn, checkOut: newOut },
        req,
      });
    }

    return NextResponse.json({ success: true, attendance: saved });
  } catch (error) {
    console.error("POST attendance error:", error);
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }
}
