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
    const submission = await prisma.clientFormSubmission.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("GET client submission error:", error);
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

    if (!hasPermission(session, "client_form:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = params;
    const existing = await prisma.clientFormSubmission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      clientName,
      clientMobile,
      propertyOwnerName,
      propertyLocation,
      visitDate,
      visitTime,
      visitConductedBy,
      visitCharge,
      paymentStatus,
      propertyRating,
      followUpRemark,
      visitNumber,
      propertyOwnerMobile,
      correctionReason,
    } = body;

    const updated = await prisma.clientFormSubmission.update({
      where: { id },
      data: {
        clientName: clientName ?? existing.clientName,
        clientMobile: clientMobile ?? existing.clientMobile,
        propertyOwnerName: propertyOwnerName ?? existing.propertyOwnerName,
        propertyLocation: propertyLocation ?? existing.propertyLocation,
        visitDate: visitDate ?? existing.visitDate,
        visitTime: visitTime ?? existing.visitTime,
        visitConductedBy: visitConductedBy ?? existing.visitConductedBy,
        visitCharge: visitCharge ?? existing.visitCharge,
        paymentStatus: paymentStatus ?? existing.paymentStatus,
        propertyRating: propertyRating ?? existing.propertyRating,
        followUpRemark: followUpRemark ?? existing.followUpRemark,
        visitNumber: visitNumber !== undefined ? String(visitNumber) : existing.visitNumber,
        propertyOwnerMobile: propertyOwnerMobile ?? existing.propertyOwnerMobile,
        revisionCount: existing.revisionCount + 1,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "UPDATE",
      entityName: "ClientFormSubmission",
      entityId: id,
      details: {
        previous: existing,
        updated,
        reason: correctionReason || "Administrative revision",
      },
      req,
    });

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error("PUT client submission error:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}
