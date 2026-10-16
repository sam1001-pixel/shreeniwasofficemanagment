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
    const date = searchParams.get("date"); // YYYY-MM-DD
    const month = searchParams.get("month"); // YYYY-MM
    const status = searchParams.get("status"); // Draft, Submitted
    const employeeIdParam = searchParams.get("employeeId");
    const search = searchParams.get("search") || "";

    const canReviewAll = hasPermission(session, "daily_updates:review");
    const whereClause: Record<string, unknown> = {};

    if (!canReviewAll) {
      // Regular employees see only their own reports
      whereClause.submittedById = session.userId;
    } else if (employeeIdParam) {
      const emp = await prisma.employee.findUnique({
        where: { id: employeeIdParam },
        select: { userId: true },
      });
      if (emp?.userId) {
        whereClause.submittedById = emp.userId;
      }
    }

    if (date) {
      whereClause.reportDate = date;
    } else if (month) {
      whereClause.reportDate = { startsWith: month };
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { reportCode: { contains: search } },
        { postOnInsta: { contains: search } },
        { website: { contains: search } },
        { visitPass: { contains: search } },
        { youTubePost: { contains: search } },
        { chara: { contains: search } },
        { visit: { contains: search } },
        { bholeShankarLalBagh: { contains: search } },
        { newProperty: { contains: search } },
        { otherImportantUpdates: { contains: search } },
      ];
    }

    const reports = await prisma.dailyUpdateReport.findMany({
      where: whereClause,
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
            employee: { select: { id: true, employeeCode: true, designation: true, department: true } },
          },
        },
        revisions: {
          orderBy: { revisionNumber: "desc" },
        },
      },
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
    });

    // Summary statistics for today
    const today = new Date().toISOString().split("T")[0];
    const totalActiveEmployees = await prisma.employee.count({ where: { status: "Active" } });
    const submittedTodayCount = await prisma.dailyUpdateReport.count({
      where: { reportDate: today, status: "Submitted" },
    });
    const draftsTodayCount = await prisma.dailyUpdateReport.count({
      where: { reportDate: today, status: "Draft" },
    });

    return NextResponse.json({
      summary: {
        today,
        totalActiveEmployees,
        submittedTodayCount,
        pendingTodayCount: Math.max(0, totalActiveEmployees - submittedTodayCount),
        draftsTodayCount,
      },
      reports,
    });
  } catch (error) {
    console.error("GET daily updates error:", error);
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
      reportDate,
      status, // "Draft" or "Submitted"
      postOnInsta,
      website,
      visitPass,
      youTubePost,
      chara, // Exact field label CHARA preserved
      visit,
      bholeShankarLalBagh,
      newProperty,
      otherImportantUpdates,
    } = body;

    const effectiveDate = reportDate || new Date().toISOString().split("T")[0];
    const targetStatus = status === "Draft" ? "Draft" : "Submitted";

    // Duplicate check: Same submitter and date
    const existing = await prisma.dailyUpdateReport.findUnique({
      where: {
        submittedById_reportDate: {
          submittedById: session.userId,
          reportDate: effectiveDate,
        },
      },
    });

    if (existing) {
      if (existing.status === "Submitted") {
        return NextResponse.json(
          {
            error: `A submitted report already exists for ${effectiveDate} (ID: ${existing.reportCode}). Please use the Edit Report option with a revision reason.`,
            existingReportId: existing.id,
          },
          { status: 409 }
        );
      }
      // If it was a draft, update the draft
      const updatedDraft = await prisma.dailyUpdateReport.update({
        where: { id: existing.id },
        data: {
          status: targetStatus,
          postOnInsta: postOnInsta ?? existing.postOnInsta,
          website: website ?? existing.website,
          visitPass: visitPass ?? existing.visitPass,
          youTubePost: youTubePost ?? existing.youTubePost,
          chara: chara ?? existing.chara,
          visit: visit ?? existing.visit,
          bholeShankarLalBagh: bholeShankarLalBagh ?? existing.bholeShankarLalBagh,
          newProperty: newProperty ?? existing.newProperty,
          otherImportantUpdates: otherImportantUpdates ?? existing.otherImportantUpdates,
          submittedAt: targetStatus === "Submitted" ? new Date() : null,
        },
      });

      await logAuditAction({
        userId: session.userId,
        action: targetStatus === "Submitted" ? "CREATE" : "UPDATE",
        entityName: "DailyUpdateReport",
        entityId: updatedDraft.id,
        details: { reportCode: updatedDraft.reportCode, reportDate: effectiveDate, status: targetStatus },
        req,
      });

      return NextResponse.json({ success: true, report: updatedDraft });
    }

    // Generate unique Report ID: DUR-YYYYMMDD-XXXX
    const dateSlug = effectiveDate.replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reportCode = `DUR-${dateSlug}-${randomSuffix}`;

    const report = await prisma.dailyUpdateReport.create({
      data: {
        reportCode,
        reportDate: effectiveDate,
        submittedById: session.userId,
        status: targetStatus,
        postOnInsta: postOnInsta || "",
        website: website || "",
        visitPass: visitPass || "",
        youTubePost: youTubePost || "",
        chara: chara || "",
        visit: visit || "",
        bholeShankarLalBagh: bholeShankarLalBagh || "",
        newProperty: newProperty || "",
        otherImportantUpdates: otherImportantUpdates || "",
        submittedAt: targetStatus === "Submitted" ? new Date() : null,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "DailyUpdateReport",
      entityId: report.id,
      details: { reportCode, reportDate: effectiveDate, status: targetStatus },
      req,
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error("POST daily update report error:", error);
    return NextResponse.json({ error: "Failed to save daily update report" }, { status: 500 });
  }
}
