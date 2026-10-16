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
    const lead = await prisma.customerLead.findUnique({
      where: { id },
      include: {
        assignedEmployee: true,
        siteVisits: {
          include: {
            property: true,
          },
          orderBy: { scheduledDate: "desc" },
        },
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("GET lead error:", error);
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
    const existing = await prisma.customerLead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      email,
      source,
      status, // New, Contacted, SiteVisitScheduled, Negotiation, Won, Lost
      preferredType,
      budgetMin,
      budgetMax,
      preferredLocation,
      assignedEmployeeId,
      notes,
    } = body;

    const updated = await prisma.customerLead.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        phone: phone ?? existing.phone,
        email: email ? email.toLowerCase() : existing.email,
        source: source ?? existing.source,
        status: status ?? existing.status,
        preferredType: preferredType !== undefined ? preferredType : existing.preferredType,
        budgetMin: budgetMin !== undefined ? (budgetMin ? parseFloat(budgetMin) : null) : existing.budgetMin,
        budgetMax: budgetMax !== undefined ? (budgetMax ? parseFloat(budgetMax) : null) : existing.budgetMax,
        preferredLocation: preferredLocation !== undefined ? preferredLocation : existing.preferredLocation,
        assignedEmployeeId: assignedEmployeeId !== undefined ? assignedEmployeeId : existing.assignedEmployeeId,
        notes: notes !== undefined ? notes : existing.notes,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "UPDATE",
      entityName: "CustomerLead",
      entityId: id,
      details: {
        leadCode: existing.leadCode,
        previousStatus: existing.status,
        updatedStatus: updated.status,
      },
      req,
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error("PUT lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
