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
    const type = searchParams.get("type") || "";
    const listingType = searchParams.get("listingType") || "";
    const status = searchParams.get("status") || "";
    const locality = searchParams.get("locality") || "";

    const whereClause: Record<string, unknown> = {};

    if (type) whereClause.propertyType = type;
    if (listingType) whereClause.listingType = listingType;
    if (status) whereClause.status = status;
    if (locality) whereClause.locality = locality;

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { propertyCode: { contains: search } },
        { address: { contains: search } },
        { locality: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const properties = await prisma.property.findMany({
      where: whereClause,
      include: {
        owner: { select: { id: true, name: true, phone: true, email: true } },
        assignedAgent: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        _count: { select: { siteVisits: true, transactions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("GET properties error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "properties:manage")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      propertyType, // Apartment, Villa, Plot, Commercial, Office
      listingType, // Sale, Rent, Lease
      price,
      askingRent,
      address,
      locality,
      city,
      areaSize,
      areaUnit, // SqFt, SqYd, Gaj, Acre
      assignedAgentId,
      ownerName,
      ownerPhone,
      ownerEmail,
      ownerAddress,
    } = body;

    if (!title || !propertyType || !listingType || !address || !locality || !areaSize) {
      return NextResponse.json(
        { error: "Required fields: Title, Property Type, Listing Type, Address, Locality, Area Size" },
        { status: 400 }
      );
    }

    // Handle owner creation or linking
    let ownerId: string | null = null;
    if (ownerName && ownerPhone) {
      let owner = await prisma.propertyOwner.findFirst({
        where: { phone: ownerPhone.trim() },
      });
      if (!owner) {
        owner = await prisma.propertyOwner.create({
          data: {
            name: ownerName.trim(),
            phone: ownerPhone.trim(),
            email: ownerEmail ? ownerEmail.trim().toLowerCase() : null,
            address: ownerAddress || null,
          },
        });
      }
      ownerId = owner.id;
    }

    // Generate property code: PROP-00X
    const count = await prisma.property.count();
    const propertyCode = `PROP-${String(count + 1).padStart(3, "0")}`;

    const property = await prisma.property.create({
      data: {
        propertyCode,
        title: title.trim(),
        description: description || null,
        propertyType,
        listingType,
        price: price ? parseFloat(price) : null,
        askingRent: askingRent ? parseFloat(askingRent) : null,
        address: address.trim(),
        locality: locality.trim(),
        city: city || "New Delhi",
        areaSize: parseFloat(areaSize),
        areaUnit: areaUnit || "SqFt",
        status: "Available",
        assignedAgentId: assignedAgentId || null,
        ownerId,
      },
    });

    await logAuditAction({
      userId: session.userId,
      action: "CREATE",
      entityName: "Property",
      entityId: property.id,
      details: { propertyCode, title: property.title, locality: property.locality },
      req,
    });

    return NextResponse.json({ success: true, property }, { status: 201 });
  } catch (error) {
    console.error("POST property error:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
