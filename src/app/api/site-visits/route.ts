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
    const date = searchParams.get("date");
    const leadId = searchParams.get("leadId");
    const propertyId = searchParams.get("propertyId");

    const whereClause: Record<string, unknown> = {};
    if (date) whereClause.scheduledDate = date;
    if (leadId) whereClause.leadId = leadId;
    if (propertyId) whereClause.propertyId = propertyId;

    const visits = await prisma.siteVisit.findMany({
      where: whereClause,
      include: {
        lead: true,
        property: true,
      },
      orderBy: { scheduledDate: "desc" },
    });

    return NextResponse.json({ visits });
  } catch (error) {
    console.error("GET site visits error:", error);
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
      leadId,
      propertyId,
      agentId,
      scheduledDate,
      scheduledTime,
      visitNumber,
      outcome, // Liked, Considering, Disliked
      feedbackNotes,
    } = body;

    if (!leadId || !propertyId || !scheduledDate) {
      return NextResponse.json(
        { error: "Required fields: leadId, propertyId, scheduledDate" },
        { status: 400 }
      );
    }

    const visit = await prisma.siteVisit.create({
      data: {
        leadId,
        propertyId,
        agentId: agentId || session.employeeId || null,
        scheduledDate,
        scheduledTime: scheduledTime || null,
        visitNumber: visitNumber ? parseInt(visitNumber, 10) : 1,
        outcome: outcome || null,
        feedbackNotes: feedbackNotes || null,
      },
      include: {
        lead: true,
        property: true,
      },
    });

    // Update lead status to SiteVisitScheduled if it was New
    await prisma.customerLead.update({
      where: { id: leadId },
      data: { status: "SiteVisitScheduled" },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "SiteVisit",
      entityId: visit.id,
      details: {
        lead: visit.lead.name,
        property: visit.property.title,
        scheduledDate,
      },
      req,
    });

    return NextResponse.json({ success: true, visit }, { status: 201 });
  } catch (error) {
    console.error("POST site visit error:", error);
    return NextResponse.json({ error: "Failed to schedule site visit" }, { status: 500 });
  }
}
