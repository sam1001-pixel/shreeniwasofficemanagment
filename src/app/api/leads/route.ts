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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const assignedEmployeeId = searchParams.get("assignedEmployeeId");

    const canManageAll = hasPermission(session, "leads:manage");
    const whereClause: Record<string, unknown> = {};

    if (!canManageAll) {
      // Agents see their own assigned leads
      if (session.employeeId) {
        whereClause.assignedEmployeeId = session.employeeId;
      }
    } else if (assignedEmployeeId) {
      whereClause.assignedEmployeeId = assignedEmployeeId;
    }

    if (status) whereClause.status = status;
    if (source) whereClause.source = source;

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { leadCode: { contains: search } },
        { preferredLocation: { contains: search } },
      ];
    }

    const leads = await prisma.customerLead.findMany({
      where: whereClause,
      include: {
        assignedEmployee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        siteVisits: {
          include: { property: { select: { id: true, propertyCode: true, title: true } } },
          orderBy: { scheduledDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error("GET leads error:", error);
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
      name,
      phone,
      email,
      source, // Instagram, Website, Referral, WalkIn, Direct
      status, // New, Contacted, SiteVisitScheduled, Negotiation, Won, Lost
      preferredType,
      budgetMin,
      budgetMax,
      preferredLocation,
      assignedEmployeeId,
      notes,
    } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Lead Name and Phone number are required" }, { status: 400 });
    }

    // Generate lead code: LEAD-00X
    const count = await prisma.customerLead.count();
    const leadCode = `LEAD-${String(count + 1).padStart(3, "0")}`;

    const lead = await prisma.customerLead.create({
      data: {
        leadCode,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim().toLowerCase() : null,
        source: source || "Direct",
        status: status || "New",
        preferredType: preferredType || null,
        budgetMin: budgetMin ? parseFloat(budgetMin) : null,
        budgetMax: budgetMax ? parseFloat(budgetMax) : null,
        preferredLocation: preferredLocation ? preferredLocation.trim() : null,
        assignedEmployeeId: assignedEmployeeId || session.employeeId || null,
        notes: notes || null,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "CustomerLead",
      entityId: lead.id,
      details: { leadCode, name: lead.name, source: lead.source, status: lead.status },
      req,
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error("POST lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
