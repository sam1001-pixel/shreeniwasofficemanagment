import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { computeMonthlyAttendanceSummary } from "@/lib/attendanceCalculator";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const employeeIdParam = searchParams.get("employeeId");

    const canManage = hasPermission(session, "attendance:manage");
    let targetEmployeeId = employeeIdParam;

    if (!canManage) {
      if (!session.employeeId) {
        return NextResponse.json({ error: "No employee profile found" }, { status: 403 });
      }
      targetEmployeeId = session.employeeId;
    }

    // Shift configuration from system settings
    const shiftSetting = await prisma.systemSetting.findUnique({ where: { key: "SHIFT_START_TIME" } });
    const graceSetting = await prisma.systemSetting.findUnique({ where: { key: "GRACE_PERIOD_MINS" } });

    const config = {
      shiftStartTime: shiftSetting?.value || "09:30",
      shiftEndTime: "18:30",
      gracePeriodMins: graceSetting ? parseInt(graceSetting.value, 10) : 15,
      halfDayCutoffTime: "13:30",
      weeklyOffDays: [0], // Sunday
    };

    // Find employees to report on
    const employees = await prisma.employee.findMany({
      where: targetEmployeeId
        ? { id: targetEmployeeId }
        : { status: { in: ["Active", "Inactive"] } },
      orderBy: { employeeCode: "asc" },
    });

    const summaries = [];

    for (const emp of employees) {
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { startsWith: month },
        },
      });

      const leaves = await prisma.leaveRequest.findMany({
        where: {
          employeeId: emp.id,
          status: "Approved",
          OR: [
            { startDate: { startsWith: month } },
            { endDate: { startsWith: month } },
          ],
        },
      });

      const summary = computeMonthlyAttendanceSummary(
        emp.id,
        month,
        attendances,
        leaves,
        [], // holidays
        config
      );

      summaries.push({
        employee: {
          id: emp.id,
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          designation: emp.designation,
        },
        summary,
      });
    }

    return NextResponse.json({
      month,
      config,
      count: summaries.length,
      summaries,
    });
  } catch (error) {
    console.error("GET monthly attendance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
