import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest, hasPermission } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const report = await prisma.dailyUpdateReport.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employee: true,
          },
        },
        revisions: {
          orderBy: { revisionNumber: "desc" },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Daily Update Report not found" }, { status: 404 });
    }

    // Permission check: owner or daily_updates:review
    const canReview = hasPermission(session, "daily_updates:review");
    if (report.submittedById !== session.userId && !canReview) {
      return NextResponse.json({ error: "Forbidden: You cannot access this report" }, { status: 403 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("GET daily update by ID error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const existing = await prisma.dailyUpdateReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Daily Update Report not found" }, { status: 404 });
    }

    const canReview = hasPermission(session, "daily_updates:review");
    if (existing.submittedById !== session.userId && !canReview) {
      return NextResponse.json({ error: "Forbidden: You cannot edit this report" }, { status: 403 });
    }

    const body = await req.json();
    const {
      status, // "Draft" or "Submitted"
      postOnInsta,
      website,
      visitPass,
      youTubePost,
      chara,
      visit,
      bholeShankarLalBagh,
      newProperty,
      otherImportantUpdates,
      changeReason,
    } = body;

    // If existing report was already "Submitted", require changeReason
    if (existing.status === "Submitted") {
      if (!changeReason || !changeReason.trim()) {
        return NextResponse.json(
          { error: "A clear reason must be provided when editing a previously submitted daily report." },
          { status: 400 }
        );
      }

      // Snapshot previous version in DailyUpdateRevision
      await prisma.dailyUpdateRevision.create({
        data: {
          reportId: existing.id,
          revisionNumber: existing.revisionNumber,
          modifiedById: session.userId,
          postOnInsta: existing.postOnInsta,
          website: existing.website,
          visitPass: existing.visitPass,
          youTubePost: existing.youTubePost,
          chara: existing.chara,
          visit: existing.visit,
          bholeShankarLalBagh: existing.bholeShankarLalBagh,
          newProperty: existing.newProperty,
          otherImportantUpdates: existing.otherImportantUpdates,
          changeReason: changeReason.trim(),
        },
      });
    }

    const targetStatus = status || existing.status;
    const newRevisionNumber =
      existing.status === "Submitted" ? existing.revisionNumber + 1 : existing.revisionNumber;

    const updated = await prisma.dailyUpdateReport.update({
      where: { id },
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
        revisionNumber: newRevisionNumber,
        submittedAt: targetStatus === "Submitted" && !existing.submittedAt ? new Date() : existing.submittedAt,
      },
      include: {
        revisions: true,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "UPDATE",
      entityName: "DailyUpdateReport",
      entityId: id,
      details: {
        reportCode: existing.reportCode,
        revisionNumber: newRevisionNumber,
        changeReason: changeReason || "Draft updated",
      },
      req,
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("PUT daily update report error:", error);
    return NextResponse.json({ error: "Failed to update daily report" }, { status: 500 });
  }
}
