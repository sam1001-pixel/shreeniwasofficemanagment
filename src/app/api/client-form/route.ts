import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const date = searchParams.get("date") || "";
    const conductedBy = searchParams.get("conductedBy") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";

    const whereClause: Record<string, unknown> = {};

    if (date) {
      whereClause.visitDate = date;
    }

    if (conductedBy) {
      whereClause.visitConductedBy = conductedBy;
    }

    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
    }

    if (search) {
      whereClause.OR = [
        { clientName: { contains: search } },
        { clientMobile: { contains: search } },
        { propertyOwnerName: { contains: search } },
        { propertyLocation: { contains: search } },
        { submissionCode: { contains: search } },
      ];
    }

    const submissions = await prisma.clientFormSubmission.findMany({
      where: whereClause,
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("GET client form submissions error:", error);
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
    } = body;

    // Validate all 13 mandatory fields
    if (
      !clientName ||
      !clientMobile ||
      !propertyOwnerName ||
      !propertyLocation ||
      !visitDate ||
      !visitTime ||
      !visitConductedBy ||
      !visitCharge ||
      !paymentStatus ||
      !propertyRating ||
      !followUpRemark ||
      !visitNumber ||
      !propertyOwnerMobile
    ) {
      return NextResponse.json(
        { error: "All 13 form fields are mandatory per the client Google Form specifications" },
        { status: 400 }
      );
    }

    // Check for accidental duplicate submission (same client, same location, same visit date, same visit time)
    const existing = await prisma.clientFormSubmission.findFirst({
      where: {
        clientMobile: clientMobile.trim(),
        propertyLocation: propertyLocation.trim(),
        visitDate,
        visitTime,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `Duplicate submission detected: A property visit record for this client and location at ${visitTime} on ${visitDate} already exists (ID: ${existing.submissionCode}).`,
          existingSubmissionCode: existing.submissionCode,
        },
        { status: 409 }
      );
    }

    // Generate unique submission code: SN-VR-YYYYMMDD-XXXX
    const dateSlug = visitDate.replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const submissionCode = `SN-VR-${dateSlug}-${randomSuffix}`;

    const submission = await prisma.clientFormSubmission.create({
      data: {
        submissionCode,
        clientName: clientName.trim(),
        clientMobile: clientMobile.trim(),
        propertyOwnerName: propertyOwnerName.trim(),
        propertyLocation: propertyLocation.trim(),
        visitDate,
        visitTime,
        visitConductedBy: visitConductedBy.trim(),
        visitCharge: visitCharge.trim(),
        paymentStatus: paymentStatus.trim(),
        propertyRating: propertyRating.trim(),
        followUpRemark: followUpRemark.trim(),
        visitNumber: String(visitNumber).trim(),
        propertyOwnerMobile: propertyOwnerMobile.trim(),
        submittedById: session.userId,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "ClientFormSubmission",
      entityId: submission.id,
      details: {
        submissionCode,
        clientName: submission.clientName,
        propertyLocation: submission.propertyLocation,
        visitConductedBy: submission.visitConductedBy,
        visitCharge: submission.visitCharge,
        paymentStatus: submission.paymentStatus,
      },
      req,
    });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error) {
    console.error("POST client form submission error:", error);
    return NextResponse.json({ error: "Failed to submit client property visit record" }, { status: 500 });
  }
}
