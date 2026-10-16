import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import {
  generateDailyUpdatesExcel,
  generateMonthlyAttendanceExcel,
  generateFinancialLedgerExcel,
  generateClientVisitsExcel,
} from "@/lib/excelGenerator";
import { computeMonthlyAttendanceSummary } from "@/lib/attendanceCalculator";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "reports:export")) {
      return NextResponse.json({ error: "Forbidden: Export privileges required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // daily-updates, attendance, finance, client-visits
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let buffer: Buffer;
    let fileName = `report-${Date.now()}.xlsx`;

    if (type === "daily-updates") {
      const whereClause: Record<string, unknown> = {};
      if (startDate && endDate) {
        whereClause.reportDate = { gte: startDate, lte: endDate };
      } else if (month) {
        whereClause.reportDate = { startsWith: month };
      }

      const reports = await prisma.dailyUpdateReport.findMany({
        where: whereClause,
        include: {
          submittedBy: { select: { name: true, email: true } },
        },
        orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
      });

      buffer = await generateDailyUpdatesExcel(reports);
      fileName = `Daily_Updates_${month || "export"}.xlsx`;
    } else if (type === "attendance") {
      const shiftSetting = await prisma.systemSetting.findUnique({ where: { key: "SHIFT_START_TIME" } });
      const graceSetting = await prisma.systemSetting.findUnique({ where: { key: "GRACE_PERIOD_MINS" } });

      const config = {
        shiftStartTime: shiftSetting?.value || "09:30",
        shiftEndTime: "18:30",
        gracePeriodMins: graceSetting ? parseInt(graceSetting.value, 10) : 15,
        halfDayCutoffTime: "13:30",
        weeklyOffDays: [0],
      };

      const employees = await prisma.employee.findMany({
        where: { status: { in: ["Active", "Inactive"] } },
        orderBy: { employeeCode: "asc" },
      });

      const summaries = [];
      for (const emp of employees) {
        const attendances = await prisma.attendance.findMany({
          where: { employeeId: emp.id, date: { startsWith: month } },
        });
        const leaves = await prisma.leaveRequest.findMany({
          where: { employeeId: emp.id, status: "Approved", startDate: { startsWith: month } },
        });
        const summary = computeMonthlyAttendanceSummary(emp.id, month, attendances, leaves, [], config);
        summaries.push({
          employee: {
            employeeCode: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
            department: emp.department,
            designation: emp.designation,
          },
          summary,
        });
      }

      buffer = await generateMonthlyAttendanceExcel(summaries, month);
      fileName = `Monthly_Attendance_${month}.xlsx`;
    } else if (type === "finance") {
      const whereClause: Record<string, unknown> = {};
      if (startDate && endDate) {
        whereClause.date = { gte: startDate, lte: endDate };
      } else if (month) {
        whereClause.date = { startsWith: month };
      }

      const transactions = await prisma.financialTransaction.findMany({
        where: whereClause,
        include: {
          createdBy: { select: { name: true } },
          relatedProperty: { select: { title: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      });

      buffer = await generateFinancialLedgerExcel(transactions);
      fileName = `Financial_Ledger_${month || "export"}.xlsx`;
    } else if (type === "client-visits") {
      const whereClause: Record<string, unknown> = {};
      if (month) whereClause.visitDate = { startsWith: month };

      const submissions = await prisma.clientFormSubmission.findMany({
        where: whereClause,
        orderBy: { visitDate: "desc" },
      });

      buffer = await generateClientVisitsExcel(submissions);
      fileName = `Client_Visits_${month || "export"}.xlsx`;
    } else {
      return NextResponse.json(
        { error: "Invalid report type specified. Supported: daily-updates, attendance, finance, client-visits" },
        { status: 400 }
      );
    }

    await logAuditAction({
      userId: session.userId,
      action: "EXPORT",
      entityName: "ExcelReport",
      details: { type, fileName, month, startDate, endDate },
      req,
    });

    // Record in ExcelReportJob
    await prisma.excelReportJob.create({
      data: {
        reportType: type.toUpperCase().replace(/-/g, "_"),
        dateRangeStart: startDate || month || "ALL",
        dateRangeEnd: endDate || month || "ALL",
        fileName,
        filePath: "memory_buffer",
        generatedById: session.userId,
        status: "Completed",
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("GET export report error:", error);
    return NextResponse.json({ error: "Failed to generate Excel report" }, { status: 500 });
  }
}
