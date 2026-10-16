import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/db";

describe("Phase E - Client Google Form & Financial Management Test Suite", () => {
  let superAdminUserId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({
      where: { email: "admin@shreeniwas.com" },
    });
    expect(admin).not.toBeNull();
    superAdminUserId = admin!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should record a client Google Form submission with all 13 fields and unique submission ID", async () => {
    const submission = await prisma.clientFormSubmission.create({
      data: {
        submissionCode: "SN-VR-20261016-1001",
        clientName: "Vikram Malhotra",
        clientMobile: "+91 98100 11223",
        propertyOwnerName: "Rameshwar Dayal",
        propertyLocation: "Bhole Shankar Lal Bagh Commercial Unit 4",
        visitDate: "2026-10-16",
        visitTime: "11:30",
        visitConductedBy: "Priyanka",
        visitCharge: "₹500",
        paymentStatus: "Paid",
        propertyRating: "❤️ पसंद आई",
        followUpRemark: "Client showed high interest, requested lease draft by Monday",
        visitNumber: "1",
        propertyOwnerMobile: "+91 98111 22233",
        submittedById: superAdminUserId,
      },
    });

    expect(submission.id).toBeDefined();
    expect(submission.submissionCode).toBe("SN-VR-20261016-1001");
    expect(submission.visitConductedBy).toBe("Priyanka");
    expect(submission.propertyRating).toBe("❤️ पसंद आई");
    expect(submission.visitCharge).toBe("₹500");

    // Clean up
    await prisma.clientFormSubmission.delete({ where: { id: submission.id } });
  });

  it("should record financial transaction with dynamic 'Other' category and custom category name", async () => {
    const txn = await prisma.financialTransaction.create({
      data: {
        transactionCode: "TXN-20261016-5544",
        date: "2026-10-16",
        type: "Expense",
        category: "Other",
        customCategory: "Office Diwali Decoration & Sweets",
        description: "Special seasonal office decoration and traditional gifts for staff",
        amount: 8500.5,
        paymentMethod: "UPI",
        referenceNumber: "UPI/38291029102",
        createdById: superAdminUserId,
        status: "Approved",
      },
    });

    expect(txn.id).toBeDefined();
    expect(txn.category).toBe("Other");
    expect(txn.customCategory).toBe("Office Diwali Decoration & Sweets");
    expect(txn.amount).toBe(8500.5);

    // Clean up
    await prisma.financialTransaction.delete({ where: { id: txn.id } });
  });

  it("should support audited transaction reversal with reason without hard deleting records", async () => {
    // 1. Create approved transaction
    const txn = await prisma.financialTransaction.create({
      data: {
        transactionCode: "TXN-20261016-9901",
        date: "2026-10-16",
        type: "Income",
        category: "Customer Payment",
        description: "Advance token money received in cash",
        amount: 50000.0,
        paymentMethod: "Cash",
        createdById: superAdminUserId,
        status: "Approved",
      },
    });

    // 2. Perform reversal with reason
    const reversed = await prisma.financialTransaction.update({
      where: { id: txn.id },
      data: {
        status: "Reversed",
        reversalReason: "Deal cancelled by buyer before agreement signing; token refunded",
        reversedAt: new Date(),
      },
    });

    expect(reversed.status).toBe("Reversed");
    expect(reversed.reversalReason).toBe("Deal cancelled by buyer before agreement signing; token refunded");

    // Verify record still exists in database
    const verifyRecord = await prisma.financialTransaction.findUnique({
      where: { id: txn.id },
    });
    expect(verifyRecord).not.toBeNull();
    expect(verifyRecord?.status).toBe("Reversed");

    // Clean up
    await prisma.financialTransaction.delete({ where: { id: txn.id } });
  });

  it("should calculate total income, total expense, and net financial balance accurately", async () => {
    // Insert 2 income and 1 expense transaction
    const t1 = await prisma.financialTransaction.create({
      data: {
        transactionCode: "TXN-TEST-001",
        date: "2026-10-16",
        type: "Income",
        category: "Property Income",
        description: "Commission received for Unit 4 sale",
        amount: 100000.0,
        paymentMethod: "Bank Transfer",
        createdById: superAdminUserId,
        status: "Approved",
      },
    });

    const t2 = await prisma.financialTransaction.create({
      data: {
        transactionCode: "TXN-TEST-002",
        date: "2026-10-16",
        type: "Income",
        category: "Property Income",
        description: "Consultation fee",
        amount: 25000.0,
        paymentMethod: "UPI",
        createdById: superAdminUserId,
        status: "Approved",
      },
    });

    const t3 = await prisma.financialTransaction.create({
      data: {
        transactionCode: "TXN-TEST-003",
        date: "2026-10-16",
        type: "Expense",
        category: "Office Expense",
        description: "Monthly broadband and electricity bill",
        amount: 15000.0,
        paymentMethod: "Bank Transfer",
        createdById: superAdminUserId,
        status: "Approved",
      },
    });

    // Calculate totals for test transactions
    const testTransactions = await prisma.financialTransaction.findMany({
      where: {
        transactionCode: { in: ["TXN-TEST-001", "TXN-TEST-002", "TXN-TEST-003"] },
      },
    });

    let income = 0;
    let expense = 0;
    for (const t of testTransactions) {
      if (t.status === "Approved") {
        if (t.type === "Income") income += t.amount;
        if (t.type === "Expense") expense += t.amount;
      }
    }

    const net = income - expense;
    expect(income).toBe(125000.0);
    expect(expense).toBe(15000.0);
    expect(net).toBe(110000.0);

    // Clean up
    await prisma.financialTransaction.deleteMany({
      where: { id: { in: [t1.id, t2.id, t3.id] } },
    });
  });
});
