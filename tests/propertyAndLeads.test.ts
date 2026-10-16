import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";

describe("Phase G - Property, Customer Leads & Site Visits CRM Test Suite", () => {
  let agentEmployeeId: string;
  let superAdminUserId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({
      where: { email: "admin@shreeniwas.com" },
    });
    expect(admin).not.toBeNull();
    superAdminUserId = admin!.id;

    const emp = await prisma.employee.findFirst({
      where: { employeeCode: "EMP-001" }, // Priyanka
    });
    expect(emp).not.toBeNull();
    agentEmployeeId = emp!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a property with owner details, location, and assigned agent", async () => {
    const owner = await prisma.propertyOwner.create({
      data: {
        name: "Harish Chandra",
        phone: "+91 98222 33445",
        email: "harish@chandra.com",
        address: "Green Park Extension, New Delhi",
      },
    });

    const property = await prisma.property.create({
      data: {
        propertyCode: "PROP-TEST-001",
        title: "Luxury 3BHK Apartment at Green Park",
        description: "Fully furnished 3BHK with lift and reserved stilt parking",
        propertyType: "Apartment",
        listingType: "Sale",
        price: 28500000.0,
        address: "D-14, Second Floor, Green Park Extension",
        locality: "Green Park",
        city: "New Delhi",
        areaSize: 1850.0,
        areaUnit: "SqFt",
        status: "Available",
        assignedAgentId: agentEmployeeId,
        ownerId: owner.id,
      },
      include: {
        owner: true,
        assignedAgent: true,
      },
    });

    expect(property.id).toBeDefined();
    expect(property.propertyCode).toBe("PROP-TEST-001");
    expect(property.owner?.name).toBe("Harish Chandra");
    expect(property.assignedAgent?.employeeCode).toBe("EMP-001");
    expect(property.price).toBe(28500000.0);

    // Clean up
    await prisma.property.delete({ where: { id: property.id } });
    await prisma.propertyOwner.delete({ where: { id: owner.id } });
  });

  it("should soft-archive a property without deleting historical records", async () => {
    const property = await prisma.property.create({
      data: {
        propertyCode: "PROP-ARCHIVE-TEST",
        title: "Plot in Lal Bagh Sector 1",
        propertyType: "Plot",
        listingType: "Sale",
        price: 5500000.0,
        address: "Plot 44, Sector 1, Lal Bagh",
        locality: "Lal Bagh",
        city: "New Delhi",
        areaSize: 200.0,
        areaUnit: "SqYd",
        status: "Available",
      },
    });

    // Soft-archive
    const archived = await prisma.property.update({
      where: { id: property.id },
      data: { status: "Archived" },
    });

    expect(archived.status).toBe("Archived");

    // Verify it still exists in the database
    const fetched = await prisma.property.findUnique({
      where: { id: property.id },
    });
    expect(fetched).not.toBeNull();
    expect(fetched?.status).toBe("Archived");

    // Clean up
    await prisma.property.delete({ where: { id: property.id } });
  });

  it("should track customer leads and progress pipeline from New through Site Visit to Won", async () => {
    // 1. Create Property
    const property = await prisma.property.create({
      data: {
        propertyCode: "PROP-LEAD-TEST",
        title: "Commercial Shop Unit 12",
        propertyType: "Commercial",
        listingType: "Sale",
        price: 3200000.0,
        address: "Lal Bagh Main Market",
        locality: "Lal Bagh",
        city: "New Delhi",
        areaSize: 450.0,
        areaUnit: "SqFt",
        status: "Available",
      },
    });

    // 2. Create Lead
    const lead = await prisma.customerLead.create({
      data: {
        leadCode: "LEAD-TEST-001",
        name: "Ananya Gupta",
        phone: "+91 99988 77766",
        email: "ananya.gupta@outlook.com",
        source: "Instagram",
        status: "New",
        preferredType: "Commercial",
        budgetMin: 2500000.0,
        budgetMax: 3500000.0,
        preferredLocation: "Lal Bagh",
        assignedEmployeeId: agentEmployeeId,
      },
    });

    expect(lead.id).toBeDefined();
    expect(lead.status).toBe("New");
    expect(lead.source).toBe("Instagram");

    // 3. Schedule Site Visit
    const visit = await prisma.siteVisit.create({
      data: {
        leadId: lead.id,
        propertyId: property.id,
        agentId: agentEmployeeId,
        scheduledDate: "2026-10-18",
        scheduledTime: "15:00",
        visitNumber: 1,
        outcome: "Liked",
        feedbackNotes: "Client liked the corner location and footfall. Made token offer.",
      },
    });

    expect(visit.id).toBeDefined();
    expect(visit.outcome).toBe("Liked");

    // 4. Update Lead to Won
    const wonLead = await prisma.customerLead.update({
      where: { id: lead.id },
      data: { status: "Won", notes: "Deal closed at ₹31 Lakhs" },
    });

    expect(wonLead.status).toBe("Won");

    // Clean up
    await prisma.siteVisit.delete({ where: { id: visit.id } });
    await prisma.customerLead.delete({ where: { id: lead.id } });
    await prisma.property.delete({ where: { id: property.id } });
  });
});
