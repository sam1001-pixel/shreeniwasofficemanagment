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
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        assignedAgent: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, phone: true },
        },
        siteVisits: {
          include: {
            lead: { select: { id: true, leadCode: true, name: true, phone: true } },
          },
          orderBy: { scheduledDate: "desc" },
        },
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error("GET property error:", error);
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

    if (!hasPermission(session, "properties:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = params;
    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      description,
      propertyType,
      listingType,
      price,
      askingRent,
      address,
      locality,
      city,
      areaSize,
      areaUnit,
      status, // Available, UnderDeal, Sold, Rented, Archived
      assignedAgentId,
    } = body;

    const updated = await prisma.property.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        propertyType: propertyType ?? existing.propertyType,
        listingType: listingType ?? existing.listingType,
        price: price !== undefined ? (price ? parseFloat(price) : null) : existing.price,
        askingRent: askingRent !== undefined ? (askingRent ? parseFloat(askingRent) : null) : existing.askingRent,
        address: address ?? existing.address,
        locality: locality ?? existing.locality,
        city: city ?? existing.city,
        areaSize: areaSize !== undefined ? parseFloat(areaSize) : existing.areaSize,
        areaUnit: areaUnit ?? existing.areaUnit,
        status: status ?? existing.status,
        assignedAgentId: assignedAgentId !== undefined ? assignedAgentId : existing.assignedAgentId,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "UPDATE",
      entityName: "Property",
      entityId: id,
      details: { previous: existing, updated },
      req,
    });

    return NextResponse.json({ success: true, property: updated });
  } catch (error) {
    console.error("PUT property error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "properties:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = params;
    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Soft delete / archive to preserve historical site visits and transactions
    const archived = await prisma.property.update({
      where: { id },
      data: { status: "Archived" },
    });

    await logAuditAction({
      userId: session.userId,
      action: "DELETE",
      entityName: "Property",
      entityId: id,
      details: { note: "Soft archived to preserve visit and transaction history", propertyCode: existing.propertyCode },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Property successfully archived. Historical records preserved.",
      property: archived,
    });
  } catch (error) {
    console.error("DELETE property error:", error);
    return NextResponse.json({ error: "Failed to archive property" }, { status: 500 });
  }
}
